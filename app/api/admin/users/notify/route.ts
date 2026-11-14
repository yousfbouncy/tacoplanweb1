import { NextRequest, NextResponse } from 'next/server';
import { adminDatabase, authorizedAdmin, sameOrigin, classifyInactivity, reminderMessage, ADMIN_REMINDER_SOURCE } from '@/lib/admin-users';

export const dynamic = 'force-dynamic';
const WEEK = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  if (!authorizedAdmin(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Origen no autorizado' }, { status: 403 });

  const db = adminDatabase();
  if (!db) return NextResponse.json({ error: 'Falta configurar Supabase en el servidor' }, { status: 503 });

  let userId = '';
  try {
    const input = await request.json();
    if (typeof input.userId === 'string') userId = input.userId;
  } catch {
    return NextResponse.json({ error: 'Solicitud incorrecta' }, { status: 400 });
  }
  if (!/^[a-f0-9-]{36}$/i.test(userId)) return NextResponse.json({ error: 'Usuario inválido' }, { status: 400 });

  try {
    const profileResult = await db.from('profiles')
      .select('id,created_at,notifications_enabled,push_reminders_enabled,last_inactivity_notification_sent_at')
      .eq('id', userId).maybeSingle();
    if (profileResult.error) throw profileResult.error;
    if (!profileResult.data) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const profile = profileResult.data;
    if (profile.notifications_enabled === false || profile.push_reminders_enabled === false) {
      return NextResponse.json({ error: 'El conductor ha desactivado estos recordatorios' }, { status: 409 });
    }

    const countResult = await db.from('jornadas').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    if (countResult.error) throw countResult.error;
    const lastResult = await db.from('jornadas').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1);
    if (lastResult.error) throw lastResult.error;
    const status = classifyInactivity(countResult.count || 0, profile.created_at, lastResult.data?.[0]?.created_at || null);

    if (status !== 'zero_jornadas' && status !== 'stopped_registering') {
      return NextResponse.json({ error: 'El conductor ya no cumple los criterios. Actualiza el listado.' }, { status: 409 });
    }

    const previous = await db.from('admin_notification_logs').select('created_at')
      .eq('source', ADMIN_REMINDER_SOURCE).eq('target_user_id', userId)
      .order('created_at', { ascending: false }).limit(1);
    if (previous.error) throw previous.error;

    const lastSent = [profile.last_inactivity_notification_sent_at, previous.data?.[0]?.created_at]
      .filter((value): value is string => typeof value === 'string').sort().reverse()[0];

    if (lastSent && Date.now() - new Date(lastSent).getTime() < WEEK) {
      return NextResponse.json({ error: 'Este usuario recibió un recordatorio en los últimos siete días' }, { status: 429 });
    }

    const message = reminderMessage(status);
    const devices = await db.from('push_tokens').select('expo_push_token')
      .eq('user_id', userId).eq('notifications_enabled', true);
    if (devices.error) throw devices.error;
    const tokens = Array.from(new Set((devices.data || [])
      .map((item) => item.expo_push_token)
      .filter((token) => typeof token === 'string' && /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token))));

    const logResult = await db.from('admin_notification_logs').insert({
      source: ADMIN_REMINDER_SOURCE, source_id: status,
      title: message.title, body: message.body, type: 'reminder',
      target_type: 'user', target_user_id: userId,
      send_push: tokens.length > 0, create_internal_notification: true,
      users_targeted: 1, tokens_found: tokens.length, status: 'pending',
      data: { reason: status }
    }).select('id').single();
    if (logResult.error) throw logResult.error;

    const logId = logResult.data.id;
    const inbox = await db.from('user_notifications').insert({
      user_id: userId, type: 'reminder', title: message.title, body: message.body,
      data: { source: ADMIN_REMINDER_SOURCE, reason: status, log_id: logId }
    });
    const internalCreated = inbox.error ? 0 : 1;
    let pushAccepted = 0;
    let pushFailed = 0;

    if (tokens.length > 0) {
      try {
        const result = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(tokens.map((to) => ({
            to, title: message.title, body: message.body, sound: 'default',
            data: { type: 'reminder', source: ADMIN_REMINDER_SOURCE }
          })))
        });
        if (!result.ok) throw new Error('Expo rejected the request');
        const payload = await result.json();
        const tickets = Array.isArray(payload.data) ? payload.data : [];
        pushAccepted = tickets.filter((ticket: { status?: string }) => ticket.status === 'ok').length;
        pushFailed = tokens.length - pushAccepted;
      } catch (error) {
        console.error('Push reminder failed', error);
        pushFailed = tokens.length;
      }
    }

    const resultStatus = internalCreated && pushFailed === 0 ? 'success' :
      internalCreated || pushAccepted ? 'partial' : 'failed';

    await db.from('admin_notification_logs').update({
      internal_created: internalCreated, push_ok: pushAccepted,
      push_failed: pushFailed, status: resultStatus
    }).eq('id', logId);

    return NextResponse.json({
      ok: resultStatus !== 'failed', internalCreated, pushAccepted, pushFailed,
      message: pushAccepted > 0 ? 'Push aceptada por Expo y aviso guardado' :
        internalCreated > 0 ? 'Aviso guardado en la aplicación, sin confirmación de push' :
          'No se pudo crear el aviso'
    }, { status: resultStatus === 'failed' ? 502 : 200 });

  } catch (error) {
    console.error('Inactivity reminder failed', error);
    return NextResponse.json({ error: 'No se pudo enviar el recordatorio. Revisa los registros del servidor.' }, { status: 500 });
  }
}
