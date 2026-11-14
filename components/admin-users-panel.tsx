'use client';
import { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, CalendarClock, Check, Filter, Loader2, RefreshCw, Search, Send, Users } from 'lucide-react';

type Status='new'|'zero_jornadas'|'stopped_registering'|'recording';
type AdminUser={
 id:string;name:string;joinedAt:string;lastSeenAt:string|null;lastJornadaAt:string|null;
 daysWithoutRecording:number|null;jornadas:number;base:string|null;onboarding:boolean;payroll:boolean;
 status:Status;pushAvailable:boolean;remindersEnabled:boolean;lastReminderAt:string|null;canNotify:boolean;
 message:{title:string;body:string}|null;
};
type FilterType='all'|'zero_jornadas'|'stopped_registering'|'recording'|'new';
const label:Record<Status,string>={new:'Nuevo, sin jornadas',zero_jornadas:'Nunca registró jornadas',stopped_registering:'Dejó de registrar',recording:'Registra jornadas'};
const badge:Record<Status,string>={
 new:'bg-sky-50 text-sky-700',zero_jornadas:'bg-orange-50 text-orange-800',
 stopped_registering:'bg-amber-50 text-amber-800',recording:'bg-emerald-50 text-emerald-700'
};
function date(value:string|null){return value?new Date(value).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}):'Sin datos';}
function relative(value:string|null){if(!value)return 'Sin actividad registrada';const days=Math.floor((Date.now()-new Date(value).getTime())/86_400_000);return days===0?'Hoy':days===1?'Ayer':days+' días';}

export function AdminUsersPanel(){
 const [users,setUsers]=useState<AdminUser[]>([]);
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState<FilterType>('all');
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [expanded,setExpanded]=useState<string|null>(null);
 const [sending,setSending]=useState<string|null>(null);

 const load=async()=>{setLoading(true);setError('');
  try{
   const r=await fetch('/api/admin/users',{cache:'no-store'});
   const d=await r.json() as {users?:AdminUser[];error?:string};
   if(!r.ok||!Array.isArray(d.users))throw new Error(d.error||'No se pudo cargar la lista');
   setUsers(d.users);
  }catch(e:unknown){setError(e instanceof Error?e.message:'Error inesperado');}
  finally{setLoading(false);}
 };
 useEffect(()=>{void load()},[]);
 const visible=useMemo(()=>users.filter(u=>(filter==='all'||u.status===filter)
  && (u.name+' '+(u.base||'')).toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  .sort((a,b)=>{const rank:Record<Status,number>={stopped_registering:0,zero_jornadas:1,new:2,recording:3};return rank[a.status]-rank[b.status]||b.joinedAt.localeCompare(a.joinedAt)}),
  [users,filter,query]);
 const counts=useMemo(()=>({
  all:users.length,zero_jornadas:users.filter(u=>u.status==='zero_jornadas').length,
  stopped_registering:users.filter(u=>u.status==='stopped_registering').length,
  recording:users.filter(u=>u.status==='recording').length,
  new:users.filter(u=>u.status==='new').length,
 }),[users]);
 const send=async(user:AdminUser)=>{
  if(!user.canNotify||sending)return;
  setSending(user.id);setNotice('');setError('');
  try{
   const response=await fetch('/api/admin/users/notify',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:user.id})});
   const result=await response.json() as {error?:string;message?:string;pushAccepted?:number;internalCreated?:number};
   if(!response.ok)throw new Error(result.error||'No se pudo enviar');
   setNotice('Aviso a '+user.name+': '+(result.message||'Solicitud realizada')+'.');
   setExpanded(null);
   await load();
  }catch(e:unknown){setError(e instanceof Error?e.message:'Error al enviar el aviso');}
  finally{setSending(null);}
 };
 return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="users-title">
  <div className="flex flex-wrap items-center justify-between gap-3"><div>
   <h2 id="users-title" className="flex items-center gap-2 text-xl font-bold text-slate-900"><Users className="h-5 w-5 text-blue-600"/>Usuarios y seguimiento</h2>
   <p className="mt-1 text-sm text-slate-500">Situación calculada por jornadas guardadas. Sin jornadas después de 48 h, o sin registros nuevos desde hace 7 días.</p>
  </div><button type="button" onClick={load} disabled={loading||!!sending} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"><RefreshCw className={'h-4 w-4 '+(loading?'animate-spin':'')}/>Actualizar</button></div>
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
   {[{key:'all',title:'Todos'},{key:'zero_jornadas',title:'0 jornadas'},{key:'stopped_registering',title:'Han dejado de registrar'},{key:'recording',title:'Con registros recientes'}].map(item=><button key={item.key} type="button" onClick={()=>setFilter(item.key as FilterType)} className={'rounded-xl border p-3 text-left '+(filter===item.key?'border-blue-500 bg-blue-50':'border-slate-200 bg-slate-50 hover:bg-slate-100')}><span className="block text-2xl font-bold text-slate-900">{counts[item.key as FilterType]}</span><span className="text-xs text-slate-600">{item.title}</span></button>)}
  </div>
  <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Buscar conductor</span><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nombre o base" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900"/></label>
   <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3"><Filter className="h-4 w-4 text-slate-400"/><span className="sr-only">Filtrar usuarios</span><select value={filter} onChange={e=>setFilter(e.target.value as FilterType)} className="w-full bg-white py-2.5 text-sm text-slate-700"><option value="all">Todos los usuarios</option><option value="zero_jornadas">0 jornadas (48 h o más)</option><option value="stopped_registering">Sin registrar durante 7 días</option><option value="recording">Registran jornadas</option><option value="new">Nuevos, aún sin registrar</option></select></label></div>
  {error?<p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>:null}
  {notice?<p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>:null}
  {loading?<p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Cargando usuarios…</p>:null}
  {!loading&&visible.length===0?<p className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">No hay usuarios que coincidan con el filtro.</p>:null}
  {!loading?<div className="space-y-3">
   {visible.map(u=><article key={u.id} className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
     <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-bold text-slate-900">{u.name}</h3><span className={'rounded-full px-2.5 py-1 text-xs font-semibold '+badge[u.status]}>{label[u.status]}</span></div>
      <p className="mt-1 text-xs text-slate-500">Alta: {date(u.joinedAt)} · Base: {u.base||'Sin configurar'}</p>
     </div>
     <div className="shrink-0 text-right"><p className="text-xl font-bold text-slate-900">{u.jornadas}</p><p className="text-[11px] text-slate-500">jornadas</p></div>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600 sm:grid-cols-4">
     <div><span className="block text-slate-400">Último registro</span><strong className="font-semibold text-slate-700">{relative(u.lastJornadaAt)}</strong></div>
     <div><span className="block text-slate-400">Última apertura detectada</span><strong className="font-semibold text-slate-700">{relative(u.lastSeenAt)}</strong></div>
     <div><span className="block text-slate-400">Configuración</span><strong className="font-semibold text-slate-700">{u.onboarding?'Inicial completa':'Inicial pendiente'} · {u.payroll?'Nómina sí':'Nómina no'}</strong></div>
     <div><span className="block text-slate-400">Notificación</span><strong className="font-semibold text-slate-700">{!u.remindersEnabled?'Avisos desactivados':u.pushAvailable?'Push + interna':'Solo interna'}</strong></div>
    </div>
    {(u.status==='zero_jornadas'||u.status==='stopped_registering')?<div className="mt-4 border-t border-slate-100 pt-3">
     {!u.remindersEnabled?<div className="flex items-center gap-2 text-xs text-slate-500"><BellOff className="h-4 w-4"/>El conductor tiene desactivados estos recordatorios</div>
     :u.canNotify?<><button type="button" onClick={()=>setExpanded(expanded===u.id?null:u.id)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Bell className="h-4 w-4"/>Notificar a este usuario</button>
      {expanded===u.id&&u.message?<div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
       <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Vista previa del mensaje</p><p className="mt-2 font-bold text-slate-900">{u.message.title}</p><p className="mt-1 text-sm text-slate-700">{u.message.body}</p>
       <p className="mt-2 text-xs text-slate-500">{u.pushAvailable?'Se intentará enviar una push y guardar el aviso dentro de Tacoplan.':'El aviso se guardará dentro de Tacoplan, sin push disponible.'}</p>
       <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={sending===u.id} onClick={()=>void send(u)} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4"/>{sending===u.id?'Enviando…':'Confirmar y enviar'}</button><button type="button" onClick={()=>setExpanded(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Cancelar</button></div>
      </div>:null}</>
     :<div className="flex items-center gap-2 text-xs text-slate-500"><CalendarClock className="h-4 w-4"/>Recordatorio reciente. Podrás volver a enviar tras 7 días (último: {date(u.lastReminderAt)}).</div>}
    </div>:null}
   </article>)}
  </div>:null}
  <p className="text-xs text-slate-500">El estado se basa en cuándo se guardaron jornadas, no en si el conductor ha trabajado realmente. Los avisos son manuales, individuales y con confirmación previa. Un envío aceptado por Expo no garantiza que se haya leído.</p>
 </section>;
}
