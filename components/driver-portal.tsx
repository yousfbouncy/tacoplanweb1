'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { DriverDrivingInsights } from '@/components/driver-driving-insights';
import { CalendarDays, Clock3, Truck, Wallet, ShieldCheck, LogOut, RefreshCw, ChevronDown, ChevronUp, LockKeyhole } from 'lucide-react';

type Jornada = {
 id:string;fecha_inicio:string|null;fecha_fin:string|null;created_at:string;
 hora_inicio:string|null;hora_fin:string|null;start_at:string|null;end_at:string|null;tacho_driving_min:number|null;
 lugar_inicio:string|null;lugar_fin:string|null;
 conduccion_min:number|null;duracion_jornada_min:number|null;
 descanso_anterior_min:number|null;tipo_descanso_anterior:string|null;
 dieta_importe_eur:string|null;diet_base_eur:number|null;tipo_ruta:string|null;
};
type Profile={display_name:string|null;name:string|null;base_name:string|null;base_city:string|null;onboarding_completed:boolean|null;payroll_config:unknown};
type Diets={nac_100:number|null;intl_100:number|null};
type Period='7'|'14'|'30'|'all';

const date=(v:string|null|undefined)=>{
 if(!v)return '—';
 const normalized=/^\d{4}-\d{2}-\d{2}$/.test(v)?v+'T12:00:00':v;
 const d=new Date(normalized);
 return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short',year:'numeric'}).format(d);
};
const number=(n:number)=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:1}).format(n);
const duration=(m:number)=>{const n=Math.round(m);return Math.floor(n/60)+' h '+String(n%60).padStart(2,'0')+' min';};
const money=(n:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);
const parseAmount=(v:string|null)=>{if(!v)return null;let x=v.trim().replace(/\s/g,'');if(x.includes(','))x=x.replace(/\./g,'').replace(',','.');const n=Number(x);return Number.isFinite(n)&&n>=0?n:null;};
const dayValue=(j:Jornada)=>j.fecha_inicio||j.created_at.slice(0,10);

export function DriverPortal(){
 const {user,loading:authLoading,signOut}=useAuth();
 const [fetching,setFetching]=useState(false),[error,setError]=useState('');
 const [profile,setProfile]=useState<Profile|null>(null),[diets,setDiets]=useState<Diets|null>(null),[jornadas,setJornadas]=useState<Jornada[]>([]);
 const [period,setPeriod]=useState<Period>('30'),[expanded,setExpanded]=useState<string|null>(null);
 const [logging,setLogging]=useState<'google'|'apple'|null>(null);
 const [identity,setIdentity]=useState(''),[password,setPassword]=useState(''),[passwordBusy,setPasswordBusy]=useState(false);
 const refresh=async()=>{
  if(!user)return;
  setFetching(true);setError('');
  try{
   // Las consultas usan el JWT del conductor y las políticas RLS del propio Supabase.
   const [p,d,j]=await Promise.all([
    supabase.from('profiles').select('display_name,name,base_name,base_city,onboarding_completed,payroll_config').eq('id',user.id).maybeSingle(),
    supabase.from('dietas_config').select('nac_100,intl_100').eq('user_id',user.id).maybeSingle(),
    supabase.from('jornadas').select('id,fecha_inicio,fecha_fin,hora_inicio,hora_fin,start_at,end_at,tacho_driving_min,created_at,lugar_inicio,lugar_fin,conduccion_min,duracion_jornada_min,descanso_anterior_min,tipo_descanso_anterior,dieta_importe_eur,diet_base_eur,tipo_ruta').eq('user_id',user.id).order('created_at',{ascending:false}).limit(500)
   ]);
   if(p.error)throw p.error;if(d.error && d.error.code!=='PGRST116')throw d.error;if(j.error)throw j.error;
   setProfile(p.data);setDiets(d.data);setJornadas(j.data||[]);
  }catch(e:unknown){setError(e instanceof Error?e.message:'No se han podido cargar los registros');}finally{setFetching(false);}
 };
 useEffect(()=>{if(user)void refresh();else{setProfile(null);setDiets(null);setJornadas([]);}},[user?.id]);
 const rows=useMemo(()=>{
  if(period==='all')return jornadas;
  const cutoff=Date.now()-Number(period)*86_400_000;
  return jornadas.filter(j=>{const raw=dayValue(j);const t=new Date(raw).getTime();return Number.isFinite(t)&&t>=cutoff;});
 },[jornadas,period]);
 const driving=rows.reduce((sum,j)=>sum+(j.conduccion_min||0),0);
 const working=rows.reduce((sum,j)=>sum+(j.duracion_jornada_min||0),0);
 const hasDriving=rows.some(j=>j.conduccion_min!==null);
 const hasWork=rows.some(j=>j.duracion_jornada_min!==null);
 const dietAmounts=rows.map(j=>parseAmount(j.dieta_importe_eur)??(typeof j.diet_base_eur==='number'?j.diet_base_eur:null));
 const dietCount=dietAmounts.filter(n=>n!==null).length;
 const dietTotal=dietAmounts.reduce<number>((total,value)=>total+(value||0),0);
 const login=async(provider:'google'|'apple')=>{
  setLogging(provider);setError('');
  try{
   // La portada ya se utiliza como URL autorizada del OAuth web existente.
   sessionStorage.setItem('tp_driver_portal_after_oauth','1');
   const {error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:window.location.origin+'/',skipBrowserRedirect:false}});
   if(error)throw error;
  }catch(e:unknown){sessionStorage.removeItem('tp_driver_portal_after_oauth');setError(e instanceof Error?e.message:'No se pudo iniciar sesión');setLogging(null);}
 };
 const loginWithPassword=async(e:React.FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(passwordBusy)return;setPasswordBusy(true);setError('');
  try{
   const value=identity.trim();
   if(!value||!password)throw Error('Introduce tu correo o usuario y contraseña.');
   if(value.includes('@')){
    const {error}=await supabase.auth.signInWithPassword({email:value,password});
    if(error)throw Error('Credenciales incorrectas. Comprueba el correo y la contraseña.');
   }else{
    const response=await fetch('/api/empresas/username-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:value,password,driverOnly:true})});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||'No se pudo iniciar sesión con ese usuario.');
    const {error}=await supabase.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});
    if(error)throw error;
   }
  }catch(e:unknown){setError(e instanceof Error?e.message:'No se pudo iniciar sesión');}
  finally{setPasswordBusy(false);}
 };
 if(authLoading)return <div className="mx-auto max-w-4xl px-5 py-20 text-center text-slate-500">Comprobando tu sesión…</div>;
 if(!user)return <main className="min-h-[78vh] bg-slate-50 px-4 py-12">
  <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
   <div className="bg-[#0c1931] p-7 text-center text-white"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600"><Truck className="h-7 w-7"/></div>
    <h1 className="mt-5 text-3xl font-extrabold">Mi Tacoplan</h1>
    <p className="mt-3 text-sm leading-relaxed text-slate-300">Consulta tus jornadas, tiempos registrados, descansos y dietas desde cualquier navegador.</p>
   </div>
   <div className="space-y-3 p-6"><p className="text-sm font-semibold text-slate-700">Entra con la misma cuenta que utilizas en la aplicación</p>
    <form className="space-y-3" onSubmit={loginWithPassword}>
     <label className="block text-sm font-semibold text-slate-700">Correo electrónico o nombre de usuario
      <input type="text" required autoComplete="username" value={identity} onChange={e=>setIdentity(e.target.value)} placeholder="Correo o usuario" className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-slate-900"/>
     </label>
     <label className="block text-sm font-semibold text-slate-700">Contraseña
      <input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Tu contraseña" className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-slate-900"/>
     </label>
     <button type="submit" disabled={passwordBusy||!!logging} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{passwordBusy?'Comprobando…':'Iniciar sesión'}</button>
    </form>
    <p className="text-xs text-slate-500">Puedes usar tu correo habitual. El nombre de usuario funciona cuando tu empresa te ha asignado uno en Tacoplan.</p>
    <div className="relative py-1 text-center text-xs text-slate-500">O continuar con</div>
    <button type="button" disabled={!!logging||passwordBusy} onClick={()=>void login('google')} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50"><span className="text-xl font-black text-blue-600">G</span>{logging==='google'?'Conectando…':'Continuar con Google'}</button>
    <button type="button" disabled={!!logging} onClick={()=>void login('apple')} className="flex w-full items-center justify-center gap-3 rounded-xl bg-black px-4 py-3 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"><span className="text-xl">●</span>{logging==='apple'?'Conectando…':'Continuar con Apple'}</button>
    {error?<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}
    <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0"/>Solo se muestran los datos asociados al usuario que ha iniciado sesión. Si entras con otra identidad, no se mezclan cuentas automáticamente.</p>
   </div>
  </div></main>;
 const displayName=(profile?.display_name||profile?.name||user.user_metadata?.full_name||'Conductor').trim();
 return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12"><div className="mx-auto max-w-6xl space-y-6">
  <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">ÁREA PERSONAL</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">Mi Tacoplan</h1><p className="mt-1 text-sm text-slate-500">Hola, {displayName}. Tus datos de la aplicación, también en la web.</p></div>
   <div className="flex gap-2"><button type="button" onClick={()=>void refresh()} disabled={fetching} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"><RefreshCw className={'h-4 w-4 '+(fetching?'animate-spin':'')}/>Actualizar</button><button type="button" onClick={()=>void signOut()} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700"><LogOut className="h-4 w-4"/>Salir</button></div>
  </header>
  <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Cuenta</p><p className="mt-1 break-all text-sm font-semibold text-slate-900">{user.email||'Correo oculto por el proveedor'}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Base configurada</p><p className="mt-1 text-sm font-semibold text-slate-900">{profile?.base_name||profile?.base_city||'Sin configurar'}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Configuración inicial</p><p className="mt-1 text-sm font-semibold text-slate-900">{profile?.onboarding_completed?'Completada':'Pendiente'}</p></div></div>
  {error?<div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>:null}
  <DriverDrivingInsights jornadas={jornadas} name={displayName} base={profile?.base_name||profile?.base_city||'No configurada'} reportRows={rows} reportPeriod={period==='all'?'Todos los registros cargados':'Últimos '+period+' días'} />
  <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-slate-900">Resumen de tus registros</h2><select aria-label="Periodo" value={period} onChange={e=>setPeriod(e.target.value as Period)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="7">Últimos 7 días</option><option value="14">Últimos 14 días</option><option value="30">Últimos 30 días</option><option value="all">Todos los registros cargados</option></select></div>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   {[{icon:CalendarDays,label:'Jornadas registradas',value:String(rows.length)},
   {icon:Truck,label:'Conducción anotada',value:hasDriving?duration(driving):'Sin datos'},
   {icon:Clock3,label:'Tiempo de jornada',value:hasWork?duration(working):'Sin datos'},
   {icon:Wallet,label:'Dietas registradas',value:dietCount?money(dietTotal):'Sin datos'}].map(x=><div key={x.label} className="rounded-2xl border border-slate-200 bg-white p-4"><x.icon className="h-5 w-5 text-blue-600"/><p className="mt-3 text-lg font-bold text-slate-900 sm:text-xl">{x.value}</p><p className="mt-1 text-xs text-slate-500">{x.label}</p></div>)}
  </div>
  </section>
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b px-4 py-4 sm:px-6"><h2 className="text-lg font-bold text-slate-900">Historial de jornadas</h2><p className="text-xs text-slate-500">Selecciona una jornada para consultar sus datos registrados. Se cargan hasta 500 jornadas recientes.</p></div>
   {fetching?<p className="p-8 text-sm text-slate-500">Cargando tus registros…</p>:!rows.length?<div className="p-8 text-center"><CalendarDays className="mx-auto h-10 w-10 text-slate-300"/><p className="mt-3 font-semibold text-slate-700">No hay jornadas en este periodo</p><p className="mt-1 text-sm text-slate-500">Registra tus jornadas en la aplicación Tacoplan y aparecerán aquí.</p></div>:<div className="divide-y divide-slate-100">
    {rows.slice(0,100).map(j=><div key={j.id}>
     <button type="button" onClick={()=>setExpanded(expanded===j.id?null:j.id)} className="grid w-full grid-cols-[1fr_auto_20px] items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 sm:px-6"><div><p className="text-sm font-bold text-slate-900">{date(dayValue(j))}</p><p className="mt-1 max-w-[250px] truncate text-xs text-slate-500">{j.lugar_inicio||'Inicio no registrado'} → {j.lugar_fin||'Fin no registrado'}</p></div><span className="text-xs font-semibold text-slate-700">{j.conduccion_min!==null?duration(j.conduccion_min):'—'}</span>{expanded===j.id?<ChevronUp className="h-4 w-4 text-slate-500"/>:<ChevronDown className="h-4 w-4 text-slate-500"/>}</button>
     {expanded===j.id?<div className="grid grid-cols-2 gap-3 bg-slate-50 px-4 py-4 text-xs sm:grid-cols-4 sm:px-6">{[
     ['Inicio',j.fecha_inicio||'—'],['Fin',j.fecha_fin||'—'],['Conducción',j.conduccion_min!==null?duration(j.conduccion_min):'—'],['Jornada',j.duracion_jornada_min!==null?duration(j.duracion_jornada_min):'—'],
     ['Descanso anterior',j.descanso_anterior_min!==null?duration(j.descanso_anterior_min):'—'],['Tipo de descanso',j.tipo_descanso_anterior||'—'],['Dieta',parseAmount(j.dieta_importe_eur)!==null?money(parseAmount(j.dieta_importe_eur)!):(j.diet_base_eur!==null?money(j.diet_base_eur):'—')],['Tipo de ruta',j.tipo_ruta||'—']
    ].map(([key,value])=><div key={key}><p className="text-slate-500">{key}</p><p className="mt-1 font-semibold text-slate-800">{value}</p></div>)}</div>:null}
    </div>)}
    {rows.length>100?<p className="p-4 text-center text-xs text-slate-500">Mostrando las primeras 100 jornadas del periodo. El resto sigue disponible en la aplicación.</p>:null}
   </div>}
  </section>
  <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-relaxed text-blue-900"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0"/><div>Esta web es una consulta de los registros guardados en Tacoplan, no sustituye al tacógrafo ni certifica el cumplimiento legal. Los cálculos dependen de los datos que hayas introducido y pueden no estar sincronizados todavía. Los importes mostrados son estimaciones registradas, no pagos confirmados.</div></div>
  <div className="flex flex-wrap gap-4 text-sm"><Link href="/soporte" className="font-semibold text-blue-700 hover:underline">Ayuda y soporte</Link><Link href="/" className="font-semibold text-blue-700 hover:underline">Volver a la web de Tacoplan</Link></div>
 </div></main>;
}
