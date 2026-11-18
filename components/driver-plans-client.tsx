'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
type Plan={slug:string;monthly_cents:number;annual_cents:number|null;trial_days:number};
type Data={billing_enabled:boolean;audience:string;plans:Plan[];subscription:{status:string}|null};
export default function DriverPlansClient(){
 const [info,setInfo]=useState<Data|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=async(action?:'checkout'|'portal',plan?:string,interval?:'month'|'year')=>{
  setError('');setBusy(true);
  try{
   const {data}=await supabase.auth.getSession();
   if(!data.session)throw Error('Inicia sesión para consultar o contratar planes.');
   const res=await fetch('/api/driver/subscription',{method:action?'POST':'GET',headers:{Authorization:'Bearer '+data.session.access_token,...(action?{'Content-Type':'application/json'}:{})},...(action?{body:JSON.stringify({action,plan,interval})}:{})});
   const j=await res.json();
   if(!res.ok)throw Error(j.error||'Servicio no disponible');
   if(j.url){window.location.assign(j.url);return;}
   setInfo(j);
  }catch(e){setError(e instanceof Error?e.message:'Error de conexión');}finally{setBusy(false);}
 };
 useEffect(()=>{void request();},[]);
 const price=(c:number)=>(c/100).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
 const chosen=(tier:'plus'|'pro')=>info?.plans.find(p=>p.slug===(info.audience==='founder'?(tier==='plus'?'plus_existing':'pro_founder'):info.audience==='existing'?tier+'_existing':tier));
 return <main className="mx-auto max-w-5xl space-y-7 px-4 py-12">
  <h1 className="text-3xl font-bold">Planes Tacoplan</h1>
  <p>Plus y Pro incluyen siete días de prueba gratuita si todavía no la has utilizado. Consulta el precio y la fecha de renovación antes de confirmar.</p>
  {error&&<p role="alert" className="rounded border border-red-500 p-3 text-red-700">{error}</p>}
  {info&&<p role="status">{info.billing_enabled?'Contratación disponible':'Cobros aún desactivados'} · {info.subscription?.status||'Sin suscripción'}</p>}
  <div className="grid gap-4 md:grid-cols-3">
  {(['free','plus','pro'] as const).map(tier=>{
   const p=tier==='free'?null:chosen(tier);
   return <section key={tier} className="space-y-4 rounded-xl border p-5">
    <h2 className="text-xl font-bold">{tier==='free'?'Gratis':tier==='plus'?'Plus':'Pro'}</h2>
    <p className="text-2xl font-semibold">{p?price(p.monthly_cents)+'/mes':'0 €'}</p>
    <p>{tier==='free'?'Jornadas y descansos; historial 30 días':tier==='plus'?'AutoStart, dietas y pluses; historial 12 meses':'Acceso completo con estimación de nómina e informes PDF'}</p>
    {p&&<button className="w-full rounded bg-blue-700 p-3 text-white disabled:opacity-40" disabled={busy||!info?.billing_enabled} onClick={()=>void request('checkout',tier,'month')}>Elegir mensual</button>}
    {p?.annual_cents!=null&&<button className="w-full rounded border p-3 disabled:opacity-40" disabled={busy||!info?.billing_enabled} onClick={()=>void request('checkout',tier,'year')}>Anual {price(p.annual_cents)}</button>}
   </section>;
  })}
  </div>
  {info?.subscription&&<button disabled={busy||!info.billing_enabled} className="rounded border px-4 py-3 disabled:opacity-40" onClick={()=>void request('portal')}>Gestionar o cancelar suscripción</button>}
  <p className="text-sm text-gray-600">Las suscripciones se renuevan automáticamente hasta su cancelación. Stripe muestra el importe y las condiciones antes de aceptar el pago.</p>
 </main>;
}
