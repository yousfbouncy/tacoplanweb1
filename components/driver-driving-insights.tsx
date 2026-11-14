'use client';

import { useEffect,useMemo,useState } from 'react';
import { Clock3,Truck,AlertTriangle,CalendarDays } from 'lucide-react';
import { DriverReportManager } from '@/components/driver-report-manager';

export type DrivingJornada={
 id:string;created_at:string;fecha_inicio:string|null;fecha_fin:string|null;hora_inicio:string|null;hora_fin:string|null;
 start_at:string|null;end_at:string|null;conduccion_min:number|null;tacho_driving_min:number|null;duracion_jornada_min:number|null;
 lugar_inicio:string|null;lugar_fin:string|null;dieta_importe_eur:string|null;diet_base_eur:number|null;
};
const WEEK_LIMIT=56*60, FORTNIGHT_LIMIT=90*60;
const weekStartUTC=(ms:number)=>{const d=new Date(ms);const day=d.getUTCDay();d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-((day+6)%7));return d.getTime();};
const mins=(n:number)=>Math.max(0,Math.floor(n/60))+' h '+String(Math.max(0,n%60)).padStart(2,'0')+' min';
const day=(j:DrivingJornada)=>/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(j.fecha_inicio||'')?j.fecha_inicio!:(j.start_at||j.created_at).slice(0,10);
const dayMs=(j:DrivingJornada)=>Date.parse(day(j)+'T00:00:00Z');
const driving=(j:DrivingJornada)=>{
 const primary=j.conduccion_min;
 if(typeof primary==='number'&&Number.isFinite(primary)&&primary>=0)return primary;
 const tacho=j.tacho_driving_min;
 return typeof tacho==='number'&&Number.isFinite(tacho)&&tacho>0?tacho:null;
};
const instant=(iso:string|null|undefined,date:string|null|undefined,time:string|null|undefined)=>{
 if(iso && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso)){
  const t=new Date(iso).getTime();if(Number.isFinite(t))return t;
 }
 if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date) && time && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)){
  const t=new Date(date+'T'+time+':00').getTime();if(Number.isFinite(t))return t;
 }
 return null;
};
function parseMoney(j:DrivingJornada){
 const raw=j.dieta_importe_eur;
 if(raw){
  let normalized=raw.trim().replace(/\s/g,'');
  if(normalized.includes(','))normalized=normalized.replace(/\./g,'').replace(',','.');
  const value=Number(normalized);
  if(Number.isFinite(value)&&value>=0)return value;
 }
 return typeof j.diet_base_eur==='number'&&Number.isFinite(j.diet_base_eur)?j.diet_base_eur:null;
}
const amount=(n:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);

export function DriverDrivingInsights({jornadas,name,base,reportRows,reportPeriod}:{
 jornadas:DrivingJornada[];name:string;base:string;reportRows:DrivingJornada[];reportPeriod:string;
}){
 const [now,setNow]=useState(()=>Date.now());

 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[]);
 const start=weekStartUTC(now),prev=start-7*86_400_000;
 const weekly=jornadas.filter(j=>{const d=dayMs(j);return Number.isFinite(d)&&d>=start&&d<=now&&d<start+7*86_400_000;});
 const fortnight=jornadas.filter(j=>{const d=dayMs(j);return Number.isFinite(d)&&d>=prev&&d<=now&&d<start+7*86_400_000;});
 const sum=(items:DrivingJornada[])=>({total:items.reduce((v,j)=>v+(driving(j)||0),0),missing:items.filter(j=>driving(j)===null).length,known:items.filter(j=>driving(j)!==null).length});
 const week=sum(weekly),two=sum(fortnight);
 const rest=useMemo(()=>{
  const completed=jornadas.map(j=>({j,t:instant(j.end_at,j.fecha_fin,j.hora_fin)})).filter(x=>x.t!==null&&x.t<=now+30_000).sort((a,b)=>b.t!-a.t!);
  if(!completed.length)return {kind:'unknown' as const};
  const last=completed[0];
  const open=jornadas.some(j=>{
   if(j.end_at||j.fecha_fin)return false;
   const t=instant(j.start_at,j.fecha_inicio,j.hora_inicio);
   return t!==null&&t<=now&&t>last.t!;
  });
  if(open)return {kind:'working' as const};
  return {kind:'rest' as const,from:last.t!,minutes:Math.max(0,Math.floor((now-last.t!)/60000))};
 },[jornadas,now]);
 const meter=(value:number,limit:number,missing:number)=>(
  <div><div className="h-2.5 overflow-hidden rounded-full bg-slate-200"><div className={'h-full rounded-full '+(value>limit?'bg-red-500':value>=limit*0.85?'bg-amber-500':'bg-blue-600')} style={{width:Math.min(100,(value/limit)*100)+'%'}}/></div>
   <p className="mt-2 text-xs text-slate-500">{mins(value)} registrados / referencia {mins(limit)}{missing>0?' · '+missing+' jornadas sin conducción anotada':''}</p>
  </div>);
 return <section className="space-y-4" aria-label="Conducción y descanso actuales">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-extrabold text-slate-900">Conducción y descanso</h2><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Según registros sincronizados</span></div>
  <div className="grid gap-3 md:grid-cols-3">
   <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="font-semibold text-slate-700">Semana actual</p><Truck className="h-5 w-5 text-blue-600"/></div>
    <p className="mt-3 text-3xl font-extrabold text-slate-900">{week.known?mins(week.total):'Sin datos'}</p><p className="mb-4 mt-1 text-xs text-slate-500">Semana de lunes a domingo, UTC</p>{meter(week.total,WEEK_LIMIT,week.missing)}</article>
   <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="font-semibold text-slate-700">Bisemanal</p><CalendarDays className="h-5 w-5 text-blue-600"/></div>
    <p className="mt-3 text-3xl font-extrabold text-slate-900">{two.known?mins(two.total):'Sin datos'}</p><p className="mb-4 mt-1 text-xs text-slate-500">Semana actual + anterior, UTC</p>{meter(two.total,FORTNIGHT_LIMIT,two.missing)}</article>
   <article className="rounded-2xl border border-blue-200 bg-[#0f2445] p-5 text-white shadow-sm"><div className="flex items-center justify-between"><p className="font-semibold text-blue-100">Descanso transcurrido</p><Clock3 className="h-5 w-5 text-blue-300"/></div>
    <p className="mt-3 text-3xl font-extrabold tabular-nums">{rest.kind==='rest'?mins(Math.floor((now-rest.from)/60000)):'—'}</p>
    <p className="mt-2 text-sm text-blue-100">{rest.kind==='rest'?'Desde el fin de la última jornada guardada':rest.kind==='working'?'Hay una jornada abierta; no se muestra descanso':'No hay un fin de jornada válido para calcularlo'}</p>
    <p className="mt-3 text-xs text-blue-200">Estimación temporal, no validación legal del descanso</p>
   </article>
  </div>
  <DriverReportManager name={name}/>
  <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>Los límites de 56 h y 90 h son referencias normativas, no saldos legales disponibles. Si faltan jornadas o minutos, los totales pueden estar incompletos. El tiempo desde el cierre no demuestra que todo el periodo se haya registrado como descanso. Comprueba siempre el tacógrafo.</p>
 </section>;
}
