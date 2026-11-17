'use client';
import {useEffect,useState} from 'react';
import {MapPin,RefreshCw,Navigation} from 'lucide-react';
import {supabase} from '@/lib/supabase';

type Request={id:string;status:string;requested_at:string;expires_at:string;responded_at?:string|null;latitude?:number|null;longitude?:number|null;accuracy_m?:number|null};
type Address={city:string|null;road:string|null;country:string|null;region:string|null;full:string|null};
const button='inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
export default function TrafficDriverLocation({driverId,activeDuty=false}:{driverId:string;activeDuty?:boolean}){
 const [request,setRequest]=useState<Request|null>(null);
 const [address,setAddress]=useState<Address|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [loadingAddress,setLoadingAddress]=useState(false);
 const api=async(method:'GET'|'POST',route:string,body?:Record<string,unknown>)=>{
  const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('Sesión caducada');
  const res=await fetch(route,{method,headers:{Authorization:'Bearer '+session.access_token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const value=await res.json();if(!res.ok)throw Error(value.error||'No se pudo consultar');
  return value;
 };
 const check=async()=>{
  try{const data=await api('GET','/api/empresas/location-request?driverId='+encodeURIComponent(driverId));setRequest(data.request||null);}
  catch(e){setError(e instanceof Error?e.message:'No se pudo consultar');}
 };
 useEffect(()=>{setRequest(null);setAddress(null);setError('');void check();},[driverId]);
 useEffect(()=>{
  if(request?.status!=='pending')return;
  const timer=window.setInterval(()=>void check(),5000);
  return()=>window.clearInterval(timer);
 },[driverId,request?.status]);
 useEffect(()=>{
  if(request?.status!=='received'||typeof request.latitude!=='number'||typeof request.longitude!=='number')return;
  let cancelled=false;setLoadingAddress(true);
  void api('GET','/api/empresas/location-address?driverId='+encodeURIComponent(driverId)+'&requestId='+encodeURIComponent(request.id))
   .then(data=>{if(!cancelled)setAddress(data.address||null);})
   .catch(()=>{if(!cancelled)setAddress(null);})
   .finally(()=>{if(!cancelled)setLoadingAddress(false);});
  return()=>{cancelled=true;};
 },[driverId,request?.id,request?.status,request?.latitude,request?.longitude]);
 const ask=async()=>{
  if(busy)return;setBusy(true);setError('');setRequest(null);setAddress(null);
  try{const data=await api('POST','/api/empresas/location-request',{driverId});setRequest({id:data.id,status:'pending',requested_at:data.requested_at||new Date().toISOString(),expires_at:data.expires_at||new Date(Date.now()+120000).toISOString()});}
  catch(e){setError(e instanceof Error?e.message:'No se pudo solicitar');}
  finally{setBusy(false);}
 };
 const received=request?.status==='received'&&typeof request.latitude==='number'&&typeof request.longitude==='number';
 const lat=request?.latitude??0,lon=request?.longitude??0;
 const frameUrl=received?'https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent([lon-0.025,lat-0.015,lon+0.025,lat+0.015].join(','))+'&layer=mapnik&marker='+encodeURIComponent(lat+','+lon):'';
 const href=received?'https://www.openstreetmap.org/?mlat='+encodeURIComponent(lat)+'&mlon='+encodeURIComponent(lon)+'#map=13/'+lat+'/'+lon:'';
 return <section className="rounded-2xl border border-slate-200 bg-white p-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="flex items-center gap-2 font-bold"><MapPin size={17} className="text-blue-600"/>Trayecto y localización</h3><p className="mt-1 text-xs text-slate-500">Consulta puntual del GPS del conductor, no seguimiento permanente.</p></div><button type="button" className={button} disabled={busy} onClick={()=>void ask()}><RefreshCw size={15} className={busy?'animate-spin':''}/> {busy?'Solicitando…':'Ver localización'}</button></div>
  {!activeDuty?<p className="mt-3 text-xs text-amber-700">No se ha confirmado una jornada activa. La aplicación móvil deberá comprobar jornada y consentimiento antes de responder.</p>:null}
  {error?<p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>:null}
  {request?.status==='pending'?<p role="status" className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">Solicitud registrada en Supabase. Esperando que Tacoplan móvil responda con una posición autorizada. El receptor móvil todavía no está implementado.</p>:null}
  {request?.status==='expired'?<p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">El dispositivo no ha respondido en 2 minutos. No se ha obtenido una localización actual.</p>:null}
  {request?.status==='denied'?<p role="status" className="mt-3 text-sm text-amber-700">El conductor no ha autorizado esta localización.</p>:null}
  {request?.status==='failed'?<p role="status" className="mt-3 text-sm text-amber-700">No se pudo obtener el GPS del conductor.</p>:null}
  {received?<div className="mt-4 space-y-3">
   <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Localización detectada</p>
    <p className="mt-1 text-lg font-bold text-slate-900">{loadingAddress?'Identificando ciudad y carretera…':address?[address.city,address.country].filter(Boolean).join(', ')||'Ubicación GPS recibida':'Ubicación GPS recibida · dirección no disponible'}</p>
    <p className="mt-1 text-sm text-slate-700">{address?.road?'Carretera: '+address.road:'Carretera no identificada'}</p>
    <p className="mt-1 text-xs text-slate-600">GPS recibido: {new Date(request!.responded_at||request!.requested_at).toLocaleString('es-ES')}{request!.accuracy_m!=null?' · Precisión aproximada: '+Math.round(request!.accuracy_m)+' m':''}</p>
   </div>
   <iframe title="Mapa de la localización confirmada del conductor" src={frameUrl} className="h-64 w-full rounded-xl border border-slate-200" loading="lazy" referrerPolicy="no-referrer"/>
   <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><Navigation size={16}/> Abrir mapa ampliado</a>
   <p className="text-xs text-slate-500">Dirección aproximada obtenida mediante geocodificación inversa. Puede no coincidir exactamente con la carretera real.</p>
  </div>:null}
  {!request&&!error?<p className="mt-3 text-xs text-slate-500">Sin solicitud reciente. La ubicación solo aparecerá cuando el teléfono responda con permiso.</p>:null}
 </section>;
}
