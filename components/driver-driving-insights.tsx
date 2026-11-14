'use client';

import { useEffect,useMemo,useState } from 'react';
import { Clock3,Truck,Share2,Download,AlertTriangle,CalendarDays,RefreshCw } from 'lucide-react';
import { buildDriverReportPdf } from '@/lib/driver-report-pdf';

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
 return typeof tacho==='number'&&Number.isFinite(tacho)&&tacho>=0?tacho:null;
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
 if(raw){const value=Number(raw.trim().replace(/\s/g,'').replace(/\./g,'').replace(',','.'));if(Number.isFinite(value)&&value>=0)return value;}
 return typeof j.diet_base_eur==='number'&&Number.isFinite(j.diet_base_eur)?j.diet_base_eur:null;
}
const amount=(n:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);

export function DriverDrivingInsights({jornadas,name,base,reportRows,reportPeriod}:{
 jornadas:DrivingJornada[];name:string;base:string;reportRows:DrivingJornada[];reportPeriod:string;
}){
 const [now,setNow]=useState(()=>Date.now());
 const [sharing,setSharing]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[]);
 const start=weekStartUTC(now),prev=start-7*86_400_000;
 const weekly=jornadas.filter(j=>{const d=dayMs(j);return Number.isFinite(d)&&d>=start&&d<start+7*86_400_000;});
 const fortnight=jornadas.filter(j=>{const d=dayMs(j);return Number.isFinite(d)&&d>=prev&&d<start+7*86_400_000;});
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
 const periodRows=reportRows.filter(j=>{const d=dayMs(j);return Number.isFinite(d)&&d<=now;}).sort((a,b)=>dayMs(b)-dayMs(a));
 const report=()=>{
  const today=new Date();
  const allDriving=periodRows.reduce((v,j)=>v+(driving(j)||0),0);
  const work=periodRows.reduce((v,j)=>v+(j.duracion_jornada_min||0),0);
  const diets=periodRows.reduce((v,j)=>v+(parseMoney(j)||0),0);
  const pdf=buildDriverReportPdf({
   name,base,period:reportPeriod,generatedAt:today.toLocaleString('es-ES'),
   week:week.total,fortnight:two.total,
   weekMissing:week.missing,fortnightMissing:two.missing,
   rest:rest.kind==='rest'?mins(rest.minutes):rest.kind==='working'?'Jornada posiblemente abierta':'Sin fin de jornada comprobable',
   count:periodRows.length,driving:allDriving,work,diets,
   rows:periodRows.slice(0,75).map(j=>({
    date:day(j),start:j.lugar_inicio||'—',end:j.lugar_fin||'—',
    driving:driving(j),working:j.duracion_jornada_min,diet:parseMoney(j)
   }))
  });
  return new File([pdf],'Tacoplan-informe-'+today.toISOString().slice(0,10)+'.pdf',{type:'application/pdf'});
 };
 const download=(file:File)=>{const url=URL.createObjectURL(file);const link=document.createElement('a');link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30_000);};
 const share=async()=>{
  if(sharing)return;
  setSharing(true);setMessage('');
  try{
   const file=report();
   if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:'Informe Tacoplan',text:'Informe de jornadas registrado por el conductor en Tacoplan.'});setMessage('Informe preparado para compartir.');}
    catch(e:unknown){if(e instanceof Error&&e.name==='AbortError')setMessage('Compartir cancelado.');else{download(file);setMessage('La opción de compartir no está disponible: se ha descargado el PDF.');}}
   }else{download(file);setMessage('PDF descargado. Puedes enviarlo a tu empresa por correo o WhatsApp.');}
  }catch(e){console.error('Driver report',e);setMessage('No se pudo preparar el informe. Prueba a actualizar la página.');}
  finally{setSharing(false);}
 };
 const downloadReport=()=>{try{download(report());setMessage('Informe PDF descargado.');}catch(e){console.error(e);setMessage('No se pudo generar el PDF.');}};
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
  <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
   <div><h3 className="font-bold text-slate-900">Informe para tu empresa</h3><p className="mt-1 text-sm text-slate-600">Jornadas, conducción, descanso y dietas del periodo seleccionado. PDF generado en tu dispositivo.</p></div>
   <div className="flex flex-wrap gap-2"><button type="button" onClick={downloadReport} className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-800"><Download className="h-4 w-4"/>Descargar PDF</button>
    <button type="button" onClick={()=>void share()} disabled={sharing} className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><Share2 className="h-4 w-4"/>{sharing?'Preparando…':'Compartir con empresa'}</button></div>
  </div>
  {message?<p role="status" className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>:null}
  <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>Los límites de 56 h y 90 h son referencias normativas, no saldos legales disponibles. Si faltan jornadas o minutos, los totales pueden estar incompletos. El tiempo desde el cierre no demuestra que todo el periodo se haya registrado como descanso. Comprueba siempre el tacógrafo.</p>
 </section>;
}
