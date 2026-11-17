import {NextRequest} from 'next/server';
import {membership,enterpriseJson,originAllowed,uuid,audit} from '@/lib/tp-enterprise';

export const dynamic='force-dynamic';
async function driverContext(req:NextRequest){
 const auth=await membership(req);
 if(!auth?.member||auth.member.role!=='driver')return {error:enterpriseJson({error:'Solo conductores vinculados pueden responder'},403)};
 return auth;
}
const activeJornada=async(db:any,id:string)=>{
 const r=await db.from('jornadas').select('fecha_inicio,hora_inicio,fecha_fin,hora_fin,created_at').eq('user_id',id).order('created_at',{ascending:false}).limit(1).maybeSingle();
 if(r.error)throw r.error;
 const j=r.data;
 if(!j||j.fecha_fin&&j.hora_fin)return false;
 // Do not allow a very old unclosed shift to authorize indefinite tracking.
 const started=j.fecha_inicio&&j.hora_inicio?Date.parse(j.fecha_inicio+'T'+j.hora_inicio):Date.parse(j?.created_at||'');
 return Number.isFinite(started)&&started<=Date.now()+120000&&Date.now()-started<36*3600000;
};
export async function GET(req:NextRequest){
 try{
  const ctx=await driverContext(req);if('error'in ctx)return ctx.error;
  const {db,user,member}=ctx;
  const consent=await db.from('tp_location_consents').select('enabled').eq('company_id',member.company_id).eq('driver_id',user.id).maybeSingle();
  if(consent.error)throw consent.error;
  const enabled=consent.data?.enabled===true;
  if(!enabled)return enterpriseJson({enabled:false,request:null});
  if(!await activeJornada(db,user.id))return enterpriseJson({enabled:true,activeDuty:false,request:null});
  const r=await db.from('tp_location_requests').select('id,expires_at,requested_at').eq('company_id',member.company_id).eq('driver_id',user.id).eq('status','pending').gt('expires_at',new Date().toISOString()).order('requested_at',{ascending:false}).limit(1).maybeSingle();
  if(r.error)throw r.error;
  return enterpriseJson({enabled:true,activeDuty:true,request:r.data||null});
 }catch(e){return enterpriseJson({error:e instanceof Error?e.message:'No se pudo consultar la solicitud'},500);}
}
export async function POST(req:NextRequest){
 // Mobile clients send a bearer token, and typically no Origin.
 // Browser requests with an Origin must pass same-origin protection.
 if(req.headers.get('origin')&&!originAllowed(req))return enterpriseJson({error:'Origen no permitido'},403);
 try{
  const ctx=await driverContext(req);if('error'in ctx)return ctx.error;
  const {db,user,member}=ctx,body=await req.json();
  if(body?.action==='consent'){
   if(typeof body.enabled!=='boolean')return enterpriseJson({error:'Consentimiento inválido'},400);
   const result=await db.from('tp_location_consents').upsert({company_id:member.company_id,driver_id:user.id,enabled:body.enabled,updated_at:new Date().toISOString()},{onConflict:'company_id,driver_id'});
   if(result.error)throw result.error;
   if(!body.enabled){
    const pending=await db.from('tp_location_requests').update({status:'denied',responded_at:new Date().toISOString(),error_code:'consent_revoked'}).eq('company_id',member.company_id).eq('driver_id',user.id).eq('status','pending');
    if(pending.error)throw pending.error;
   }
   await audit(db,member.company_id,user.id,body.enabled?'driver.location_opted_in':'driver.location_opted_out','driver',user.id,null,{enabled:body.enabled});
   return enterpriseJson({ok:true,enabled:body.enabled});
  }
  if(body?.action!=='respond'||!uuid(body?.requestId))return enterpriseJson({error:'Operación no válida'},400);
  const consent=await db.from('tp_location_consents').select('enabled').eq('company_id',member.company_id).eq('driver_id',user.id).maybeSingle();
  if(consent.error)throw consent.error;
  if(!consent.data?.enabled)return enterpriseJson({error:'Compartir ubicación no autorizado'},403);
  if(!await activeJornada(db,user.id))return enterpriseJson({error:'No existe una jornada activa verificable'},403);
  const lat=body.latitude,lon=body.longitude,accuracy=body.accuracy_m;
  const status=body.status==='received'?'received':body.status==='denied'?'denied':'failed';
  if(status==='received'&&(!Number.isFinite(lat)||lat<-90||lat>90||!Number.isFinite(lon)||lon<-180||lon>180||!(accuracy==null||Number.isFinite(accuracy)&&accuracy>=0)))return enterpriseJson({error:'GPS no válido'},400);
  const patch=status==='received'?{status,latitude:lat,longitude:lon,accuracy_m:accuracy??null,responded_at:new Date().toISOString()}: {status,error_code:status==='denied'?'permission_denied':'location_unavailable',responded_at:new Date().toISOString()};
  const saved=await db.from('tp_location_requests').update(patch).eq('id',body.requestId).eq('company_id',member.company_id).eq('driver_id',user.id).eq('status','pending').gt('expires_at',new Date().toISOString()).select('id').maybeSingle();
  if(saved.error)throw saved.error;
  if(!saved.data)return enterpriseJson({error:'La solicitud ya terminó o ha caducado'},409);
  return enterpriseJson({ok:true});
 }catch(e){return enterpriseJson({error:e instanceof Error?e.message:'No se pudo enviar el GPS'},500);}
}
