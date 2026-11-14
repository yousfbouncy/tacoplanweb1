'use client';
import {useEffect,useMemo,useState} from 'react';
import {CalendarDays,ChevronDown,ChevronUp,Download,ShieldCheck,Truck,RefreshCw,Clock3,MapPin,Wallet} from 'lucide-react';
import {REPORT_FIELD_OPTIONS,SharedReportData,ReportField,labelValue,money,hours} from '@/lib/report-sharing';
import {saveReportPdf} from '@/lib/selected-report-pdf';
const label=Object.fromEntries(REPORT_FIELD_OPTIONS.map(f=>[f.key,f.label])) as Record<ReportField,string>;
const date=(v:string)=>v.split('-').reverse().join('/');
const isSunday=(x:string|null)=>/DOMINGO/i.test(x||'');
const isHoliday=(x:string|null)=>/FESTIV|FIESTA|HOLIDAY/i.test(x||'');
const plusTotal=(r:SharedReportData['rows'][number])=>(r.dayExtra||0)+r.plusItems.reduce((s,x)=>s+(x.amount||0),0);
type DietCategory='Nacional'|'Internacional'|'Regional';
const DIET_CATEGORIES:DietCategory[]=['Nacional','Internacional','Regional'];
const dietCategory=(value:string|null):DietCategory|null=>{
 const text=(value||'').trim().toUpperCase();
 if(text.includes('INTERNACIONAL')||text.includes('INTERNATIONAL'))return 'Internacional';
 if(text.includes('NACIONAL')||text.includes('NATIONAL'))return 'Nacional';
 if(text.includes('REGIONAL'))return 'Regional';
 return null;
};
export function CompanyReport({token}:{token:string}){
 const [report,setReport]=useState<SharedReportData|null>(null),[expires,setExpires]=useState('');
 const [busy,setBusy]=useState(true),[error,setError]=useState('');
 const [from,setFrom]=useState(''),[to,setTo]=useState('');
 const [opened,setOpened]=useState<string|null>(null),[page,setPage]=useState(1);
 const [dietFilter,setDietFilter]=useState<DietCategory|null>(null);
 const refresh=async()=>{
  setBusy(true);setError('');
  try{
   const res=await fetch('/api/company-report/'+encodeURIComponent(token),{cache:'no-store',referrerPolicy:'no-referrer'});
   const json=await res.json();if(!res.ok)throw Error(json.error||'No se pudo consultar este informe');
   setReport(json.report);setExpires(json.expiresAt);
   setFrom(v=>v&&v>=json.report.from&&v<=json.report.to?v:json.report.from);
   setTo(v=>v&&v>=json.report.from&&v<=json.report.to?v:json.report.to);
  }catch(e:unknown){setReport(null);setError(e instanceof Error?e.message:'Enlace no disponible');}finally{setBusy(false);}
 };
 useEffect(()=>{void refresh()},[token]);
 const rows=useMemo(()=>report?.rows.filter(r=>r.date>=from&&r.date<=to)||[],[report,from,to]);
 const filteredRows=useMemo(()=>dietFilter?rows.filter(r=>dietCategory(r.dietType)===dietFilter):rows,[rows,dietFilter]);
 const pages=Math.max(1,Math.ceil(filteredRows.length/10));
 const shown=filteredRows.slice((Math.min(page,pages)-1)*10,Math.min(page,pages)*10);
 const fields=report?.fields.filter(f=>f!=='driver_name')||[];
 const allowed=(f:ReportField)=>!!report?.fields.includes(f);
 const totals=useMemo(()=>{
  const countDiets=rows.filter(r=>(allowed('diet_type')&&!!r.dietType)||(allowed('diet_amount')&&r.dietAmount!==null)).length;
  const dietBreakdown=Object.fromEntries(DIET_CATEGORIES.map(category=>[category,{
   count:0,amount:0,amountCount:0
  }])) as Record<DietCategory,{count:number;amount:number;amountCount:number}>;
  let unclassified=0,unclassifiedAmount=0;
  if(allowed('diet_type')){
   for(const row of rows){
    if(!row.dietType && !(allowed('diet_amount')&&row.dietAmount!==null))continue;
    const kind=dietCategory(row.dietType);
    if(kind){
     dietBreakdown[kind].count++;
     if(allowed('diet_amount')&&row.dietAmount!==null){
      dietBreakdown[kind].amount+=row.dietAmount;
      dietBreakdown[kind].amountCount++;
     }
    }else{
     unclassified++;
     if(allowed('diet_amount')&&row.dietAmount!==null)unclassifiedAmount+=row.dietAmount;
    }
   }
  }
  const sunday=rows.filter(r=>isSunday(r.dayFlag)).length;
  const holiday=rows.filter(r=>isHoliday(r.dayFlag)).length;
  const extra=rows.filter(r=>r.plusItems.length>0||(r.dayExtra!==null&&r.dayExtra>0)).length;
  return {countDiets,dietBreakdown,unclassified,unclassifiedAmount,sunday,holiday,extra,amountDiets:rows.reduce((sum,r)=>sum+(r.dietAmount||0),0),amountExtras:rows.reduce((sum,r)=>sum+plusTotal(r),0)};
 },[rows,report]);
 const chooseDiet=(category:DietCategory)=>{
  setDietFilter(current=>current===category?null:category);
  setPage(1);setOpened(null);
  requestAnimationFrame(()=>document.getElementById('company-history')?.scrollIntoView({behavior:'smooth',block:'start'}));
 };
 const clearDiet=()=>{setDietFilter(null);setPage(1);setOpened(null);};
 const download=()=>{if(!report)return;saveReportPdf({...report,from,to,rows:filteredRows,generatedAt:new Date().toISOString()});};
 const periodLabel=(r:SharedReportData['rows'][number])=>{
  const start=date(r.date)+(r.startTime?' '+r.startTime:' · Sin hora');
  const finish=r.endDate?date(r.endDate)+(r.endTime?' '+r.endTime:' · Sin hora'):'Fin sin registrar';
  return {start,finish};
 };
 return <main className="min-h-screen bg-[#081224] px-3 py-6 text-white sm:px-6 sm:py-10"><div className="mx-auto max-w-5xl space-y-5">
  <header className="rounded-2xl border border-[#29456a] bg-gradient-to-br from-[#122a4e] to-[#09172d] p-5 sm:p-8">
   <div className="flex items-center gap-2 text-sm font-extrabold tracking-wider text-blue-300"><Truck className="h-6 w-6"/>TACOPLAN</div>
   <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Informe de actividad</h1>
   <p className="mt-2 text-sm text-slate-300">Historial compartido por el conductor. Solo puedes consultar los datos autorizados.</p>
   {report?<p className="mt-3 text-xs text-blue-200">Periodo autorizado: {date(report.from)} – {date(report.to)} · Acceso hasta {new Date(expires).toLocaleString('es-ES')}</p>:null}
  </header>
  {busy?<div className="rounded-xl bg-white/10 p-8 text-center text-slate-300">Comprobando acceso autorizado…</div>:null}
  {error?<section className="rounded-xl border border-red-500/40 bg-[#1d263b] p-6"><h2 className="font-bold text-red-300">No se puede consultar el informe</h2><p className="mt-2 text-sm text-slate-200">{error}</p><p className="mt-2 text-xs text-slate-400">Solicita al conductor un nuevo enlace si ha caducado o lo ha desactivado.</p></section>:null}
  {report&&!busy?<>
   <section className="rounded-2xl border border-[#2c4263] bg-[#12233f] p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
     <div><h2 className="text-lg font-bold">{report.driverName||'Informe compartido por un conductor'}</h2><p className="mt-1 text-xs text-slate-400">Datos autorizados por el conductor</p></div>
     <div className="flex gap-2"><button type="button" onClick={()=>void refresh()} className="rounded-xl border border-[#395477] p-2" aria-label="Actualizar"><RefreshCw className="h-5 w-5"/></button><button onClick={download} type="button" className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"><Download className="h-4 w-4"/>Descargar PDF</button></div>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
     <label className="text-xs font-bold text-slate-300">Desde<input type="date" min={report.from} max={to} value={from} onChange={e=>{setFrom(e.target.value);setPage(1);}} className="mt-1 w-full rounded-lg border border-[#3a5579] bg-[#0c1a32] p-2 text-sm text-white [color-scheme:dark]"/></label>
     <label className="text-xs font-bold text-slate-300">Hasta<input type="date" min={from} max={report.to} value={to} onChange={e=>{setTo(e.target.value);setPage(1);}} className="mt-1 w-full rounded-lg border border-[#3a5579] bg-[#0c1a32] p-2 text-sm text-white [color-scheme:dark]"/></label>
     <div className="col-span-2 rounded-xl bg-[#1c3e69] p-3 sm:col-span-1"><p className="text-xs text-blue-200">Jornadas</p><p className="mt-1 text-2xl font-extrabold">{rows.length}</p></div>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
     {(allowed('diet_type')||allowed('diet_amount'))?<div className="col-span-2 rounded-xl border border-[#344d70] bg-[#0b1b33] p-4 sm:col-span-4">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-200">Dietas registradas</p><p className="text-2xl font-extrabold text-white">{totals.countDiets}</p></div>
      {allowed('diet_amount')?<p className="mt-1 text-right text-sm font-semibold text-emerald-300">Total: {money(totals.amountDiets)}</p>:null}
      {allowed('diet_type')?<div className="mt-3 grid grid-cols-3 gap-2">
        {DIET_CATEGORIES.map(category=><button type="button" key={category} onClick={()=>chooseDiet(category)} aria-pressed={dietFilter===category} aria-label={'Mostrar solo jornadas con dieta '+category.toLowerCase()} className={'min-w-0 rounded-xl border p-2.5 text-left transition sm:p-3 '+(dietFilter===category?'border-blue-400 bg-[#24528a] ring-2 ring-blue-400':'border-[#344d70] bg-[#152b4a] hover:border-blue-400 hover:bg-[#203d63]')}>
          <p className="text-[11px] font-medium text-slate-300 sm:text-xs">{category}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-white">{totals.dietBreakdown[category].count}</p>
          {allowed('diet_amount')&&totals.dietBreakdown[category].amountCount>0?<p className="mt-1 text-xs font-semibold text-emerald-300">{money(totals.dietBreakdown[category].amount)}</p>:null}
          <p className="mt-1 text-[10px] text-blue-200">{dietFilter===category?'Filtro activo':'Ver viajes'}</p>
        </button>)}
      </div>:null}
      {allowed('diet_type')&&totals.unclassified>0?<p className="mt-3 text-xs text-slate-400">Sin tipo identificado: {totals.unclassified}{allowed('diet_amount')?' · '+money(totals.unclassifiedAmount):''}</p>:null}
      {!allowed('diet_type')?<p className="mt-2 text-xs text-slate-400">El conductor no ha autorizado mostrar los tipos de dieta.</p>:null}
    </div>:null}
     {allowed('day_flags')?<><div className="rounded-xl border border-[#344d70] bg-[#0b1b33] p-3"><p className="text-xs text-slate-400">Domingos marcados</p><p className="mt-1 text-xl font-bold">{totals.sunday}</p></div><div className="rounded-xl border border-[#344d70] bg-[#0b1b33] p-3"><p className="text-xs text-slate-400">Festivos marcados</p><p className="mt-1 text-xl font-bold">{totals.holiday}</p></div></>:null}
     {(allowed('pluses')||allowed('plus_amount'))?<div className="rounded-xl border border-[#344d70] bg-[#0b1b33] p-3"><p className="text-xs text-slate-400">Jornadas con pluses</p><p className="mt-1 text-xl font-bold">{totals.extra}</p>{allowed('plus_amount')?<p className="mt-1 text-sm text-amber-300">{money(totals.amountExtras)}</p>:null}</div>:null}
    </div>
    <div className="mt-4 flex flex-wrap gap-1.5">{fields.map(f=><span key={f} className="rounded-full bg-[#223956] px-3 py-1 text-xs text-blue-100">{label[f]}</span>)}</div>
   </section>
   <section id="company-history" className="space-y-3 scroll-mt-24">
    <div className="flex flex-wrap items-center justify-between gap-3 px-1"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-blue-400"/><div><h2 className="text-xl font-extrabold">Historial de viajes</h2><p className="mt-1 text-xs text-slate-400">{dietFilter?'Mostrando '+filteredRows.length+' jornadas de dieta '+dietFilter.toLowerCase()+' · pulsa de nuevo la categoría para quitar el filtro':'Pulsa una jornada para ver el detalle autorizado.'}</p></div></div>
     {dietFilter?<button type="button" onClick={clearDiet} className="rounded-lg border border-blue-400 bg-[#17365e] px-3 py-2 text-xs font-semibold text-blue-100 hover:bg-[#244c7c]">Ver todas ({rows.length})</button>:null}</div>
    {!shown.length?<p className="rounded-2xl bg-[#12233f] p-6 text-slate-300">{dietFilter?'No hay jornadas de dieta '+dietFilter.toLowerCase()+' en las fechas seleccionadas.':'No hay jornadas para estas fechas.'}</p>:shown.map((r,i)=>{
     const key=r.date+'-'+((page-1)*10+i),isOpen=opened===key,times=periodLabel(r);
     return <article key={key} className="overflow-hidden rounded-2xl border border-[#2d466a] bg-[#14243f] shadow-lg shadow-black/10">
      <button type="button" onClick={()=>setOpened(isOpen?null:key)} aria-expanded={isOpen} className="w-full p-4 text-left sm:p-5">
       <div className="flex items-center justify-between gap-3"><p className="min-w-0 text-sm font-bold text-white sm:text-base">{allowed('start_end')?<>{times.start} <span className="px-1 text-blue-300">→</span> {times.finish}</>:date(r.date)}</p>{isOpen?<ChevronUp className="h-5 w-5 shrink-0 text-blue-400"/>:<ChevronDown className="h-5 w-5 shrink-0 text-blue-400"/>}</div>
       {allowed('locations')?<p className="mt-3 flex items-start gap-2 text-sm text-slate-300"><MapPin className="mt-0.5 h-4 w-4 shrink-0"/>{r.start||'Origen no registrado'} → {r.end||'Destino no registrado'}</p>:null}
       {(allowed('working')||allowed('driving'))?<div className="mt-3 flex flex-wrap gap-4 border-t border-[#344760] pt-3 text-sm text-slate-300">{allowed('working')?<span className="flex items-center gap-2"><Clock3 className="h-4 w-4"/>{r.working!==null?hours(r.working):'Sin dato'}</span>:null}{allowed('driving')?<span className="flex items-center gap-2"><Truck className="h-4 w-4"/>{r.driving!==null?hours(r.driving):'Sin dato'}</span>:null}</div>:null}
       <div className="mt-3 flex flex-wrap items-center gap-2">
        {allowed('route_type')&&r.routeType?<span className="rounded-lg bg-[#0b172b] px-2.5 py-1 text-xs font-semibold text-slate-200">{r.routeType}</span>:null}
        {allowed('diet_pct')&&r.dietPct!==null?<span className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300">Dieta {r.dietPct}%</span>:null}
        {allowed('diet_type')&&r.dietType?<span className="rounded-lg bg-blue-600/20 px-2.5 py-1 text-xs font-semibold text-blue-200">{r.dietType}</span>:null}
        {allowed('day_flags')&&isSunday(r.dayFlag)?<span className="rounded-lg bg-violet-500/20 px-2.5 py-1 text-xs font-semibold text-violet-200">Domingo</span>:null}
        {allowed('day_flags')&&isHoliday(r.dayFlag)?<span className="rounded-lg bg-orange-500/20 px-2.5 py-1 text-xs font-semibold text-orange-200">Festivo</span>:null}
        {allowed('diet_amount')&&r.dietAmount!==null?<span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">{money(r.dietAmount)}</span>:null}
        {(allowed('pluses')||allowed('plus_amount'))&&(r.plusItems.length>0||(r.dayExtra!==null&&r.dayExtra>0))?<span className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-200">Pluses{allowed('plus_amount')?' · '+money(plusTotal(r)):''}</span>:null}
       </div>
      </button>
      {isOpen?<div className="border-t border-[#2d466a] bg-[#101d34] p-4 sm:p-5"><div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{fields.map(f=><div key={f}><p className="text-xs text-slate-400">{label[f]}</p><p className="mt-1 break-words text-sm font-semibold text-slate-100">{labelValue(r,f)}</p></div>)}</div>
       {allowed('pluses')&&r.plusItems.length>0?<div className="mt-4 rounded-xl border border-[#304968] p-3"><p className="text-xs font-bold text-blue-200">Conceptos registrados</p>{r.plusItems.map((x,k)=><div key={k} className="mt-2 flex justify-between gap-2 text-xs"><span>{x.concept}</span>{allowed('plus_amount')&&x.amount!==null?<span className="font-semibold">{money(x.amount)}</span>:null}</div>)}</div>:null}
      </div>:null}
     </article>;
    })}
    <div className="flex items-center justify-between gap-3 px-2 py-2 text-xs text-slate-300"><span>{filteredRows.length} jornadas · Página {Math.min(page,pages)} de {pages}</span><div className="flex gap-2"><button className="rounded-lg border border-[#3a5579] px-3 py-2 disabled:opacity-30" disabled={page<=1} onClick={()=>{setPage(page-1);setOpened(null);}}>Anterior</button><button className="rounded-lg border border-[#3a5579] px-3 py-2 disabled:opacity-30" disabled={page>=pages} onClick={()=>{setPage(page+1);setOpened(null);}}>Siguiente</button></div></div>
   </section>
   <div className="flex items-start gap-3 rounded-xl border border-[#315078] bg-[#12233f] p-4 text-xs leading-relaxed text-slate-300"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-400"/>La empresa solo puede consultar los campos y fechas autorizados. Los domingos y festivos proceden de las marcas guardadas, no de un calendario automático. El informe no sustituye al tacógrafo ni acredita cumplimiento legal.</div>
  </>:null}
 </div></main>;
}
