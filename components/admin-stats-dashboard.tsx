'use client';
import { useEffect, useState } from 'react';
import { Activity, Bell, CalendarDays, CircleHelp, RefreshCw, Settings2, TrendingUp, Users, UserRoundCheck } from 'lucide-react';

type Day={date:string;registrations:number;jornadas:number};
type Stats={updatedAt:string;registered:number;new24h:number;new7d:number;new30d:number;active24h:number;active7d:number;active30d:number;jornadas:number;recorders:number;records7d:number;records30d:number;recorders7d:number;onboarded:number;configuredBase:number;payroll:number;pushUsers:number;daily:Day[]};
const display=(v:number)=>v.toLocaleString('es-ES');
function Metric({name,value,subtitle,Icon}:{name:string;value:number;subtitle?:string;Icon:typeof Users}){return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-600">{name}</p><Icon className="h-5 w-5 text-blue-600"/></div><p className="mt-3 text-3xl font-bold text-slate-900">{display(value)}</p>{subtitle?<p className="mt-2 text-xs text-slate-500">{subtitle}</p>:null}</div>}
export function AdminStatsDashboard(){
 const [data,setData]=useState<Stats|null>(null); const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const reload=async()=>{setLoading(true);setError('');try{const res=await fetch('/api/admin/stats',{cache:'no-store'});const json=await res.json();if(!res.ok)throw Error(json.error||'Error de consulta');setData(json);}catch(e:unknown){setError(e instanceof Error?e.message:'Error inesperado');}finally{setLoading(false);}};
 useEffect(()=>{void reload()},[]);
 const max=Math.max(1,...(data?.daily||[]).map(d=>d.jornadas));
 return <section aria-labelledby="stats-title" className="space-y-5">
 <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="stats-title" className="text-2xl font-bold text-slate-900">Estadísticas de Tacoplan</h2><p className="text-sm text-slate-500">Información agregada de usuarios y jornadas. Solo visible para administración.</p></div><button type="button" onClick={reload} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCw className={'h-4 w-4 '+(loading?'animate-spin':'')}/>Actualizar</button></div>
 {error?<div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>:null}
 {!data&&loading?<div className="rounded-xl bg-white p-8 text-slate-500">Cargando estadísticas…</div>:null}
 {data?<><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
 <Metric name="Usuarios registrados" value={data.registered} subtitle={'+ '+data.new7d+' en 7 días'} Icon={Users}/>
 <Metric name="Activos en 7 días" value={data.active7d} subtitle={data.active24h+' en las últimas 24 h'} Icon={Activity}/>
 <Metric name="Jornadas guardadas" value={data.jornadas} subtitle={data.records7d+' nuevas en 7 días'} Icon={CalendarDays}/>
 <Metric name="Han usado jornadas" value={data.recorders} subtitle={data.recorders7d+' usuarios registraron en 7 días'} Icon={UserRoundCheck}/>
 </div>
 <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
 <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><h3 className="font-bold text-slate-900">Jornadas añadidas · últimos 14 días</h3><TrendingUp className="h-5 w-5 text-blue-600"/></div><div className="mt-6 flex h-44 items-end gap-1.5" role="img" aria-label="Gráfico de barras de jornadas creadas por día">{data.daily.map(d=><div title={d.date+': '+d.jornadas+' jornadas'} key={d.date} className="group relative flex h-full min-w-0 flex-1 items-end"><div className="w-full rounded-t bg-blue-600 transition group-hover:bg-blue-400" style={{height:Math.max(2,d.jornadas/max*100)+'%'}}/><span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-slate-400">{d.date.slice(8)}</span></div>)}</div><p className="mt-9 text-xs text-slate-500">Días del mes en UTC · {data.records30d} jornadas creadas en 30 días</p></div>
 <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-900">Configuración y adopción</h3><dl className="mt-5 space-y-4">{[['Alta reciente (24 h)',data.new24h],['Altas (30 días)',data.new30d],['Activos (30 días)',data.active30d],['Configuración inicial completada',data.onboarded],['Base configurada',data.configuredBase],['Estimación nómina configurada',data.payroll],['Usuarios con push habilitado',data.pushUsers]].map(([k,v])=><div key={String(k)} className="flex justify-between gap-3 border-b pb-2 text-sm"><dt className="text-slate-600">{k}</dt><dd className="font-semibold text-slate-900">{display(Number(v))}</dd></div>)}</dl></div></div>
 <p className="flex items-center gap-2 text-xs text-slate-500"><CircleHelp className="h-4 w-4"/> Un usuario activo ha tenido actividad registrada por dispositivo. No equivale necesariamente a haber creado una jornada. Actualizado: {new Date(data.updatedAt).toLocaleString('es-ES')}.</p></>:null}
 </section>;
}
