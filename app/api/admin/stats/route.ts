import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_COOKIE_NAME, getAdminPassword, verifyAdminToken } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
const DAY = 86_400_000;

export async function GET(req: NextRequest) {
  const password = getAdminPassword();
  const secret = process.env.TACOPLAN_ADMIN_COOKIE_SECRET?.trim() || password;
  if (!password || !secret || !verifyAdminToken(secret, req.cookies.get(ADMIN_COOKIE_NAME)?.value, 30 * DAY)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  const url = 'https://dutgxjwfjtqxmqonnjlp.supabase.co';
  if (!serviceKey) return NextResponse.json({ error: 'Falta configurar Supabase en el servidor' }, { status: 503 });

  try {
    const db = createClient(url, serviceKey, { auth: { persistSession: false } });
    const now = Date.now();
    const since7 = new Date(now - 7 * DAY).toISOString();
    const since30 = new Date(now - 30 * DAY).toISOString();
    // Only aggregated data are returned. No addresses, names, tokens or personal records.
    const [profiles, recentJornadas, jornadasTotal, totalDrivers, devices, pushes, recentCount] = await Promise.all([
      db.from('profiles').select('id,created_at,onboarding_completed,base_name,base_city,payroll_config').order('created_at', {ascending:false}).limit(5000),
      db.from('jornadas').select('user_id,created_at').gte('created_at',since30).order('created_at',{ascending:false}).limit(5000),
      db.from('jornadas').select('*',{count:'exact',head:true}),
      db.from('jornadas').select('user_id').limit(5000),
      db.from('app_user_devices').select('user_id,last_seen_at').gte('last_seen_at',since30).limit(5000),
      db.from('push_tokens').select('user_id').eq('notifications_enabled',true).like('expo_push_token','ExponentPushToken[%').limit(5000),
      db.from('profiles').select('*',{count:'exact',head:true}),
    ]);
    const errors = [profiles,recentJornadas,jornadasTotal,totalDrivers,devices,pushes,recentCount].map(v=>v.error).filter(Boolean);
    if (errors.length) throw new Error(errors[0]?.message || 'Error consultando estadísticas');
    const people = profiles.data || [];
    const jornadas = recentJornadas.data || [];
    const visits = devices.data || [];
    const pushPeople = new Set((pushes.data || []).map(p=>p.user_id));
    const active = (days:number)=>new Set(visits.filter(v=>v.last_seen_at && new Date(v.last_seen_at).getTime()>=now-days*DAY).map(v=>v.user_id)).size;
    const recentRecords = (days:number)=>jornadas.filter(j=>new Date(j.created_at).getTime()>=now-days*DAY);
    const newUsers = (days:number)=>people.filter(p=>new Date(p.created_at).getTime()>=now-days*DAY).length;
    const daily = Array.from({length:14},(_,i)=>{
      const date = new Date(now-(13-i)*DAY).toISOString().slice(0,10);
      return { date, registrations: people.filter(p=>p.created_at?.slice(0,10)===date).length, jornadas: jornadas.filter(j=>j.created_at?.slice(0,10)===date).length };
    });
    const last7 = recentRecords(7);
    return NextResponse.json({
      updatedAt:new Date().toISOString(),
      registered:recentCount.count || 0,
      new24h:newUsers(1),new7d:newUsers(7),new30d:newUsers(30),
      active24h:active(1),active7d:active(7),active30d:active(30),
      jornadas:jornadasTotal.count || 0,
      recorders:new Set((totalDrivers.data||[]).map(j=>j.user_id)).size,
      records7d:last7.length,records30d:jornadas.length,
      recorders7d:new Set(last7.map(j=>j.user_id)).size,
      onboarded:people.filter(p=>p.onboarding_completed===true).length,
      configuredBase:people.filter(p=>Boolean(p.base_name || p.base_city)).length,
      payroll:people.filter(p=>p.payroll_config && typeof p.payroll_config==='object' && Object.keys(p.payroll_config).length>0).length,
      pushUsers:pushPeople.size,
      daily
    }, {headers:{'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});
  } catch(e:unknown) {
    console.error('Admin analytics error',e);
    return NextResponse.json({error:'No se han podido cargar las estadísticas'}, {status:500});
  }
}
