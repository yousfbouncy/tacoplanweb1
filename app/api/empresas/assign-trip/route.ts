import {NextRequest} from 'next/server';
import {randomUUID} from 'node:crypto';
import {membership,enterpriseJson,originAllowed,isPaidAccess,uuid,audit} from '@/lib/tp-enterprise';

export const dynamic='force-dynamic';
const plain=(value:unknown,max=250)=>typeof value==='string'?value.trim().slice(0,max):'';
type Stop={tipo:'CARGA'|'DESCARGA'|'ENTREGA_REMOLQUE';lugar:string;observaciones:string;remolque:string;salidaConfirmada:boolean};

export async function POST(req:NextRequest){
 if(!originAllowed(req))return enterpriseJson({error:'Origen no permitido'},403);
 try{
  const auth=await membership(req);
  if(!auth?.member||auth.member.role!=='traffic')return enterpriseJson({error:'Solo Tráfico puede asignar viajes'},403);
  const {db,user,member}=auth;
  const companyId=member.company_id;
  const company=await db.from('tp_companies').select('subscription_status,trial_ends_at').eq('id',companyId).single();
  if(company.error)throw company.error;
  if(!isPaidAccess(company.data))return enterpriseJson({error:'El acceso empresarial no está activo'},402);
  const body=await req.json();
  const driverId=body?.driverId;
  if(!uuid(driverId))return enterpriseJson({error:'Selecciona un conductor'},400);
  const [driver,assigned]=await Promise.all([
   db.from('tp_company_members').select('user_id').eq('company_id',companyId).eq('user_id',driverId).eq('role','driver').eq('active',true).maybeSingle(),
   db.from('tp_traffic_driver_assignments').select('driver_id').eq('company_id',companyId).eq('driver_id',driverId).eq('traffic_user_id',user.id).maybeSingle()
  ]);
  if(driver.error||assigned.error)throw driver.error||assigned.error;
  if(!driver.data||!assigned.data)return enterpriseJson({error:'Este conductor no está asignado a tu usuario de Tráfico'},403);
  const cliente=plain(body.cliente,120),remolque=plain(body.remolque,80),observaciones=plain(body.observaciones,1000);
  const tipo=body.tipo;
  if(!cliente||!['CARGA','DESCARGA','CARGA_DESCARGA','ENTREGA_REMOLQUE'].includes(tipo))return enterpriseJson({error:'Indica el cliente y tipo de viaje'},400);
  if(!Array.isArray(body.paradas)||body.paradas.length<1||body.paradas.length>12)return enterpriseJson({error:'El viaje necesita entre 1 y 12 paradas'},400);
  const paradas:Stop[]=[];
  for(const raw of body.paradas){
   if(!raw||!['CARGA','DESCARGA','ENTREGA_REMOLQUE'].includes(raw.tipo))return enterpriseJson({error:'Operación no válida'},400);
   const lugar=plain(raw.lugar,200);
   if(!lugar)return enterpriseJson({error:'Indica la ubicación de cada parada'},400);
   paradas.push({tipo:raw.tipo,lugar,observaciones:plain(raw.observaciones,500),remolque,salidaConfirmada:false});
  }
  if(tipo==='ENTREGA_REMOLQUE'&&!paradas.some(p=>p.tipo==='ENTREGA_REMOLQUE'))return enterpriseJson({error:'Añade dónde debe soltarse el remolque'},400);
  const id='traffic-'+randomUUID();
  const saved=await db.from('viajes').insert({
   id,user_id:driverId,cliente,modo_viaje:tipo,estado:'EN_CURSO',paradas,
   notas:JSON.stringify({origen:'trafico',company_id:companyId,remolque,observaciones,assigned_by:user.id})
  }).select('id').single();
  if(saved.error)throw saved.error;
  await audit(db,companyId,user.id,'traffic.trip_assigned','trip',id,null,{driver_id:driverId,cliente,tipo,remolque,paradas});
  // Notification delivery is best effort: the assignment has already been
  // saved and must never be retried by the UI just because Expo is offline.
  let pushStatus:'sent'|'no_tokens'|'failed'='no_tokens';
  try{
   const tokens=await db.from('push_tokens').select('expo_push_token')
    .eq('user_id',driverId).eq('notifications_enabled',true);
   if(tokens.error)throw tokens.error;
   const destinations=[...new Set((tokens.data||[]).map((t:{expo_push_token:string})=>t.expo_push_token)
    .filter((token:string)=>/^Expo(nent)?PushToken\\[[^\\]]+\\]$/.test(token)))];
   if(destinations.length){
    const messages=destinations.map(to=>({
     to,
     title:'Tacoplan · Nuevo viaje asignado',
     body:cliente+' · '+paradas[0].lugar,
     sound:'tacoplan-viaje.wav',
     channelId:'traffic-assigned-v1',
     priority:'high',
     data:{target:'viaje',tripId:id,source:'traffic',eventId:'assigned:'+id}
    }));
    const response=await fetch('https://exp.host/--/api/v2/push/send',{
     method:'POST',
     headers:{'Content-Type':'application/json','Accept':'application/json'},
     body:JSON.stringify(messages),
     signal:AbortSignal.timeout(7000)
    });
    if(!response.ok)throw new Error('Expo push HTTP '+response.status);
    const result=await response.json() as {data?:Array<{status?:string}>};
    pushStatus=result.data?.some(x=>x.status==='ok')?'sent':'failed';
   }
  }catch(error){
   pushStatus='failed';
   console.warn('[TRAFFIC] Push de nueva asignación pendiente',error);
  }
  return enterpriseJson({ok:true,id,pushStatus});
 }catch(error){
  return enterpriseJson({error:error instanceof Error?error.message:'No se pudo asignar el viaje'},500);
 }
}
