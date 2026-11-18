'use client';
import { useEffect, useState } from 'react';

type Plan={slug:string;plan:string;audience:string;monthly_cents:number;annual_cents:number|null;trial_days:number};
type User={id:string;name:string;joinedAt:string;recordedDays30:number;lastSeenAt:string|null;eligibility:string;reason:string};
type Payload={plans:Plan[];control:{billing_enabled:boolean;restrictions_enabled:boolean};users:User[];summary:{registered:number;recording30:number;eligibleVerified:number;eligiblePending:number}};
const labels:Record<string,string>={
 free:'Gratis',plus:'Plus · general',pro:'Pro · general',
 plus_existing:'Plus · actuales (50 %)',pro_existing:'Pro · actuales',pro_founder:'Pro · primeros 50 fundadores',
};
const money=(n:number|null)=>n===null?'Sin definir':(n/100).toFixed(2).replace('.',',')+' €';
const inputMoney=(n:number|null)=>n===null?'':(n/100).toFixed(2);
const parseCents=(v:string)=>{if(!/^\\d{1,5}([.,]\\d{1,2})?$/.test(v.trim()))return null;return Math.round(Number(v.replace(',','.'))*100);};

export default function AdminPlansPage(){
 const [payload,setPayload]=useState<Payload|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [editing,setEditing]=useState<Record<string,{month:string;year:string}>>({});
 const [saving,setSaving]=useState<string|null>(null);
 const load=async()=>{
  setLoading(true);setError('');
  try{
   const r=await fetch('/api/admin/plans',{cache:'no-store',credentials:'same-origin'});
   const j=await r.json();
   if(!r.ok)throw Error(j.error||'No se pudo abrir el panel');
   setPayload(j);
   setEditing(Object.fromEntries((j.plans as Plan[]).map(p=>[p.slug,{month:inputMoney(p.monthly_cents),year:inputMoney(p.annual_cents)}])));
  }catch(e){setError(e instanceof Error?e.message:'Error de conexión');}
  finally{setLoading(false);}
 };
 useEffect(()=>{void load();},[]);
 const edit=(slug:string,field:'month'|'year',value:string)=>{
  setEditing(prev=>({...prev,[slug]:{...prev[slug],[field]:value}}));
 };
 const save=async(plan:Plan)=>{
  const values=editing[plan.slug]; if(!values)return;
  const month=parseCents(values.month);
  const annual=values.year.trim()?parseCents(values.year):null;
  if(month===null || (values.year.trim() && annual===null)){setError('Introduce precios válidos, en euros y con máximo dos decimales.');return;}
  setSaving(plan.slug);setError('');setNotice('');
  try{
   const r=await fetch('/api/admin/plans',{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({slug:plan.slug,monthly_cents:month,annual_cents:annual})});
   const j=await r.json();
   if(!r.ok)throw Error(j.error||'No se pudo guardar');
   setPayload(prev=>prev?{...prev,plans:prev.plans.map(p=>p.slug===plan.slug?j.plan:p)}:prev);
   setNotice('Precio guardado en el catálogo. Los cobros permanecen desactivados.');
  }catch(e){setError(e instanceof Error?e.message:'Error guardando cambios');}
  finally{setSaving(null);}
 };
 return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
  <div className="mx-auto max-w-6xl space-y-6">
   <header><h1 className="text-3xl font-extrabold">Planes y suscripciones · Administración</h1>
    <p className="mt-2 text-slate-600">Edita los precios y revisa usuarios. No activa pagos ni bloquea funciones.</p></header>
   {loading?<p>Cargando catálogo…</p>:null}
   {error?<p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800">{error}. Accede primero con tu sesión de administrador.</p>:null}
   {notice?<p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">{notice}</p>:null}
   {payload?<><section className="grid gap-3 md:grid-cols-4">
    {[['Registrados',payload.summary.registered],['Con jornadas en 30 días',payload.summary.recording30],['Fundadores confirmados',payload.summary.eligibleVerified],['Por revisar',payload.summary.eligiblePending]].map(([name,n])=><div key={name} className="rounded-xl bg-white p-4 shadow-sm"><p className="text-sm text-slate-600">{name}</p><p className="text-2xl font-bold">{n}</p></div>)}
   </section>
   <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
    <p className="font-bold text-amber-950">Modo preparación · cobros {payload.control.billing_enabled?'ACTIVOS (revisar)':'desactivados'} · restricciones {payload.control.restrictions_enabled?'ACTIVAS (revisar)':'desactivadas'}</p>
    <p className="mt-1 text-sm text-amber-900">Cambiar el catálogo no cambia un precio ya contratado ni inicia suscripciones. La elegibilidad del 70 % requiere confirmar días realmente trabajados; no se asignará automáticamente.</p>
   </section>
   <section className="rounded-xl bg-white p-5 shadow-sm">
    <h2 className="text-xl font-bold">Precios editables</h2>
    <p className="mb-4 text-sm text-slate-500">Importes en euros. El anual se cobra una vez al año, no cada mes. Siete días gratis para Plus y Pro.</p>
    <div className="overflow-x-auto"><table className="w-full min-w-[690px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Modalidad</th><th className="p-2">Mensual</th><th className="p-2">Anual</th><th className="p-2">Prueba</th><th className="p-2">Acción</th></tr></thead>
    <tbody>{payload.plans.map(plan=><tr key={plan.slug} className="border-b last:border-0">
     <td className="p-2 font-semibold">{labels[plan.slug]||plan.slug}</td>
     {plan.slug==='free'?<><td className="p-2">Gratis</td><td className="p-2">Gratis</td></>:<>
      <td className="p-2"><input aria-label={'Precio mensual '+plan.slug} className="w-28 rounded border p-2" inputMode="decimal" value={editing[plan.slug]?.month??''} onChange={e=>edit(plan.slug,'month',e.target.value)}/><span> €</span></td>
      <td className="p-2"><input aria-label={'Precio anual '+plan.slug} placeholder="Sin definir" className="w-32 rounded border p-2" inputMode="decimal" value={editing[plan.slug]?.year??''} onChange={e=>edit(plan.slug,'year',e.target.value)}/><span> €</span></td>
     </>}
     <td className="p-2">{plan.trial_days} días</td>
     <td className="p-2">{plan.slug==='free'?'Fijo':<button disabled={saving!==null} onClick={()=>void save(plan)} className="rounded-lg bg-blue-700 px-3 py-2 font-bold text-white disabled:opacity-50">{saving===plan.slug?'Guardando…':'Guardar'}</button>}</td>
    </tr>)}</tbody></table></div>
   </section>
   <section className="rounded-xl bg-white p-5 shadow-sm">
    <h2 className="text-xl font-bold">Revisión de usuarios y fundadores</h2>
    <p className="mb-4 text-sm text-slate-600">Orden de alta y jornadas distintas de los últimos 30 días. «Por revisar» significa que todavía no sabemos qué proporción de sus días reales de trabajo utilizó Tacoplan. No es una denegación del descuento.</p>
    <div className="max-h-[480px] overflow-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="sticky top-0 bg-white"><tr className="border-b"><th className="p-2">Usuario</th><th className="p-2">Alta</th><th className="p-2">Días registrados</th><th className="p-2">Estado</th></tr></thead>
    <tbody>{payload.users.map(u=><tr key={u.id} className="border-b"><td className="p-2">{u.name}</td><td className="p-2">{new Date(u.joinedAt).toLocaleDateString('es-ES')}</td><td className="p-2">{u.recordedDays30}</td><td className="p-2 text-amber-700">Por revisar</td></tr>)}</tbody></table></div>
   </section></>:null}
  </div>
 </main>;
}
