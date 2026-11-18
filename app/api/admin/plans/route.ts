import { NextRequest, NextResponse } from 'next/server';
import { adminDatabase, authorizedAdmin, sameOrigin } from '@/lib/admin-users';

export const dynamic = 'force-dynamic';
const ALLOWED = ['plus', 'pro', 'plus_existing', 'pro_existing', 'pro_founder'] as const;
const noStore = { 'Cache-Control': 'private, no-store' };
function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: noStore }); }
function dbFor(req: NextRequest) {
  if (!authorizedAdmin(req)) return { error: json({ error: 'No autorizado' }, 401) };
  const db = adminDatabase();
  if (!db) return { error: json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY' }, 503) };
  return { db };
}

export async function GET(req: NextRequest) {
  const ctx = dbFor(req);
  if (ctx.error) return ctx.error;
  const db = ctx.db!;
  try {
    const [catalog, flags, profiles, devices] = await Promise.all([
      db.from('tp_subscription_price_catalog').select('*').order('slug'),
      db.from('tp_subscription_runtime').select('billing_enabled,restrictions_enabled').eq('id', 1).single(),
      db.from('profiles').select('id,display_name,name,created_at').order('created_at', { ascending: true }).limit(5000),
      db.from('app_user_devices').select('user_id,last_seen_at').limit(5000),
    ]);
    for (const response of [catalog, flags, profiles, devices]) if (response.error) throw response.error;
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0,10);
    const shifts: Array<{user_id:string;fecha_inicio:string|null}> = [];
    for (let i=0; i<10; i++) {
      const result = await db.from('jornadas').select('user_id,fecha_inicio')
        .order('created_at', { ascending: false }).range(i*1000,(i+1)*1000-1);
      if (result.error) throw result.error;
      shifts.push(...(result.data||[]));
      if ((result.data||[]).length < 1000) break;
    }
    const workdays = new Map<string,Set<string>>();
    for (const shift of shifts) {
      const date = shift.fecha_inicio;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < cutoff || date > new Date().toISOString().slice(0,10)) continue;
      const set = workdays.get(shift.user_id) || new Set<string>();
      set.add(date);workdays.set(shift.user_id,set);
    }
    const seen = new Map<string,string>();
    for(const d of devices.data || []) if(d.last_seen_at && (!seen.has(d.user_id)||d.last_seen_at > seen.get(d.user_id)!)) seen.set(d.user_id,d.last_seen_at);
    const users = (profiles.data || []).map(p=>({
      id:p.id, name:(p.display_name||p.name||'Usuario').trim(), joinedAt:p.created_at,
      recordedDays30:workdays.get(p.id)?.size||0,
      lastSeenAt:seen.get(p.id)||null,
      eligibility:'pending_review' as const,
      reason:'Faltan datos independientes de días realmente trabajados para comprobar el 70 %.',
    }));
    return json({ plans:catalog.data, control:flags.data, users, summary:{
      registered:users.length, recording30:users.filter(u=>u.recordedDays30>0).length,
      eligibleVerified:0, eligiblePending:users.length,
    } });
  } catch(e) {
    console.error('admin plans fetch',e);
    return json({error:'No se pudo consultar el catálogo y los usuarios'},500);
  }
}

export async function PATCH(req: NextRequest) {
  if (!sameOrigin(req)) return json({error:'Origen no autorizado'},403);
  const ctx=dbFor(req);
  if(ctx.error)return ctx.error;
  let body:unknown;
  try{body=await req.json();}catch{return json({error:'Formato inválido'},400);}
  if(!body || typeof body!=='object')return json({error:'Datos inválidos'},400);
  const {slug,monthly_cents,annual_cents} = body as Record<string,unknown>;
  if(typeof slug!=='string'||!ALLOWED.includes(slug as typeof ALLOWED[number]))
    return json({error:'Plan inválido'},400);
  const validPrice=(x:unknown,max:number)=>typeof x==='number'&&Number.isInteger(x)&&x>=0&&x<=max;
  if(!validPrice(monthly_cents,100000)||!(annual_cents===null||validPrice(annual_cents,1200000)))
    return json({error:'Precios inválidos: deben ser céntimos enteros, sin importes negativos'},400);
  const db=ctx.db!;
  const {data,error}=await db.from('tp_subscription_price_catalog')
    .update({monthly_cents,annual_cents,updated_at:new Date().toISOString()})
    .eq('slug',slug).select('*').single();
  if(error){console.error('admin plans update',error);return json({error:'No se pudo guardar el precio'},500);}
  return json({ok:true,plan:data,billingActivated:false});
}
