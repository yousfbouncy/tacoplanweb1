'use client';
import { useEffect,useState } from 'react';
import {Download,Share2,Link2,Copy,ShieldCheck,Trash2,ChevronDown,ChevronUp,Settings2,FileText} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {REPORT_FIELD_OPTIONS,DEFAULT_REPORT_FIELDS,REPORT_DB_COLUMNS,validDate,ReportField,SharedReportData,RawReportJornada,mapReportRow,redactRows} from '@/lib/report-sharing';
import {saveReportPdf,buildSelectedReportPdf} from '@/lib/selected-report-pdf';

type Grant={id:string;date_from:string;date_to:string;fields:ReportField[];created_at:string;expires_at:string;revoked_at:string|null};
const today=()=>new Date().toLocaleDateString('en-CA');
const monthAgo=()=>{const d=new Date();d.setDate(d.getDate()-30);return d.toLocaleDateString('en-CA');};
export function DriverReportManager({name}:{name:string}){
 const [opened,setOpened]=useState(false),[from,setFrom]=useState(monthAgo),[to,setTo]=useState(today);
 const [fields,setFields]=useState<ReportField[]>(DEFAULT_REPORT_FIELDS);
 const [expireDays,setExpireDays]=useState(7);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState('');
 const [grants,setGrants]=useState<Grant[]>([]),[linksOpen,setLinksOpen]=useState(false);
 const [freshLink,setFreshLink]=useState<string|null>(null);
 const [reportRestricted,setReportRestricted]=useState(false);
 useEffect(()=>{
  let mounted=true;
  const check=async()=>{
   try{
    const session=await supabase.auth.getSession();
    if(!session.data.session)return;
    const r=await fetch('/api/driver/subscription',{headers:{Authorization:'Bearer '+session.data.session.access_token},cache:'no-store'});
    if(!r.ok)return;
    const data=await r.json();
    if(mounted)setReportRestricted(data.restrictions_enabled===true&&data.pro_access!==true);
   }catch{ /* Preserve existing report access for non-pilot drivers on network errors. */ }
  };
  void check();
  return()=>{mounted=false;};
 },[]);
 const switchField=(f:ReportField)=>setFields(prev=>prev.includes(f)?prev.filter(x=>x!==f):[...prev,f]);
 const token=async()=>{const s=await supabase.auth.getSession();if(!s.data.session?.access_token)throw Error('Tu sesión ha caducado. Inicia sesión de nuevo.');return s.data.session.access_token;};
 const loadGrants=async()=>{
  try{const jwt=await token();const r=await fetch('/api/driver/report-shares',{headers:{Authorization:'Bearer '+jwt},cache:'no-store'});
   const j=await r.json();if(!r.ok)throw Error(j.error||'No se pudieron consultar los enlaces');
   setGrants(j.items||[]);}catch(e:unknown){setError(e instanceof Error?e.message:'Error consultando enlaces');}
 };
 useEffect(()=>{if(opened)void loadGrants();},[opened]);
 const validate=()=>{
  if(!validDate(from)||!validDate(to)||to<from)throw Error('Selecciona un periodo correcto (desde / hasta).');
  if(Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z')>366*86400000)throw Error('Selecciona como máximo 366 días.');
  if(to>today())throw Error('La fecha «hasta» no puede ser posterior a hoy.');
  if(!fields.length)throw Error('Elige al menos un campo del informe.');
 };
 const localReport=async():Promise<SharedReportData>=>{
  validate();
  const {data,error:qError}=await supabase.from('jornadas').select(REPORT_DB_COLUMNS)
    .gte('fecha_inicio',from).lte('fecha_inicio',to).order('fecha_inicio',{ascending:false}).limit(1000);
  if(qError)throw Error('No se pudieron cargar tus jornadas. '+qError.message);
  const rows=(data||[]).map(j=>mapReportRow(j as unknown as RawReportJornada));
  if(!rows.length)throw Error('No hay jornadas guardadas entre las fechas seleccionadas.');
  return {title:'Informe de actividad · Tacoplan',from,to,fields,
   driverName:fields.includes('driver_name')?name:null,rows:redactRows(rows,fields),
   generatedAt:new Date().toISOString()};
 };
 const action=async(kind:'download'|'share'|'link')=>{
  if(busy)return;
  if(reportRestricted){setError('Para generar informes necesitas el plan Pro. Puedes seguir gestionando tus enlaces anteriores.');return;}
  setBusy(true);setError('');setInfo('');
  try{
   if(kind==='link'){
    validate();const jwt=await token();
    const r=await fetch('/api/driver/report-shares',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt},body:JSON.stringify({action:'create',from,to,fields,days:expireDays})});
    const j=await r.json();if(!r.ok)throw Error(j.error||'No se pudo crear el enlace');
    setFreshLink(j.url);setInfo('Enlace privado creado. Cópialo y envíaselo a la empresa.');setLinksOpen(true);
    await loadGrants();
   }else{
    const report=await localReport();
    if(kind==='download'){saveReportPdf(report);setInfo('PDF generado con las fechas y campos seleccionados.');}
    else{
     const pdf=buildSelectedReportPdf(report);
     const file=new File([pdf],'Tacoplan-'+from+'-'+to+'.pdf',{type:'application/pdf'});
     if(navigator.share&&navigator.canShare?.({files:[file]})){
      try{await navigator.share({files:[file],title:'Informe de Tacoplan',text:'Informe del periodo seleccionado.'});setInfo('Informe preparado para compartir.');}
      catch(e:unknown){if(e instanceof Error&&e.name==='AbortError')setInfo('Has cancelado la opción de compartir.');else{saveReportPdf(report);setInfo('Se ha descargado el PDF para que puedas enviarlo.');}}
     }else{saveReportPdf(report);setInfo('Se ha descargado el PDF para compartirlo por WhatsApp o correo.');}
    }
   }
  }catch(e:unknown){setError(e instanceof Error?e.message:'No se pudo generar el informe');}
  finally{setBusy(false);}
 };
 const revoke=async(id:string)=>{
  if(busy||!window.confirm('¿Desactivar este enlace de empresa? Dejará de mostrar el informe inmediatamente.'))return;
  setBusy(true);setError('');setInfo('');
  try{const jwt=await token();const r=await fetch('/api/driver/report-shares',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt},body:JSON.stringify({action:'revoke',id})});
   const j=await r.json();if(!r.ok)throw Error(j.error||'No se pudo desactivar el enlace');
   setInfo('Enlace desactivado. Ya no se podrá consultar.');setFreshLink(null);await loadGrants();
  }catch(e:unknown){setError(e instanceof Error?e.message:'No se pudo desactivar');}finally{setBusy(false);}
 };
 const copy=async()=>{if(!freshLink)return;try{await navigator.clipboard.writeText(freshLink);setInfo('Enlace copiado. Cualquiera con él puede consultar los campos elegidos mientras esté activo.');}catch{setInfo('Mantén pulsado el enlace para copiarlo.');}};
 return <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
  <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#0d2346] to-[#173d79] p-5 text-white">
   <div><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-200"/><h2 className="text-lg font-extrabold">Informes y acceso para empresas</h2></div>
    <p className="mt-1 max-w-xl text-sm text-blue-100">Decide qué fechas y datos quieres mostrar. Descarga, comparte un PDF o crea un enlace web revocable.</p>
   </div>
   <button type="button" onClick={()=>setOpened(!opened)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-800"><Settings2 className="h-4 w-4"/>{opened?'Cerrar opciones':'Preparar informe'}{opened?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}</button>
  </div>
  {opened?<div className="space-y-5 p-4 sm:p-6">
   {reportRestricted?<p role="status" className="rounded-xl border border-blue-200 p-3 text-sm text-blue-800">Los informes nuevos están reservados para Pro en tu cuenta piloto. <a className="underline" href="/planes">Consultar suscripciones</a>. Puedes gestionar o revocar los enlaces anteriores.</p>:null}
   <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-800">Desde<input type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-slate-900"/></label><label className="text-sm font-semibold text-slate-800">Hasta<input type="date" value={to} min={from} max={today()} onChange={e=>setTo(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-slate-900"/></label></div>
   <div><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-900">Selecciona los datos que aparecerán</h3><div className="flex gap-2"><button type="button" className="text-xs font-bold text-blue-700" onClick={()=>setFields(DEFAULT_REPORT_FIELDS)}>Básico</button><button type="button" className="text-xs font-bold text-blue-700" onClick={()=>setFields(REPORT_FIELD_OPTIONS.map(x=>x.key))}>Todos</button></div></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{REPORT_FIELD_OPTIONS.map(x=><label key={x.key} className={'flex items-start gap-2 rounded-xl border p-3 text-xs sm:text-sm '+(fields.includes(x.key)?'border-blue-300 bg-blue-50 text-blue-900':'border-slate-200 text-slate-600')}><input type="checkbox" checked={fields.includes(x.key)} onChange={()=>switchField(x.key)} className="mt-0.5 h-4 w-4 accent-blue-700"/>{x.label}</label>)}</div>
    <p className="mt-2 text-xs text-slate-500">La fecha de cada jornada siempre se muestra para que el historial tenga sentido. Los demás campos solo aparecerán si los marcas.</p>
   </div>
   <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={()=>void action('download')} disabled={busy||reportRestricted} className="flex items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-3 font-bold text-blue-800 disabled:opacity-50"><Download className="h-4 w-4"/>Descargar PDF personalizado</button><button type="button" onClick={()=>void action('share')} disabled={busy||reportRestricted} className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-50"><Share2 className="h-4 w-4"/>Compartir PDF</button></div>
   <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-700"/><h3 className="font-bold text-slate-900">Crear panel web para tu empresa</h3></div><p className="mt-2 text-sm text-slate-600">La empresa podrá abrir el historial permitido desde un enlace. No tendrá acceso a tu cuenta ni a fechas o datos no autorizados.</p>
    <label className="mt-3 block text-sm font-semibold text-slate-800">Caducidad del enlace<select value={expireDays} onChange={e=>setExpireDays(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"><option value={1}>24 horas</option><option value={7}>7 días</option><option value={30}>30 días</option></select></label>
    <button type="button" disabled={busy||reportRestricted} onClick={()=>void action('link')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d2346] px-4 py-3 font-bold text-white disabled:opacity-50"><Link2 className="h-4 w-4"/>{busy?'Procesando…':'Generar enlace privado'}</button>
    {freshLink?<div className="mt-3 rounded-xl border border-blue-200 bg-white p-3"><p className="text-xs font-bold text-blue-700">Nuevo enlace (guárdalo ahora)</p><div className="mt-2 flex items-center gap-2"><input readOnly value={freshLink} aria-label="Enlace privado" onFocus={e=>e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border p-2 text-xs"/><button type="button" onClick={()=>void copy()} className="rounded-lg bg-blue-600 p-2 text-white" aria-label="Copiar enlace"><Copy className="h-4 w-4"/></button></div><p className="mt-2 text-xs text-slate-500">Por seguridad el enlace completo solo se muestra al crearlo. Si lo pierdes, revoca el anterior y genera uno nuevo.</p></div>:null}
   </div>
   <div><button type="button" onClick={()=>{setLinksOpen(!linksOpen);if(!linksOpen)void loadGrants();}} className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-left font-semibold text-slate-900">Gestionar enlaces de empresa ({grants.filter(g=>!g.revoked_at&&new Date(g.expires_at).getTime()>Date.now()).length} activos){linksOpen?<ChevronUp className="h-5 w-5"/>:<ChevronDown className="h-5 w-5"/>}</button>
    {linksOpen?<div className="divide-y rounded-xl border border-slate-200">{!grants.length?<p className="p-4 text-sm text-slate-500">Todavía no hay enlaces creados.</p>:grants.map(g=>{const active=!g.revoked_at&&new Date(g.expires_at).getTime()>Date.now();return <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 p-3"><div><p className="text-sm font-bold text-slate-900">{g.date_from} → {g.date_to}</p><p className="mt-1 text-xs text-slate-500">{active?'Activo hasta '+new Date(g.expires_at).toLocaleDateString('es-ES'):g.revoked_at?'Desactivado':'Caducado'} · {g.fields.length} campos autorizados</p></div>{active?<button type="button" onClick={()=>void revoke(g.id)} disabled={busy} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700"><Trash2 className="h-4 w-4"/>Desactivar</button>:null}</div>;})}</div>:null}
   </div>
   {error?<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}
   {info?<p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{info}</p>:null}
   <p className="text-xs leading-relaxed text-slate-500">Cualquiera que tenga el enlace podrá consultar los campos autorizados durante su vigencia. Evita compartirlo públicamente. Puedes desactivarlo en cualquier momento. Los informes son orientativos, no documentos oficiales del tacógrafo.</p>
  </div>:null}
 </section>;
}
