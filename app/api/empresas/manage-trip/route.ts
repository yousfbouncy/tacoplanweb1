import {NextRequest} from 'next/server';
import {normalizeStopNavigation} from '@/lib/tp-trip-navigation';
import {membership,enterpriseJson,originAllowed,isPaidAccess,uuid,audit} from '@/lib/tp-enterprise';

export const dynamic='force-dynamic';
const plain=(x:unknown,max=250)=>typeof x==='string'?x.trim().slice(0,max):'';
const types=['CARGA','DESCARGA','ENTREGA_REMOLQUE'];
type Stop={tipo:string;lugar:string;observaciones:string;fecha_cita?:string|null;hora_cita?:string|null;remolque?:string;ubicacion_mapa?:string;salidaConfirmada?:boolean;salidaReal?:string|null};
const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'));
const validTime=(s:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export async function POST(req:NextRequest){
 if(!originAllowed(req))return enterpriseJson({error:'Origen no permitido'},403);
 try{
  const auth=await membership(req);
  if(!auth?.member||auth.member.role!=='traffic')return enterpriseJson({error:'Solo Tráfico puede gestionar viajes'},403);
  const {db,user,member}=auth,companyId=member.company_id;
  const company=await db.from('tp_companies').select('subscription_status,trial_ends_at').eq('id',companyId).single();
  if(company.error)throw company.error;
  if(!isPaidAccess(company.data))return enterpriseJson({error:'El acceso empresarial no está activo'},402);
  const body=await req.json(),tripId=plain(body?.tripId,150),operation=plain(body?.operation,30);
  if(!tripId||!['edit','transfer','delete'].includes(operation))return enterpriseJson({error:'Acción no válida'},400);
  const existing=await db.from('viajes').select('id,user_id,cliente,modo_viaje,paradas,notas,estado').eq('id',tripId).maybeSingle();
  if(existing.error)throw existing.error;
  const trip=existing.data;if(!trip)return enterpriseJson({error:'Viaje no encontrado'},404);
  let metadata:Record<string,unknown>={};
  try{const parsed=JSON.parse(trip.notas||'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))metadata=parsed;}catch{}
  if(metadata.origen!=='trafico'||metadata.company_id!==companyId)return enterpriseJson({error:'Este viaje no fue creado por Tráfico en esta empresa'},403);
  const authorized=async(id:string)=>{
   if(!uuid(id))return false;
   const [driver,assignment]=await Promise.all([
    db.from('tp_company_members').select('user_id').eq('company_id',companyId).eq('user_id',id).eq('role','driver').eq('active',true).maybeSingle(),
    db.from('tp_traffic_driver_assignments').select('driver_id').eq('company_id',companyId).eq('driver_id',id).eq('traffic_user_id',user.id).maybeSingle()
   ]);
   if(driver.error||assignment.error)throw driver.error||assignment.error;
   return Boolean(driver.data&&assignment.data);
  };
  if(!await authorized(trip.user_id))return enterpriseJson({error:'El viaje no está asignado a tu equipo'},403);
  if(operation==='delete'){
   const result=await db.from('viajes').delete().eq('id',tripId).eq('user_id',trip.user_id);
   if(result.error)throw result.error;
   await audit(db,companyId,user.id,'traffic.trip_deleted','trip',tripId,{driver_id:trip.user_id,cliente:trip.cliente},null);
   return enterpriseJson({ok:true});
  }
  if(operation==='transfer'){
   const newDriverId=plain(body?.driverId,64);
   if(!await authorized(newDriverId))return enterpriseJson({error:'El nuevo conductor debe estar asignado a tu usuario de Tráfico'},403);
   if(newDriverId===trip.user_id)return enterpriseJson({error:'Selecciona otro conductor'},400);
   const updated=await db.from('viajes').update({user_id:newDriverId,notas:JSON.stringify({...metadata,transferred_by:user.id,transferred_at:new Date().toISOString()})}).eq('id',tripId).eq('user_id',trip.user_id).select('id').maybeSingle();
   if(updated.error)throw updated.error;
   if(!updated.data)return enterpriseJson({error:'No se ha podido transferir: el conductor ha cambiado'},409);
   await audit(db,companyId,user.id,'traffic.trip_transferred','trip',tripId,{driver_id:trip.user_id},{driver_id:newDriverId});
   return enterpriseJson({ok:true});
  }
  const cliente=plain(body?.cliente,120),tipo=plain(body?.tipo,40),remolque=plain(body?.remolque,80),observaciones=plain(body?.observaciones,1000);
  if(!cliente||!['CARGA','DESCARGA','CARGA_DESCARGA','ENTREGA_REMOLQUE'].includes(tipo))return enterpriseJson({error:'Indica cliente y tipo de viaje'},400);
  if(!Array.isArray(body?.paradas)||body.paradas.length<1||body.paradas.length>12)return enterpriseJson({error:'Se necesitan entre 1 y 12 paradas'},400);
  const oldStops=Array.isArray(trip.paradas)?trip.paradas as Stop[]:[];
  const stops:Stop[]=[];
  for(let i=0;i<body.paradas.length;i++){
   const raw=body.paradas[i],lugar=plain(raw?.lugar,200),kind=plain(raw?.tipo,40);
   const fecha=plain(raw?.fecha_cita,10),hora=plain(raw?.hora_cita,5);
   if(!types.includes(kind)||!lugar)return enterpriseJson({error:'Revisa la operación y el lugar de cada parada'},400);
   if(fecha&&!validDate(fecha)||hora&&!validTime(hora))return enterpriseJson({error:'Fecha u hora de cita no válida'},400);
   const previous=oldStops[i];
   // Keep the operational evidence of completed stops when editing a trip.
   stops.push({tipo:kind,lugar,observaciones:plain(raw?.observaciones,500),fecha_cita:fecha||null,hora_cita:hora||null,ubicacion_mapa:normalizeStopNavigation(raw?.ubicacion_mapa),remolque,salidaConfirmada:Boolean(previous?.salidaConfirmada&&previous.tipo===kind&&previous.lugar===lugar),...(previous?.salidaReal&&previous.tipo===kind&&previous.lugar===lugar?{salidaReal:previous.salidaReal}:{})});
  }
  if(tipo==='ENTREGA_REMOLQUE'&&!stops.some(s=>s.tipo==='ENTREGA_REMOLQUE'))return enterpriseJson({error:'Añade la entrega del remolque'},400);
  const updated=await db.from('viajes').update({cliente,modo_viaje:tipo,paradas:stops,notas:JSON.stringify({...metadata,remolque,observaciones,edited_by:user.id,edited_at:new Date().toISOString()})}).eq('id',tripId).eq('user_id',trip.user_id).select('id').maybeSingle();
  if(updated.error)throw updated.error;
  if(!updated.data)return enterpriseJson({error:'Viaje modificado desde otro lugar. Actualiza los datos.'},409);
  await audit(db,companyId,user.id,'traffic.trip_edited','trip',tripId,null,{cliente,tipo,paradas:stops});
  return enterpriseJson({ok:true});
 }catch(error){return enterpriseJson({error:error instanceof Error?error.message:'No se pudo gestionar el viaje'},500);}
}
