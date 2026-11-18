'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {supabase} from '@/lib/supabase';
type Plan={slug:string;monthly_cents:number;annual_cents:number|null;trial_days:number};
type Data={billing_enabled:boolean;can_manage_subscription?:boolean;pilot_access?:boolean;pro_access?:boolean;effective_plan?:'free'|'plus'|'pro';audience:string;plans:Plan[];subscription:{status:string}|null};
export default function DriverPlansClient(){
 const [info,setInfo]=useState<Data|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[needsLogin,setNeedsLogin]=useState(false);
 const request=async(action?:'checkout'|'portal',plan?:string,interval?:'month'|'year',skipTrial=false)=>{
  setError('');setNeedsLogin(false);setBusy(true);
  try{
   const {data}=await supabase.auth.getSession();
   if(!data.session){setNeedsLogin(true);throw Error('Debes iniciar sesión en esta web para consultar los planes.');}
   const res=await fetch('/api/driver/subscription',{method:action?'POST':'GET',headers:{Authorization:'Bearer '+data.session.access_token,...(action?{'Content-Type':'application/json'}:{})},...(action?{body:JSON.stringify({action,plan,interval,skip_trial:skipTrial})}:{})});
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
  {error&&<div role="alert" className="rounded border border-red-500 p-3 text-red-700"><p>{error}</p>{needsLogin&&<Link href="/login?next=%2Fplanes" className="mt-3 inline-block rounded bg-blue-700 px-4 py-2 font-semibold text-white">Iniciar sesión para ver planes</Link>}</div>}
  {info&&<p role="status">{'Plan actual: '+(info.effective_plan==='pro'?'Pro':info.effective_plan==='plus'?'Plus':'Gratis')+' · '}{info.billing_enabled?'Contratación disponible':'Cobros desactivados'} · {info.subscription?.status||'Sin suscripción'}</p>}
  <div className="grid gap-4 md:grid-cols-3">
  {(['free','plus','pro'] as const).map(tier=>{
   const p=tier==='free'?null:chosen(tier);
   return <section key={tier} className="space-y-4 rounded-xl border p-5">
    <h2 className="text-xl font-bold">{tier==='free'?'Gratis':tier==='plus'?'Plus':'Pro'}</h2>
    <p className="text-2xl font-semibold">{p?price(p.monthly_cents)+'/mes':'0 €'}</p>
    <p>{tier==='free'?'Jornadas y descansos; historial 30 días':tier==='plus'?'AutoStart, dietas y pluses; historial 12 meses':'Acceso completo con estimación de nómina e informes PDF'}</p>
    {p&&<button className="w-full rounded bg-blue-700 p-3 text-white disabled:opacity-40" disabled={busy||!info?.billing_enabled} onClick={()=>void request('checkout',tier,'month')}>Elegir mensual · con prueba gratuita</button>}
    {p&&<button className="w-full rounded border border-blue-700 p-3 font-semibold text-blue-700 disabled:opacity-40" disabled={busy||!info?.billing_enabled} onClick={()=>void request('checkout',tier,'month',true)}>Contratar y pagar ahora (sin prueba gratuita)</button>}
    {p?.annual_cents!=null&&<button className="w-full rounded border p-3 disabled:opacity-40" disabled={busy||!info?.billing_enabled} onClick={()=>void request('checkout',tier,'year')}>Anual {price(p.annual_cents)}</button>}
   </section>;
  })}
  </div>
  {info?.can_manage_subscription&&<button disabled={busy} className="rounded border px-4 py-3 disabled:opacity-40" onClick={()=>void request('portal')}>Gestionar o cancelar suscripción</button>}
  <p className="text-sm text-gray-600">{info?.pilot_access?'El piloto no concede Pro gratis: el acceso dependerá de la suscripción contratada. ':' '}Las suscripciones se renuevan automáticamente hasta su cancelación. Stripe muestra el importe y las condiciones antes de aceptar el pago.</p>
 </main>;
}
