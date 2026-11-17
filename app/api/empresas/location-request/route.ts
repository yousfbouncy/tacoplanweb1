import {NextRequest} from 'next/server';
import {membership,enterpriseJson,originAllowed,isPaidAccess,uuid,audit} from '@/lib/tp-enterprise';

export const dynamic='force-dynamic';

async function trafficContext(req:NextRequest,driverId:string){
 const auth=await membership(req);
 if(!auth?.member||auth.member.role!=='traffic')return {error:enterpriseJson({error:'Solo Tráfico puede solicitar localizaciones'},403)};
 const {db,user,member}=auth;
 if(!uuid(driverId))return {error:enterpriseJson({error:'Conductor no válido'},400)};
 const [company,driver,assignment]=await Promise.all([
  db.from('tp_companies').select('subscription_status,trial_ends_at').eq('id',member.company_id).single(),
  db.from('tp_company_members').select('user_id').eq('company_id',member.company_id).eq('user_id',driverId).eq('role','driver').eq('active',true).maybeSingle(),
  db.from('tp_traffic_driver_assignments').select('driver_id').eq('company_id',member.company_id).eq('driver_id',driverId).eq('traffic_user_id',user.id).maybeSingle()
 ]);
 if(company.error||driver.error||assignment.error)throw company.error||driver.error||assignment.error;
 if(!isPaidAccess(company.data))return {error:enterpriseJson({error:'Suscripción no activa'},402)};
 if(!driver.data||!assignment.data)return {error:enterpriseJson({error:'El conductor no está asignado a este usuario de Tráfico'},403)};
 return {db,user,member};
}

export async function GET(req:NextRequest){
 try{
  const driverId=req.nextUrl.searchParams.get('driverId')||'';
  const ctx=await trafficContext(req,driverId);
  if(ctx.error)return ctx.error;
  const {db,user,member}=ctx;
  const result=await db!.from('tp_location_requests').select('id,status,requested_at,expires_at,responded_at,latitude,longitude,accuracy_m,error_code').eq('company_id',member!.company_id).eq('driver_id',driverId).eq('requested_by',user!.id).order('requested_at',{ascending:false}).limit(1).maybeSingle();
  if(result.error)throw result.error;
  const row=result.data;
  if(!row)return enterpriseJson({request:null});
  const status=row.status==='pending'&&Date.parse(row.expires_at)<Date.now()?'expired':row.status;
  // Coordinates never leave the server until an approved device response is received.
  return enterpriseJson({request:{id:row.id,status,requested_at:row.requested_at,expires_at:row.expires_at,responded_at:row.responded_at,...(status==='received'?{latitude:row.latitude,longitude:row.longitude,accuracy_m:row.accuracy_m}:{})}});
 }catch(e){return enterpriseJson({error:e instanceof Error?e.message:'No se pudo consultar la localización'},500);}
}

export async function POST(req:NextRequest){
 if(!originAllowed(req))return enterpriseJson({error:'Origen no permitido'},403);
 try{
  const body=await req.json(),driverId=body?.driverId;
  const ctx=await trafficContext(req,driverId);
  if(ctx.error)return ctx.error;
  const {db,user,member}=ctx;
  const latest=await db!.from('tp_location_requests').select('id,status,expires_at,requested_at').eq('company_id',member!.company_id).eq('driver_id',driverId).eq('requested_by',user!.id).order('requested_at',{ascending:false}).limit(1).maybeSingle();
  if(latest.error)throw latest.error;
  if(latest.data?.status==='pending'&&Date.parse(latest.data.expires_at)>Date.now())return enterpriseJson({ok:true,id:latest.data.id,status:'pending',reused:true});
  const created=await db!.from('tp_location_requests').insert({company_id:member!.company_id,driver_id:driverId,requested_by:user!.id,status:'pending'}).select('id,requested_at,expires_at').single();
  if(created.error)throw created.error;
  await audit(db,member!.company_id,user!.id,'traffic.location_requested','driver',driverId,null,{request_id:created.data.id});
  return enterpriseJson({ok:true,id:created.data.id,status:'pending',requested_at:created.data.requested_at,expires_at:created.data.expires_at});
 }catch(e){return enterpriseJson({error:e instanceof Error?e.message:'No se pudo solicitar la localización'},500);}
}
