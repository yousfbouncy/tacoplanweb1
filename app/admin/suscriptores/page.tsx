'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
type Grant={plan:'plus'|'pro';enabled:boolean;reason:string|null;updated_at:string};
type Subscription={price_slug:string;status:string;trial_ends_at:string|null;current_period_end:string|null};
type Person={id:string;name:string;email:string;created_at:string;subscription:Subscription|null;grant:Grant|null;
trial_override:'automatic'|'disabled'|'allowed';activity_first:string|null;activity_last:string|null;activity_days:number;activity_days30:number;trial_expired_by_usage:boolean};
type State={control:{billing_enabled:boolean;restrictions_enabled:boolean};users:Person[];summary:{total:number;subscribed:number;complimentary:number}};
const date=(s:string|null|undefined)=>s?new Date(s).toLocaleDateString('es-ES'):'—';
export default function SubscriberAdmin(){
 const [data,setData]=useState<State|null>(null),[busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [query,setQuery]=useState(''),[show,setShow]=useState('all');
 const fetchData=async()=>{
  setError('');
  try{const r=await fetch('/api/admin/subscribers',{credentials:'same-origin',cache:'no-store'});const j=await r.json();if(!r.ok)throw Error(j.error||'No se pudo cargar');setData(j);}
  catch(e){setError(e instanceof Error?e.message:'Error de conexión');}
 };
 useEffect(()=>{void fetchData();},[]);
 const visible=useMemo(()=>data?.users.filter(u=>{
  const match=(u.name+' '+u.email).toLowerCase().includes(query.trim().toLowerCase());
  return match&&(show==='all'||show==='paid'&&['trialing','active'].includes(u.subscription?.status||'')||show==='gift'&&u.grant?.enabled===true||show==='free'&&!u.grant?.enabled&&!['trialing','active'].includes(u.subscription?.status||'')||show==='expired'&&u.trial_expired_by_usage||show==='blocked'&&u.trial_override==='disabled');
 })||[],[data,query,show]);
 const toggle=async(enabled:boolean)=>{
  if(enabled&&!window.confirm('¿Activar restricciones de Plus y Pro para los usuarios sin suscripción o acceso gratuito? Los datos y jornadas se conservarán.'))return;
  setBusy('mode');setError('');setMessage('');
  try{
   const r=await fetch('/api/admin/subscribers',{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'restrictions',enabled,confirmed:true})});
   const j=await r.json();if(!r.ok)throw Error(j.error||'No se pudo cambiar');
   setData(s=>s?{...s,control:j.control}:s);setMessage(enabled?'Restricciones activadas.':'Modo gratuito activado para todos.');
  }catch(e){setError(e instanceof Error?e.message:'Error');}finally{setBusy('');}
 };
 const grant=async(u:Person,plan:'plus'|'pro'|null)=>{
  if(plan===null&&!window.confirm('¿Retirar el acceso gratuito a '+u.name+'? Si las restricciones están activadas, usará su suscripción real o el plan Gratis. No cancela cargos de Stripe.'))return;
  setBusy(u.id);setError('');setMessage('');
  try{
   const r=await fetch('/api/admin/subscribers',{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'grant',user_id:u.id,plan:plan||u.grant?.plan||'pro',enabled:plan!==null})});
   const j=await r.json();if(!r.ok)throw Error(j.error||'No se pudo guardar');
   setData(prev=>prev?{...prev,users:prev.users.map(p=>p.id===u.id?{...p,grant:j.grant}:p),summary:{...prev.summary,complimentary:prev.users.filter(p=>p.id===u.id?j.grant.enabled:p.grant?.enabled).length}}:prev);
   setMessage('Acceso actualizado para '+u.name+'. '+(u.subscription?'La suscripción de Stripe no ha cambiado.':''));
  }catch(e){setError(e instanceof Error?e.message:'Error');}finally{setBusy('');}
 };
 const setTrial=async(u:Person,mode:'automatic'|'disabled'|'allowed')=>{
  setBusy(u.id);setError('');setMessage('');
  try{
   const r=await fetch('/api/admin/subscribers',{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'trial_override',user_id:u.id,trial_mode:mode})});
   const j=await r.json();if(!r.ok)throw Error(j.error||'No se pudo guardar');
   setData(prev=>prev?{...prev,users:prev.users.map(p=>p.id===u.id?{...p,trial_override:j.trial_override.trial_mode}:p)}:prev);
   setMessage('Prueba gratuita actualizada para '+u.name+'. Se aplicará en su siguiente contratación.');
  }catch(e){setError(e instanceof Error?e.message:'Error guardando prueba');}finally{setBusy('');}
 };
 const usersExpired=data?.users.filter(u=>u.trial_expired_by_usage).length||0;
 const usersBlocked=data?.users.filter(u=>u.trial_override==='disabled').length||0;
 return <main className="min-h-screen bg-slate-50 px-4 py-9 text-slate-900"><div className="mx-auto max-w-6xl space-y-6">
  <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-extrabold">Suscriptores</h1><p className="text-sm text-slate-600">Gestiona planes, accesos gratuitos y cuándo aplicar las restricciones.</p></div><Link href="/admin/planes" className="rounded-lg border bg-white px-4 py-2 text-sm font-bold text-blue-700">Editar precios</Link></header>
  {error?<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>:null}
  {message?<p role="status" className="rounded-lg bg-green-50 p-3 text-green-800">{message}</p>:null}
  {data?<><section className="rounded-2xl border bg-white p-5">
   <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold">{data.control.restrictions_enabled?'Restricciones activas':'Tacoplan gratis para todos'}</h2><p className="mt-1 max-w-xl text-sm text-slate-600">{data.control.restrictions_enabled?'Se aplica el plan contratado o concedido a cada conductor.':'Todas las funciones siguen disponibles aunque el usuario no esté suscrito. No se borran datos.'}</p></div>
   <button disabled={!!busy} onClick={()=>void toggle(!data.control.restrictions_enabled)} className={'rounded-xl px-5 py-3 font-bold text-white disabled:opacity-50 '+(data.control.restrictions_enabled?'bg-slate-700':'bg-blue-700')}>{data.control.restrictions_enabled?'Desactivar restricciones · volver a gratis':'Activar restricciones por plan'}</button></div>
   <p className="mt-3 text-xs text-slate-500">La contratación general tiene su propio ajuste (actualmente {data.control.billing_enabled?'activada':'desactivada'}). Las excepciones gratuitas no generan cargos y conceder una excepción no cancela pagos existentes.</p>
  </section>
  <div className="grid gap-3 sm:grid-cols-5">{[['Conductores',data.summary.total],['Suscripciones activas o en prueba',data.summary.subscribed],['Prueba vencida por antigüedad',usersExpired],['Prueba excluida manualmente',usersBlocked],['Accesos gratuitos concedidos',data.summary.complimentary]].map(([label,n])=><div key={label} className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-600">{label}</p><p className="text-2xl font-bold">{n}</p></div>)}</div>
  <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
   <h2 className="font-bold text-blue-950">Control de pruebas gratuitas</h2>
   <p className="mt-1">Automática: sin prueba si han pasado 30 días o más entre la primera y la última jornada registrada. No exige registrar jornadas los días de descanso. El selector «Sin prueba gratis» tiene prioridad; «Permitir prueba» solo funciona si no la utilizó anteriormente.</p>
   <p className="mt-1">Los conductores con jornadas frecuentes aparecen con sus días reales; no se presume un porcentaje del 70 % de días trabajados sin verificar sus descansos.</p>
  </section>
  <section className="rounded-2xl border bg-white p-4"><div className="mb-4 flex flex-wrap gap-3"><input aria-label="Buscar usuario" placeholder="Buscar nombre o correo…" value={query} onChange={e=>setQuery(e.target.value)} className="min-w-[230px] flex-1 rounded-lg border p-3"/><select aria-label="Filtrar suscriptores" value={show} onChange={e=>setShow(e.target.value)} className="rounded-lg border p-3"><option value="all">Todos</option><option value="paid">Con suscripción</option><option value="gift">Gratis por Admin</option><option value="free">Sin suscripción</option><option value="expired">Más de 30 días registrando</option><option value="blocked">Prueba desactivada manualmente</option></select><button onClick={()=>void fetchData()} className="rounded-lg border px-4">Actualizar</button></div>
  <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Conductor</th><th className="p-3">Actividad / antigüedad</th><th className="p-3">Prueba gratuita</th><th className="p-3">Stripe</th><th className="p-3">Acceso gratis de Admin</th><th className="p-3">Cambiar acceso</th></tr></thead><tbody>{visible.map(u=><tr key={u.id} className="border-b last:border-0"><td className="p-3"><p className="font-bold">{u.name}</p><p className="text-xs text-slate-500">{u.email||'Sin correo'} · alta {date(u.created_at)}</p></td><td className="p-3"><p className="font-semibold">{u.activity_days} días de jornadas</p><p className="text-xs text-slate-500">{u.activity_first?'Desde '+date(u.activity_first):'Sin jornadas'} · {u.activity_days30} días en últimos 30</p></td><td className="p-3">
  <p className={'mb-2 text-xs font-semibold '+(u.trial_override==='disabled'||u.trial_override==='automatic'&&u.trial_expired_by_usage?'text-amber-700':'text-green-700')}>
   {u.trial_override==='disabled'?'Bloqueada por Admin':u.trial_override==='allowed'?'Permitida por Admin':u.trial_expired_by_usage?'Terminada por antigüedad':'Automática'}
  </p>
  <select aria-label={'Prueba gratuita de '+u.name} disabled={!!busy} value={u.trial_override} onChange={e=>void setTrial(u,e.target.value as Person['trial_override'])} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs">
   <option value="automatic">Automática por jornadas</option><option value="disabled">Sin prueba gratis</option><option value="allowed">Permitir prueba (si no usada)</option>
  </select>
 </td><td className="p-3"><p className="font-semibold">{u.subscription?.price_slug||'Gratis'}</p><p className="text-xs text-slate-500">{u.subscription?.status||'Sin suscripción'}</p>{u.subscription?.trial_ends_at?<p className="text-xs">Prueba hasta {date(u.subscription.trial_ends_at)}</p>:null}</td><td className="p-3">{u.grant?.enabled?<span className="font-bold text-green-700">{u.grant.plan.toUpperCase()} gratis</span>:'Sin excepción'}</td><td className="p-3"><div className="flex flex-wrap gap-2"><button disabled={!!busy} onClick={()=>void grant(u,'plus')} className="rounded-lg border border-blue-200 px-3 py-2 font-semibold text-blue-700 disabled:opacity-50">Plus gratis</button><button disabled={!!busy} onClick={()=>void grant(u,'pro')} className="rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white disabled:opacity-50">Pro gratis</button>{u.grant?.enabled?<button disabled={!!busy} onClick={()=>void grant(u,null)} className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700 disabled:opacity-50">Retirar</button>:null}</div></td></tr>)}</tbody></table></div>
  {!visible.length?<p className="p-6 text-center text-slate-500">No hay resultados para este filtro.</p>:null}</section></>:<p>Cargando suscriptores…</p>}
 </div></main>;
}
