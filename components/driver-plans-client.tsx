'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {supabase} from '@/lib/supabase';
type Plan={slug:string;monthly_cents:number;annual_cents:number|null;trial_days:number};
type Data={trial_used?:boolean;trial_available?:boolean;trial_used_at?:string|null;feature_status?:Record<string,{expires_at:string|null;days_left:number|null;expired:boolean;limited:boolean}>|null;policy?:{history_days:number|null;trial_days:number;duration_days:number|null}|null;billing_enabled:boolean;restrictions_enabled?:boolean;all_features_unlocked?:boolean;complimentary_plan?:'plus'|'pro'|null;can_manage_subscription?:boolean;pilot_access?:boolean;pro_access?:boolean;effective_plan?:'free'|'plus'|'pro';audience:string;plans:Plan[];subscription:{status:string}|null};
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
  <p>La duración de la prueba gratuita depende del plan y aparece antes de contratar. Consulta el precio y la fecha de renovación antes de confirmar.</p>
  {error&&<div role="alert" className="rounded border border-red-500 p-3 text-red-700"><p>{error}</p>{needsLogin&&<Link href="/login?next=%2Fplanes" className="mt-3 inline-block rounded bg-blue-700 px-4 py-2 font-semibold text-white">Iniciar sesión para ver planes</Link>}</div>}
  {info&&<div role="status" className="space-y-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
   <p className="font-semibold">{info.all_features_unlocked?'Tacoplan gratis · todas las funciones disponibles':('Plan actual: '+(info.effective_plan==='pro'?'Pro':info.effective_plan==='plus'?'Plus':'Gratis'))}</p>
   <p>{'Suscripción registrada: '+(info.subscription?.status||'Sin suscripción')+' · '}{info.billing_enabled?'Contratación disponible':'Contratación desactivada'}</p>
   {info.complimentary_plan?<p>Acceso gratuito de administración: {info.complimentary_plan.toUpperCase()}</p>:null}
   <p>{info.trial_used?'Prueba gratuita ya utilizada. Puedes contratar directamente sin repetirla.':info.trial_available?'Tu prueba gratuita de Plus/Pro sigue disponible si decides activarla.':'No hay prueba gratuita disponible actualmente.'}</p>
   {info.effective_plan==='free'&&info.feature_status&&Object.entries(info.feature_status).filter(([,f])=>f.limited).map(([key,f])=><p key={key}>{({diets:'Dietas y pluses',auto:'AutoStart',manual:'Actividades',reports:'Informes',notify:'Notificaciones',trip:'Jornadas',widget:'Widgets'} as Record<string,string>)[key]||key}: {f.expired?'Plazo gratuito finalizado':`${f.days_left} días gratuitos restantes`}</p>)}
   {!info.restrictions_enabled?<p>Las restricciones por plan todavía no están activadas. No se bloquea ninguna función.</p>:null}
  </div>}
  <div className="grid gap-4 md:grid-cols-3">
  {(['free','plus','pro'] as const).map(tier=>{
   const p=tier==='free'?null:chosen(tier);
   return <section key={tier} className="space-y-4 rounded-xl border p-5">
    <h2 className="text-xl font-bold">{tier==='free'?'Gratis':tier==='plus'?'Plus':'Pro'}</h2>
    <p className="text-2xl font-semibold">{p?price(p.monthly_cents)+'/mes':'0 €'}</p>
    <p>{tier==='free'?'Jornadas y descansos; historial según las condiciones del plan Gratis':tier==='plus'?'AutoStart, dietas y pluses; historial 12 meses':'Acceso completo con estimación de nómina e informes PDF'}</p>
    {p&&<button className="w-full rounded bg-blue-700 p-3 text-white disabled:opacity-40" disabled={busy||!info?.billing_enabled} onClick={()=>void request('checkout',tier,'month')}>Elegir mensual · {info?.trial_available&&p.trial_days>0?p.trial_days+' días de prueba disponibles':'sin nueva prueba'}</button>}
    {p&&<button className="w-full rounded border border-blue-700 p-3 font-semibold text-blue-700 disabled:opacity-40" disabled={busy||!info?.billing_enabled} onClick={()=>void request('checkout',tier,'month',true)}>Contratar y pagar ahora (sin prueba gratuita)</button>}
    {p?.annual_cents!=null&&<button className="w-full rounded border p-3 disabled:opacity-40" disabled={busy||!info?.billing_enabled} onClick={()=>void request('checkout',tier,'year')}>Anual {price(p.annual_cents)}</button>}
   </section>;
  })}
  </div>
  {info?.can_manage_subscription&&<button disabled={busy} className="rounded border px-4 py-3 disabled:opacity-40" onClick={()=>void request('portal')}>Gestionar o cancelar suscripción</button>}
  <p className="text-sm text-gray-600">{info?.pilot_access?'El piloto no concede Pro gratis: el acceso dependerá de la suscripción contratada. ':' '}Las suscripciones se renuevan automáticamente hasta su cancelación. Stripe muestra el importe y las condiciones antes de aceptar el pago.</p>
 </main>;
}
