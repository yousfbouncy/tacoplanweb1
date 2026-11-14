'use client';
import {useEffect,useMemo,useState} from 'react';
import {CalendarDays,ChevronDown,ChevronUp,Download,ShieldCheck,Truck,RefreshCw} from 'lucide-react';
import {REPORT_FIELD_OPTIONS,SharedReportData,ReportField,SharedReportRow,labelValue} from '@/lib/report-sharing';
import {saveReportPdf} from '@/lib/selected-report-pdf';
const label=Object.fromEntries(REPORT_FIELD_OPTIONS.map(f=>[f.key,f.label])) as Record<ReportField,string>;
const date=(v:string)=>v.split('-').reverse().join('/');
export function CompanyReport({token}:{token:string}){
 const [report,setReport]=useState<SharedReportData|null>(null),[expires,setExpires]=useState('');
 const [busy,setBusy]=useState(true),[error,setError]=useState('');
 const [from,setFrom]=useState(''),[to,setTo]=useState('');
 const [opened,setOpened]=useState<string|null>(null),[page,setPage]=useState(1);
 const refresh=async()=>{
  setBusy(true);setError('');try{
   const res=await fetch('/api/company-report/'+encodeURIComponent(token),{cache:'no-store',referrerPolicy:'no-referrer'});
   const json=await res.json();if(!res.ok)throw Error(json.error||'No se pudo consultar este informe');
   setReport(json.report);setExpires(json.expiresAt);
   setFrom(v=>v&&v>=json.report.from&&v<=json.report.to?v:json.report.from);
   setTo(v=>v&&v>=json.report.from&&v<=json.report.to?v:json.report.to);
  }catch(e:unknown){setReport(null);setError(e instanceof Error?e.message:'Enlace no disponible');}finally{setBusy(false);}
 };
 useEffect(()=>{void refresh()},[token]);
 const rows=useMemo(()=>report?.rows.filter(r=>r.date>=from&&r.date<=to)||[],[report,from,to]);
 const pages=Math.max(1,Math.ceil(rows.length/12));
 const shown=rows.slice((Math.min(page,pages)-1)*12,Math.min(page,pages)*12);
 const fields=report?.fields.filter(f=>f!=='driver_name')||[];
 const download=()=>{if(!report)return;saveReportPdf({...report,from,to,rows,generatedAt:new Date().toISOString()});};
 return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12"><div className="mx-auto max-w-5xl space-y-5">
  <header className="rounded-2xl bg-[#0d2346] p-6 text-white sm:p-8"><div className="flex items-center gap-2 text-sm font-bold text-blue-200"><Truck className="h-6 w-6"/>TACOPLAN</div>
   <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Informe de actividad</h1>
   <p className="mt-2 text-sm text-slate-200">Historial de jornadas que el conductor ha decidido compartir con tu empresa.</p>
   {report?<p className="mt-3 text-xs text-blue-200">Periodo permitido: {date(report.from)} — {date(report.to)} · Acceso hasta {new Date(expires).toLocaleString('es-ES')}</p>:null}
  </header>
  {busy?<div className="rounded-xl bg-white p-8 text-center text-slate-500">Comprobando acceso autorizado…</div>:null}
  {error?<section className="rounded-xl border border-red-200 bg-white p-6"><h2 className="font-bold text-red-800">No se puede consultar este informe</h2><p className="mt-2 text-sm text-slate-600">{error}</p><p className="mt-2 text-xs text-slate-500">Solicita al conductor un nuevo enlace si ha caducado o lo ha desactivado.</p></section>:null}
  {report&&!busy?<><section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">{report.driverName||'Informe compartido por un conductor'}</h2><p className="mt-1 text-xs text-slate-500">Solo se muestran los campos autorizados.</p></div>
     <div className="flex gap-2"><button type="button" onClick={()=>void refresh()} className="rounded-xl border p-2" aria-label="Actualizar informe"><RefreshCw className="h-5 w-5 text-slate-600"/></button><button type="button" onClick={download} className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white"><Download className="h-4 w-4"/>PDF</button></div></div>
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"><label className="text-xs font-bold text-slate-700">Desde<input type="date" min={report.from} max={to} value={from} onChange={e=>{setFrom(e.target.value);setPage(1);}} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"/></label><label className="text-xs font-bold text-slate-700">Hasta<input type="date" min={from} max={report.to} value={to} onChange={e=>{setTo(e.target.value);setPage(1);}} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"/></label><div className="col-span-2 rounded-lg bg-blue-50 p-3 sm:col-span-1"><p className="text-xs text-blue-700">Jornadas en el periodo</p><p className="text-2xl font-bold text-blue-950">{rows.length}</p></div></div>
    <div className="mt-4 flex flex-wrap gap-1.5">{fields.map(f=><span key={f} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{label[f]}</span>)}</div>
   </section>
   <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b px-4 py-4"><h2 className="text-lg font-bold text-slate-900">Historial de viajes</h2><p className="mt-1 text-xs text-slate-500">Abre una jornada para ver los datos autorizados.</p></div>
    {!shown.length?<p className="p-6 text-sm text-slate-500">No hay jornadas para estas fechas.</p>:shown.map((r,i)=><div key={r.date+'-'+i} className="border-b border-slate-100">
     <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50" onClick={()=>setOpened(opened===r.date+'-'+i?null:r.date+'-'+i)}>
      <div><p className="text-sm font-bold text-slate-900">{date(r.date)}</p><p className="text-xs text-slate-500">{fields.includes('route_type')?r.routeType||'Sin tipo de ruta':'Jornada registrada'}</p></div>{opened===r.date+'-'+i?<ChevronUp className="h-4 w-4 text-slate-500"/>:<ChevronDown className="h-4 w-4 text-slate-500"/>}
     </button>
     {opened===r.date+'-'+i?<div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 sm:grid-cols-3">{fields.map(f=><div key={f}><p className="text-xs text-slate-500">{label[f]}</p><p className="mt-1 break-words text-sm font-semibold text-slate-900">{labelValue(r,f)}</p></div>)}</div>:null}
    </div>)}
    <div className="flex items-center justify-between p-3 text-xs text-slate-500"><span>Página {Math.min(page,pages)} de {pages}</span><div className="flex gap-2"><button className="rounded-lg border px-3 py-2 disabled:opacity-30" disabled={page<=1} onClick={()=>{setPage(page-1);setOpened(null);}}>Anterior</button><button className="rounded-lg border px-3 py-2 disabled:opacity-30" disabled={page>=pages} onClick={()=>{setPage(page+1);setOpened(null);}}>Siguiente</button></div></div>
   </section>
   <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-relaxed text-slate-600"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700"/>Acceso limitado por el conductor. Los datos se consultan en tiempo real dentro del periodo permitido y pueden cambiar si el conductor corrige sus registros. El informe no sustituye al tacógrafo ni acredita cumplimiento legal.</div>
  </>:null}
 </div></main>;
}
