'use client';
import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, RefreshCw, Search } from 'lucide-react';

type Status='new'|'zero_jornadas'|'stopped_registering'|'recording';
type User={id:string;name:string;joinedAt:string;lastSeenAt:string|null;lastJornadaAt:string|null;daysWithoutRecording:number|null;jornadas:number;base:string|null;onboarding:boolean;payroll:boolean;status:Status;pushAvailable:boolean;remindersEnabled:boolean;lastReminderAt:string|null;canNotify:boolean;message:{title:string;body:string}|null};
type Filter='all'|'new7_recording'|'new7_zero'|'new14_recording'|'zero_jornadas'|'stopped_registering'|'recording';
const DAY=86_400_000;const PAGE=12;
const labels:Record<Status,string>={new:'Nuevo',zero_jornadas:'0 jornadas',stopped_registering:'Sin registros recientes',recording:'Con jornadas recientes'};
const styles:Record<Status,string>={new:'bg-sky-50 text-sky-700',zero_jornadas:'bg-orange-50 text-orange-800',stopped_registering:'bg-amber-50 text-amber-800',recording:'bg-emerald-50 text-emerald-700'};
const d=(v:string|null)=>v?new Date(v).toLocaleDateString('es-ES',{day:'2-digit',month:'short'}):'—';
const days=(v:string|null)=>v?Math.max(0,Math.floor((Date.now()-new Date(v).getTime())/DAY)):null;
const time=(v:string|null)=>{const n=days(v);return n===null?'Nunca':n===0?'Hoy':n===1?'Ayer':n+' días';};
export function AdminUsersPanel(){
 const [users,setUsers]=useState<User[]>([]),[filter,setFilter]=useState<Filter>('all'),[search,setSearch]=useState(''),[page,setPage]=useState(1),[opened,setOpened]=useState<string|null>(null);
 const [loading,setLoading]=useState(true),[sending,setSending]=useState<string|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=async()=>{setLoading(true);setError('');try{const r=await fetch('/api/admin/users',{cache:'no-store'});const j=await r.json();if(!r.ok||!Array.isArray(j.users))throw Error(j.error||'No se pudo consultar usuarios');setUsers(j.users);}catch(e:unknown){setError(e instanceof Error?e.message:'Error de consulta');}finally{setLoading(false);}};
 useEffect(()=>{void load()},[]);
 const newWithin=(u:User,n:number)=>new Date(u.joinedAt).getTime()>=Date.now()-n*DAY;
 const match=(u:User,f:Filter)=>f==='all'||(f==='new7_recording'&&newWithin(u,7)&&u.jornadas>0)||(f==='new7_zero'&&newWithin(u,7)&&u.jornadas===0)||(f==='new14_recording'&&newWithin(u,14)&&u.jornadas>0)||u.status===f;
 const filtered=useMemo(()=>users.filter(u=>match(u,filter)&&(u.name+' '+(u.base||'')).toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).sort((a,b)=>b.joinedAt.localeCompare(a.joinedAt)),[users,filter,search]);
 const pages=Math.max(1,Math.ceil(filtered.length/PAGE));const current=Math.min(page,pages);const list=filtered.slice((current-1)*PAGE,current*PAGE);
 const choose=(v:Filter)=>{setFilter(v);setPage(1);setOpened(null);};
 const send=async(u:User)=>{if(!u.canNotify||sending)return;setSending(u.id);setError('');setNotice('');
  try{const r=await fetch('/api/admin/users/notify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:u.id})});const j=await r.json();if(!r.ok)throw Error(j.error||'No se pudo notificar');setNotice(u.name+': '+(j.message||'Aviso enviado'));setOpened(null);await load();}
  catch(e:unknown){setError(e instanceof Error?e.message:'Error enviando recordatorio');}finally{setSending(null);}};
 const new7=users.filter(u=>newWithin(u,7));const new14=users.filter(u=>newWithin(u,14));
 return <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">Conductores</h2><p className="text-xs text-slate-500">Lista compacta · pulsa una fila para ver detalles y notificar</p></div><button type="button" onClick={load} disabled={loading} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold text-slate-700"><RefreshCw className={'h-4 w-4 '+(loading?'animate-spin':'')}/>Actualizar</button></div>
  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
  {[
    {f:'new7_recording' as Filter,n:new7.filter(u=>u.jornadas>0).length,t:'Nuevos 7 días con jornadas'},
    {f:'new7_zero' as Filter,n:new7.filter(u=>u.jornadas===0).length,t:'Nuevos 7 días sin jornadas'},
    {f:'new14_recording' as Filter,n:new14.filter(u=>u.jornadas>0).length,t:'Nuevos 14 días activos'},
    {f:'stopped_registering' as Filter,n:users.filter(u=>u.status==='stopped_registering').length,t:'Han dejado de registrar'}
  ].map(x=><button key={x.f} onClick={()=>choose(x.f)} className={'rounded-xl border p-3 text-left '+(filter===x.f?'border-blue-500 bg-blue-50':'border-slate-200 bg-slate-50')}><span className="text-2xl font-bold text-slate-900">{x.n}</span><span className="mt-1 block text-xs leading-4 text-slate-600">{x.t}</span></button>)}
  </div>
  <div className="mt-4 flex flex-col gap-2 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><span className="sr-only">Buscar usuario</span><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm" placeholder="Nombre o base"/></label><select aria-label="Filtrar usuarios" value={filter} onChange={e=>choose(e.target.value as Filter)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">Todos ({users.length})</option><option value="new7_recording">Nuevos 7d con jornadas</option><option value="new7_zero">Nuevos 7d sin jornadas</option><option value="new14_recording">Nuevos 14d con jornadas</option><option value="zero_jornadas">Sin ninguna jornada</option><option value="stopped_registering">Dejaron de registrar</option><option value="recording">Registros recientes</option><option value="new">Recién registrados</option></select></div>
  {error?<p role="alert" className="my-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}{notice?<p role="status" className="my-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>:null}
  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
  <div className="grid grid-cols-[1fr_52px_24px] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 sm:grid-cols-[1fr_140px_72px_24px]"><span>Conductor / situación</span><span className="hidden sm:block">Último registro</span><span className="text-right">Jornadas</span><span/></div>
  {loading?<p className="p-6 text-center text-sm text-slate-500">Cargando…</p>:list.length===0?<p className="p-6 text-center text-sm text-slate-500">Sin coincidencias</p>:list.map(u=><div key={u.id} className="border-t border-slate-100">
   <button type="button" onClick={()=>setOpened(opened===u.id?null:u.id)} className="grid w-full grid-cols-[1fr_52px_24px] items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 sm:grid-cols-[1fr_140px_72px_24px]" aria-expanded={opened===u.id}>
    <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{u.name}</p><span className={'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium '+styles[u.status]}>{labels[u.status]}</span><span className="ml-1 text-[10px] text-slate-400">{d(u.joinedAt)}</span></div>
    <span className="hidden text-xs text-slate-600 sm:block">{time(u.lastJornadaAt)}</span><span className="text-right text-sm font-bold text-slate-900">{u.jornadas}</span>{opened===u.id?<ChevronUp className="h-4 w-4 text-slate-500"/>:<ChevronDown className="h-4 w-4 text-slate-500"/>}
   </button>
   {opened===u.id?<div className="border-t border-slate-100 bg-slate-50 p-3 sm:p-4">
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">{[
     ['Alta',d(u.joinedAt)],['Última jornada',time(u.lastJornadaAt)],['Última actividad app',time(u.lastSeenAt)],['Base',u.base||'No configurada'],['Configuración inicial',u.onboarding?'Completa':'Pendiente'],['Nómina',u.payroll?'Configurada':'Pendiente'],['Avisos',!u.remindersEnabled?'Desactivados':u.pushAvailable?'Push habilitada':'Solo dentro de app'],['Último recordatorio',d(u.lastReminderAt)]
    ].map(([k,v])=><div key={k}><p className="text-slate-500">{k}</p><p className="mt-0.5 font-semibold text-slate-800">{v}</p></div>)}</div>
    {(u.status==='zero_jornadas'||u.status==='stopped_registering')?<div className="mt-3 border-t pt-3">
     {!u.remindersEnabled?<p className="text-xs text-slate-500">El usuario tiene desactivados los recordatorios.</p>:!u.canNotify?<p className="text-xs text-slate-500">Recordatorio reciente: esperar siete días antes de repetir.</p>:u.message?<div className="rounded-xl border border-blue-100 bg-white p-3"><p className="text-xs font-bold text-slate-900">{u.message.title}</p><p className="mt-1 text-xs text-slate-600">{u.message.body}</p><button type="button" disabled={!!sending} onClick={()=>void send(u)} className="mt-3 flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Bell className="h-4 w-4"/>{sending===u.id?'Enviando…':'Confirmar y notificar'}</button></div>:null}
    </div>:null}
   </div>:null}
  </div>)}
  </div>
  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-600"><span>{filtered.length} usuarios · página {current} de {pages}</span><div className="flex gap-2"><button aria-label="Página anterior" disabled={current===1} onClick={()=>{setPage(current-1);setOpened(null);}} className="rounded-lg border p-2 disabled:opacity-30"><ChevronLeft className="h-4 w-4"/></button><button aria-label="Página siguiente" disabled={current===pages} onClick={()=>{setPage(current+1);setOpened(null);}} className="rounded-lg border p-2 disabled:opacity-30"><ChevronRight className="h-4 w-4"/></button></div></div>
  <p className="mt-3 text-[11px] leading-relaxed text-slate-500">«Sin jornadas» significa que no se han guardado jornadas, no que no se haya instalado la app. El registro de jornadas no equivale al tiempo realmente trabajado.</p>
 </section>;
}
