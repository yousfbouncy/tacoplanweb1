import {NextRequest} from 'next/server';
import {membership,enterpriseJson,uuid} from '@/lib/tp-enterprise';
export const dynamic='force-dynamic';

// Reverse geocoding is deliberately server-side. Only authorized Tráfico can
// resolve a position that was actually returned by an approved device.
export async function GET(req:NextRequest){
 try{
  const driverId=req.nextUrl.searchParams.get('driverId')||'';
  const requestId=req.nextUrl.searchParams.get('requestId')||'';
  const auth=await membership(req);
  if(!auth?.member||auth.member.role!=='traffic'||!uuid(driverId)||!uuid(requestId))return enterpriseJson({error:'Acceso no autorizado'},403);
  const {db,user,member}=auth;
  const [assignment,result,consent]=await Promise.all([
   db.from('tp_traffic_driver_assignments').select('driver_id').eq('company_id',member.company_id).eq('driver_id',driverId).eq('traffic_user_id',user.id).maybeSingle(),
   db.from('tp_location_requests').select('id,latitude,longitude,status').eq('id',requestId).eq('company_id',member.company_id).eq('driver_id',driverId).eq('requested_by',user.id).maybeSingle(),
   db.from('tp_location_consents').select('enabled').eq('company_id',member.company_id).eq('driver_id',driverId).maybeSingle()
  ]);
  if(assignment.error||result.error||consent.error)throw assignment.error||result.error||consent.error;
  if(!assignment.data||!consent.data?.enabled||result.data?.status!=='received'||typeof result.data.latitude!=='number'||typeof result.data.longitude!=='number')return enterpriseJson({error:'No hay una posición autorizada y confirmada'},403);
  const {latitude:lat,longitude:lon}=result.data;
  const url='https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=17&accept-language=es&lat='+encodeURIComponent(lat)+'&lon='+encodeURIComponent(lon);
  const response=await fetch(url,{headers:{'User-Agent':'Tacoplan/1.0 (https://tacoplan.es)','Accept':'application/json'},signal:AbortSignal.timeout(7000),next:{revalidate:3600}});
  if(!response.ok)return enterpriseJson({address:null,reason:'Servicio de direcciones no disponible'});
  const data=await response.json() as {address?:Record<string,string>;display_name?:string};
  const a=data.address||{};
  const city=a.city||a.town||a.village||a.municipality||a.county||a.state||null;
  const road=a.road||a.highway||a.route||a.pedestrian||null;
  return enterpriseJson({address:{city,road,country:a.country||null,region:a.state||null,full:data.display_name||null}});
 }catch{return enterpriseJson({address:null,reason:'No se pudo identificar la carretera o ciudad'});}
}
