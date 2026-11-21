import {NextRequest,NextResponse} from 'next/server';
import {adminDatabase,authorizedAdmin,sameOrigin} from '@/lib/admin-users';
export const dynamic='force-dynamic';
const out=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private,no-store'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function database(req:NextRequest){
 if(!authorizedAdmin(req))return {error:out({error:'Acceso exclusivo de administración'},401)};
 const db=adminDatabase();
 if(!db)return {error:out({error:'Base de datos no configurada'},503)};
 return {db};
}
export async function GET(req:NextRequest){
 const ctx=database(req);if(ctx.error)return ctx.error;
 const db=ctx.db!;
 try{
  const [runtime,profiles,subscriptions,grants,trialOverrides]=await Promise.all([
   db.from('tp_subscription_runtime').select('billing_enabled,restrictions_enabled').eq('id',1).single(),
   db.from('profiles').select('id,name,display_name,created_at').order('created_at',{ascending:false}).limit(1500),
   db.from('tp_driver_subscriptions').select('user_id,price_slug,status,trial_ends_at,current_period_end,updated_at').limit(1500),
   db.from('tp_subscription_grants').select('user_id,plan,enabled,reason,updated_at').limit(1500),
   db.from('tp_driver_trial_overrides').select('user_id,trial_mode,reason').limit(1500),
  ]);
  for(const r of [runtime,profiles,subscriptions,grants,trialOverrides])if(r.error)throw r.error;
  const emails=new Map<string,string>();
  for(let page=1;page<=10;page++){
   const {data,error}=await db.auth.admin.listUsers({page,perPage:200});
   if(error)throw error;
   for(const u of data.users)emails.set(u.id,u.email||'');
   if(data.users.length<200)break;
  }
  const sub=new Map((subscriptions.data||[]).map(s=>[s.user_id,s]));
  const grant=new Map((grants.data||[]).map(s=>[s.user_id,s]));
  const trialMap=new Map((trialOverrides.data||[]).map(t=>[t.user_id,t]));
  // Aggregate distinct registered working days server-side; no private routes or locations exposed.
  const activity=new Map<string,{first:string|null;last:string|null;count:number;last30:number}>();
  const unique=new Map<string,Set<string>>();
  for(let offset=0;offset<10000;offset+=1000){
   const {data:shifts,error:shiftError}=await db.from('jornadas').select('user_id,fecha_inicio').order('created_at',{ascending:false}).range(offset,offset+999);
   if(shiftError)throw shiftError;
   for(const s of shifts||[])if(/^20\\d\\d-\\d\\d-\\d\\d$/.test(s.fecha_inicio||'')){
    const set=unique.get(s.user_id)||new Set<string>();set.add(s.fecha_inicio);unique.set(s.user_id,set);
   }
   if((shifts||[]).length<1000)break;
  }
  const cutoff=new Date(Date.now()-29*86400000).toISOString().slice(0,10);
  for(const [uid,dates] of Array.from(unique.entries())){
   const sorted=Array.from(dates).sort();activity.set(uid,{first:sorted[0]||null,last:sorted[sorted.length-1]||null,count:dates.size,last30:sorted.filter(d=>d>=cutoff).length});
  }
  const users=(profiles.data||[]).map(p=>({
   id:p.id,name:p.display_name||p.name||'Conductor',email:emails.get(p.id)||'',
   created_at:p.created_at,subscription:sub.get(p.id)||null,grant:grant.get(p.id)||null,
   trial_override:trialMap.get(p.id)?.trial_mode||'automatic',
   activity_first:activity.get(p.id)?.first||null,
   activity_last:activity.get(p.id)?.last||null,
   activity_days:activity.get(p.id)?.count||0,
   activity_days30:activity.get(p.id)?.last30||0,
   trial_expired_by_usage:Boolean(activity.get(p.id)?.first&&activity.get(p.id)?.last&&
    (Date.parse(activity.get(p.id)!.last!)-Date.parse(activity.get(p.id)!.first!))/86400000>=30&&activity.get(p.id)!.count>=2),
  }));
  return out({control:runtime.data,users,summary:{
   total:users.length,
   subscribed:users.filter(u=>['active','trialing'].includes(u.subscription?.status||'')).length,
   complimentary:users.filter(u=>u.grant?.enabled===true).length,
  }});
 }catch(err){console.error('subscriber admin GET',err);return out({error:'No se pudieron cargar los suscriptores'},500);}
}
export async function PATCH(req:NextRequest){
 if(!sameOrigin(req))return out({error:'Origen no autorizado'},403);
 const ctx=database(req);if(ctx.error)return ctx.error;
 const db=ctx.db!;
 let body:any;try{body=await req.json();}catch{return out({error:'Datos inválidos'},400);}
 if(body?.action==='trial_override'){
  if(typeof body.user_id!=='string'||!uuid.test(body.user_id)||!['automatic','disabled','allowed'].includes(body.trial_mode))
   return out({error:'Usuario o modalidad inválidos'},400);
  const {data:auth,error:authError}=await db.auth.admin.getUserById(body.user_id);
  if(authError||!auth.user)return out({error:'El conductor no existe'},404);
  const {data,error}=await db.from('tp_driver_trial_overrides').upsert({
   user_id:body.user_id,trial_mode:body.trial_mode,reason:'Configurado por administración',
   updated_at:new Date().toISOString()
  },{onConflict:'user_id'}).select('user_id,trial_mode').single();
  if(error)return out({error:'No se pudo guardar la política de prueba'},500);
  return out({ok:true,trial_override:data});
 }
 if(body?.action==='restrictions'){
  if(typeof body.enabled!=='boolean')return out({error:'Estado inválido'},400);
  if(body.enabled && body.confirmed!==true)return out({error:'Confirma expresamente antes de restringir funciones'},400);
  const {data,error}=await db.from('tp_subscription_runtime')
   .update({restrictions_enabled:body.enabled,updated_at:new Date().toISOString()})
   .eq('id',1).select('billing_enabled,restrictions_enabled').single();
  if(error)return out({error:'No se pudo cambiar el modo gratuito'},500);
  return out({ok:true,control:data});
 }
 if(body?.action!=='grant'||typeof body.user_id!=='string'||!uuid.test(body.user_id)||
    !['plus','pro'].includes(body.plan)||typeof body.enabled!=='boolean')
  return out({error:'Solicitud inválida'},400);
 const {data:auth,error:authError}=await db.auth.admin.getUserById(body.user_id);
 if(authError||!auth.user)return out({error:'El usuario no existe'},404);
 const reason=typeof body.reason==='string'?body.reason.slice(0,150):'Acceso gratuito concedido por administración';
 const {data,error}=await db.from('tp_subscription_grants').upsert({
  user_id:body.user_id,plan:body.plan,enabled:body.enabled,reason,
  granted_by:'admin',updated_at:new Date().toISOString()
 },{onConflict:'user_id'}).select('user_id,plan,enabled,reason,updated_at').single();
 if(error){console.error('grant save',error);return out({error:'No se pudo guardar el acceso gratuito'},500);}
 // Grants only change entitlements: paid Stripe subscriptions remain active and must be canceled separately.
 return out({ok:true,grant:data,warning:'Este cambio no cancela suscripciones ni cargos en Stripe.'});
}
