'use client';
import { useEffect,useState } from 'react';
import { RefreshCw } from 'lucide-react';
type Person={user_id:string;nombre:string;ultima_actividad:string|null;jornadas:number};
type Shift={id:string;user_id:string;nombre:string;inicio:string|null;fin:string|null;fecha_fin:string|null;abierta:boolean};
type DailyStats={date:string;updatedAt:string;activeUsers:number;startedUsers:number;closedShifts:number;openShifts:number;activityHistoryComplete:boolean;users:Person[];shifts:Shift[]};
function todayMadrid(){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>p.find(x=>x.type===k)?.value).join('-');}
function stepDate(date:string,step:number){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+step);return d.toISOString().slice(0,10);}
export function AdminDailyActivity(){
 const [date,setDate]=useState(todayMadrid),[data,setData]=useState<DailyStats|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{
   let alive=true;let controller:AbortController|null=null;
   const load=async(initial:boolean)=>{
     if(controller)controller.abort();
     const request=new AbortController();controller=request;
     if(initial){setLoading(true);setData(null);}setError('');
     try{const res=await fetch('/api/admin/daily-activity?date='+encodeURIComponent(date),{cache:'no-store',signal:request.signal});const body=await res.json();if(!res.ok)throw Error(body.error||'Error de consulta');if(alive&&!request.signal.aborted)setData(body);}
     catch(e){if(alive&&!request.signal.aborted)setError(e instanceof Error?e.message:'Error de consulta');}
     finally{if(alive&&!request.signal.aborted)setLoading(false);}
   };
   void load(true);
   const timer=setInterval(()=>{if(document.visibilityState==='visible')void load(false);},30000);
   return()=>{alive=false;controller?.abort();clearInterval(timer);};
 },[date,revision]);
 const without=data?.users.filter(u=>u.jornadas===0)||[];
 const metrics=data?[['Usuarios activos',data.activeUsers,'text-emerald-600'],['Han iniciado jornada',data.startedUsers,'text-slate-900'],['Jornadas cerradas',data.closedShifts,'text-slate-900'],['Jornadas abiertas',data.openShifts,'text-amber-600']] as const:[];
 return <section className="space-y-5" aria-label="Actividad diaria">
 <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold text-slate-900">Usuarios activos en Tacoplan</h2><p className="text-sm text-slate-500">Actividad diaria · hora de España peninsular</p></div>
 <button type="button" onClick={()=>setRevision(v=>v+1)} disabled={loading} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"><RefreshCw className={'h-4 w-4 '+(loading?'animate-spin':'')}/>Actualizar</button></div>
 <div className="flex flex-wrap items-center gap-2"><button type="button" className="rounded-lg border bg-white px-3 py-2" aria-label="Día anterior" onClick={()=>setDate(stepDate(date,-1))}>‹</button><input aria-label="Fecha" type="date" max={todayMadrid()} value={date} onChange={e=>{if(e.target.value&&e.target.value<=todayMadrid())setDate(e.target.value);}} className="rounded-lg border bg-white px-3 py-2 text-sm"/><button type="button" className="rounded-lg border bg-white px-3 py-2 disabled:opacity-40" disabled={date>=todayMadrid()} aria-label="Día siguiente" onClick={()=>setDate(stepDate(date,1))}>›</button><button type="button" className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold" onClick={()=>setDate(todayMadrid())}>Hoy</button></div>
 {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
 {loading&&!data&&<p className="rounded-xl bg-white p-6 text-slate-500">Cargando estadísticas…</p>}
 {data&&<>
 <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(([label,value,color])=><div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-sm font-medium text-slate-600">{label}</p><p className={'mt-2 text-3xl font-bold tabular-nums sm:text-4xl '+color}>{value}</p></div>)}</div>
 {!data.activityHistoryComplete&&<p className="text-xs text-slate-500">La actividad histórica sin jornada puede ser parcial antes del 26/11/2026.</p>}
 <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="mb-3 text-lg font-bold">Usuarios que han registrado jornada</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-500"><tr className="border-b"><th className="py-2 pr-3">Usuario</th><th className="py-2 text-right">Inicio</th><th className="py-2 text-right">Fin</th></tr></thead><tbody>{data.shifts.map(s=><tr key={s.id} className="border-b last:border-0"><td className="py-3 pr-3">{s.nombre}</td><td className="py-3 text-right tabular-nums">{s.inicio||'—'}</td><td className={'py-3 text-right tabular-nums '+(s.abierta?'font-medium text-amber-600':'')}>{s.abierta?'Abierta':(s.fin||'—')+(s.fecha_fin&&s.fecha_fin!==date?' · '+s.fecha_fin.slice(8)+'/'+s.fecha_fin.slice(5,7):'')}</td></tr>)}</tbody></table>{!data.shifts.length&&<p className="py-4 text-sm text-slate-500">Sin jornadas registradas.</p>}</div></div>
 <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="mb-3 text-lg font-bold">Activos sin iniciar jornada ({without.length})</h3><table className="w-full text-left text-sm"><thead className="text-slate-500"><tr className="border-b"><th className="py-2 pr-3">Usuario</th><th className="py-2 text-right">Última actividad</th></tr></thead><tbody>{without.map(u=><tr key={u.user_id} className="border-b last:border-0"><td className="py-3 pr-3">{u.nombre}</td><td className="py-3 text-right tabular-nums">{u.ultima_actividad||'—'}</td></tr>)}</tbody></table>{!without.length&&<p className="py-4 text-sm text-slate-500">Sin usuarios en este grupo.</p>}</div>
 <p className="text-xs text-slate-500">Activos: usuarios únicos con actividad, sincronización o jornadas iniciadas o cerradas en la fecha. Los totales de jornadas corresponden a las iniciadas ese día y se actualizan al cerrarlas, incluso al día siguiente. Actualizado: {new Date(data.updatedAt).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})}.</p></>}
 </section>;
}
