'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,CalendarDays,CheckCircle2,ChevronRight,Plus,Search,Trash2,Pencil,Wallet,X} from 'lucide-react';
import {supabase} from '@/lib/supabase';

export type Driver={user_id:string;username:string;employee_name?:string|null};
export type Entry={id:string;driver_id:string;source:'jornada'|'natural_day'|'manual';date:string;type:string|null;percentage:number|null;pluses:Array<{concepto:string;importe:number}>;day_flag?:string|null;day_extra_eur?:number|null};
export type DietReview={driver_id:string;jornada_id?:string|null;status:string};
export type Adjustment={id:string;driver_id:string;diet_date:string;target_kind:string;target_id?:string|null;operation:'add'|'edit'|'delete';original_diet_type?:string|null;proposed_diet_type?:string|null;proposed_percentage?:number|null;reason:string;status:string;driver_observation?:string|null;created_at:string;proposed_pluses?:Array<{concepto:string;importe:number;source?:string}>};
type Form={operation:'add'|'edit'|'delete';targetKind:'jornada'|'natural_day'|'manual';targetId:string;date:string;dietType:string;percentage:number;plusItems:Array<{concepto:string;importe:number;source?:'automatic'|'manual'}>;reason:string;originalFlag?:string|null;originalExtra?:number|null};
const secondary='rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const button='rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';
const field='w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500';
const dateLabel=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):s;
const kinds:{type:string;label:string}[]=[{type:'NACIONAL',label:'Nacional'},{type:'INTERNACIONAL',label:'Internacional'},{type:'REGIONAL',label:'Regional'}];
const newForm=(date:string):Form=>({operation:'add',targetKind:'manual',targetId:'',date,dietType:'NACIONAL',percentage:100,plusItems:[],reason:''});
const baseType=(s:string|null)=>kinds.find(k=>s?.toUpperCase().includes(k.type))?.type||'';
const label=(kind:string)=>kind==='natural_day'?'Día natural':kind==='manual'?'Corrección aceptada':'Jornada';
const dateISO=(date:Date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const monthDates=(offset=0)=>{
 const now=new Date();
 return {from:dateISO(new Date(now.getFullYear(),now.getMonth()+offset,1)),
  to:dateISO(new Date(now.getFullYear(),now.getMonth()+offset+1,0))};
};
const recordKey=(entry:Entry)=>entry.source+':'+entry.id;
const reviewKey=(entry:Entry)=>entry.source==='natural_day'?'natural_day:'+entry.id:entry.id;
export default function TrafficDietManager({drivers,entries,adjustments,reviews,plusOptions,blocked=false,refresh}:{
 drivers:Driver[];entries:Entry[];adjustments:Adjustment[];reviews:DietReview[];plusOptions:Record<string,string[]>;
 blocked?:boolean;refresh:()=>Promise<void>;
}){
 const [selected,setSelected]=useState('');
 const [query,setQuery]=useState('');
 const [from,setFrom]=useState(()=>monthDates().from);
 const [to,setTo]=useState(()=>monthDates().to);
 const [selectedRecords,setSelectedRecords]=useState<string[]>([]);
 const validPeriod=Boolean(from&&to&&from<=to);
 const inPeriod=(date:string)=>validPeriod&&date>=from&&date<=to;
 const setPeriod=(offset:number)=>{const next=monthDates(offset);setFrom(next.from);setTo(next.to);setSelectedRecords([]);};
 const [form,setForm]=useState<Form|null>(null);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 const modalRef=useRef<HTMLDivElement>(null);
 const triggerRef=useRef<HTMLElement|null>(null);
 const closeDialog=()=>{if(saving)return;setForm(null);setMessage('');};
 useEffect(()=>{
  if(!form)return;
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();setForm(null);setMessage('');}
   if(event.key==='Tab'){
    const items=Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')||[]);
    if(!items.length)return;
    const first=items[0],last=items[items.length-1];
    if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
   }
  };
  document.addEventListener('keydown',onKey);
  const focusTimer=window.setTimeout(()=>modalRef.current?.querySelector<HTMLElement>('input:not([disabled]),select:not([disabled]),textarea:not([disabled])')?.focus(),0);
  return()=>{document.body.style.overflow=oldOverflow;document.removeEventListener('keydown',onKey);clearTimeout(focusTimer);triggerRef.current?.focus();};
 },[Boolean(form)]);
 const openForm=(next:Form)=>{triggerRef.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setMessage('');setForm(next);};
 const driver=drivers.find(d=>d.user_id===selected);
 const name=(d:Driver)=>d.employee_name||d.username;
 const findReview=(entry:Entry)=>reviews.find(r=>r.driver_id===selected&&r.jornada_id===reviewKey(entry));
 const modifiedAccepted=(entry:Entry)=>adjustments.some(a=>a.driver_id===selected&&a.status==='accepted'&&a.operation!=='add'&&a.target_kind===entry.source&&a.target_id===entry.id);
 const canConfirm=(entry:Entry)=>{
  const review=findReview(entry);
  return !blocked&&['jornada','natural_day'].includes(entry.source)
   &&!modifiedAccepted(entry)&&(!review||review.status==='pending_traffic');
 };
 const records=useMemo(()=>{
   const source=entries.filter(e=>e.driver_id===selected&&inPeriod(e.date));
   const accepted=adjustments.filter(a=>a.driver_id===selected&&a.status==='accepted')
    .sort((a,b)=>a.created_at.localeCompare(b.created_at));
   const byId=new Map(source.map(e=>[e.source+':'+e.id,e]));
   for(const a of accepted){
     if(a.operation==='add'){
       if(inPeriod(a.diet_date))byId.set('adjustment:'+a.id,{
         id:a.id,driver_id:a.driver_id,source:'manual' as Entry['source'],
         date:a.diet_date,type:a.proposed_diet_type||null,
         percentage:a.proposed_percentage||null,pluses:a.proposed_pluses||[],day_extra_eur:0});
     } else if(a.target_id && a.target_kind){
       const key=a.target_kind+':'+a.target_id;
       const current=byId.get(key);
       if(current){
         if(a.operation==='delete')byId.delete(key);
         else byId.set(key,{...current,type:a.proposed_diet_type||current.type,
           percentage:a.proposed_percentage||current.percentage,pluses:(a.proposed_pluses||[]).filter(p=>p.source!=='automatic'),day_flag:(a.proposed_pluses||[]).find(p=>p.source==='automatic')?.concepto||null,day_extra_eur:(a.proposed_pluses||[]).find(p=>p.source==='automatic')?.importe||0});
       }
     }
   }
   return Array.from(byId.values()).sort((a,b)=>b.date.localeCompare(a.date));
  },[entries,adjustments,selected,from,to]);
 const proposals=useMemo(()=>adjustments.filter(a=>a.driver_id===selected&&inPeriod(a.diet_date))
  .sort((a,b)=>b.created_at.localeCompare(a.created_at)),[adjustments,selected,from,to]);
 const pendingConfirmations=records.filter(entry=>selectedRecords.includes(recordKey(entry))&&canConfirm(entry));
 const list=drivers.filter(d=>name(d).toLowerCase().includes(query.toLowerCase())||d.username.toLowerCase().includes(query.toLowerCase()));
 const confirmEntries=async(chosen:Entry[])=>{
  const eligible=chosen.filter(canConfirm);
  if(!driver||saving||!eligible.length||!validPeriod)return;
  if(eligible.length>60){setMessage('Selecciona como máximo 60 registros por operación.');return;}
  if(eligible.length>1&&!window.confirm('¿Confirmar '+eligible.length+' dietas de '+name(driver)+' y enviarlas a RR. HH. para su liquidación?'))return;
  setSaving(true);setMessage('');
  let count=0;
  const failed:string[]=[];
  try{
   const {data:{session}}=await supabase.auth.getSession();
   if(!session?.access_token)throw Error('Sesión caducada');
   for(const entry of eligible){
    try{
     const res=await fetch('/api/empresas/action',{method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
      body:JSON.stringify({action:'review',driverId:driver.user_id,jornadaId:entry.id,
       source:entry.source,mode:'confirm'})});
     const data=await res.json();
     if(!res.ok)throw Error(data.error||'No se pudo confirmar');
     count++;
    }catch(error){failed.push(dateLabel(entry.date)+': '+(error instanceof Error?error.message:'Error desconocido'));}
   }
   if(count){setSelectedRecords(current=>current.filter(key=>!eligible.some(entry=>recordKey(entry)===key)));await refresh();}
   setMessage(count+' dieta(s) confirmada(s) y disponibles en RR. HH.'+(failed.length?' No confirmadas: '+failed.join(' · '):''));
  }catch(error){setMessage(error instanceof Error?error.message:'Error al confirmar las dietas');}
  finally{setSaving(false);}
 };
 const edit=(e:Entry,op:'edit'|'delete')=>{openForm({operation:op,targetKind:e.source,targetId:e.id,
  date:e.date,dietType:baseType(e.type),percentage:[30,60,100].includes(Number(e.percentage))?Number(e.percentage):100,
  plusItems:[...(e.day_flag?[{concepto:e.day_flag,importe:Number(e.day_extra_eur)||0,source:'automatic' as const}]:[]),...(e.pluses||[]).map(p=>({...p,source:'manual' as const}))],reason:'',originalFlag:e.day_flag,originalExtra:e.day_extra_eur});};
 const save=async()=>{
  if(!form||!driver||saving||blocked)return;
  if(form.reason.trim().length<10){setMessage('Explica el motivo (mínimo 10 caracteres).');return;}
  setSaving(true);setMessage('');
  try{
   const {data:{session}}=await supabase.auth.getSession();
   if(!session?.access_token)throw Error('Sesión caducada');
   const res=await fetch('/api/empresas/diet-adjustments',{method:'POST',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
    body:JSON.stringify({action:'propose',driverId:driver.user_id,operation:form.operation,
      targetKind:form.targetKind,targetId:form.targetId,date:form.date,
      dietType:form.dietType,percentage:form.percentage,plusItems:form.plusItems,reason:form.reason})});
   const data=await res.json();
   if(!res.ok)throw Error(data.error||'No se pudo guardar la propuesta');
   await refresh();setForm(null);setMessage('Propuesta guardada. El conductor recibirá un aviso y podrá responder.');
  }catch(e){setMessage(e instanceof Error?e.message:'Error al guardar');}
  finally{setSaving(false);}
 };
 if(!driver)return <section className="space-y-4">
  <div className="rounded-2xl border border-slate-200 bg-white p-5">
   <h2 className="text-xl font-bold text-slate-900">Dietas y pluses</h2>
   <p className="mt-1 text-sm text-slate-500">Selecciona un conductor para consultar sus registros por fecha y las propuestas de corrección.</p>
   <div className="relative mt-4"><Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={17}/><input className={field+' pl-10'} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar conductor…"/></div>
   <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
    {list.map(d=><button type="button" key={d.user_id} onClick={()=>{setSelected(d.user_id);setForm(null);setMessage('');setSelectedRecords([]);}} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-blue-400 hover:bg-blue-50">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700">{name(d).slice(0,2).toUpperCase()}</span>
      <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{name(d)}</strong><span className="text-xs text-slate-500">@{d.username} · {entries.filter(e=>e.driver_id===d.user_id).length} registros</span></span>
      <ChevronRight size={17} className="text-blue-600"/>
     </button>)}
   </div>
   {!list.length?<p className="mt-5 text-sm text-slate-500">No hay conductores asignados que coincidan con la búsqueda.</p>:null}
  </div>
 </section>;
 return <section className="space-y-4">
  <div className="rounded-2xl border border-slate-200 bg-white p-5">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-3">
     <button type="button" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50" aria-label="Volver a los conductores" onClick={()=>{setSelected('');setForm(null);setSelectedRecords([]);}}><ArrowLeft size={19}/></button>
     <div><h2 className="text-xl font-bold">{name(driver)}</h2><p className="text-xs text-slate-500">Dietas y pluses del conductor · @{driver.username}</p></div>
    </div>
    <div className="flex flex-wrap items-end gap-2">
     <label className="text-xs font-semibold text-slate-600">Desde<input aria-label="Fecha inicial del periodo" type="date" className={field+' mt-1'} value={from} onChange={e=>{setFrom(e.target.value);setSelectedRecords([]);}}/></label>
     <label className="text-xs font-semibold text-slate-600">Hasta<input aria-label="Fecha final del periodo" type="date" className={field+' mt-1'} value={to} onChange={e=>{setTo(e.target.value);setSelectedRecords([]);}}/></label>
     <button type="button" className={secondary} onClick={()=>setPeriod(-1)}>Mes anterior</button>
     <button type="button" className={secondary} onClick={()=>setPeriod(0)}>Este mes</button>
     <button disabled={blocked||!validPeriod} type="button" onClick={()=>openForm(newForm(from))}
       className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16}/> Añadir dieta</button>
    </div>
   </div>
   {!validPeriod?<p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">Selecciona una fecha inicial anterior o igual a la fecha final.</p>:null}
   <div className="mt-4 flex flex-wrap gap-2 text-xs">
    <span className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700">{records.length} registros en el periodo</span>
    <span className="rounded-lg bg-amber-50 px-3 py-2 font-semibold text-amber-700">{proposals.filter(p=>p.status==='awaiting_driver').length} pendientes de respuesta</span>
   </div>
   <p className="mt-3 text-xs text-slate-500">Las propuestas de Tráfico no borran los registros originales: el conductor puede aceptarlas o dejar una discrepancia. Solo se muestran datos compartidos con la empresa.</p>
  </div>
  {message?<div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div>:null}
  {form && typeof document!=='undefined' ? createPortal(
   <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/65 p-3 sm:p-5" onMouseDown={e=>{if(e.target===e.currentTarget)closeDialog();}}>
    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="traffic-diet-dialog-title"
      className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
     <div className="mb-4 flex items-start justify-between gap-3">
      <div><h3 id="traffic-diet-dialog-title" className="text-lg font-bold text-slate-900">{form.operation==='add'?'Añadir dieta':form.operation==='delete'?'Proponer eliminar dieta':'Modificar dieta'} · {dateLabel(form.date)}</h3>
       <p className="mt-1 text-xs text-slate-500">{name(driver)} · El conductor deberá aceptar o responder a esta propuesta.</p></div>
      <button type="button" onClick={closeDialog} disabled={saving} aria-label="Cerrar ventana" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><X size={20}/></button>
     </div>
   <div className="mt-3 grid gap-3 sm:grid-cols-3">
    <label className="text-xs font-semibold text-slate-600">Fecha<input type="date" disabled={form.operation!=='add'} className={field+' mt-1'} value={form.date} onChange={e=>setForm(f=>f?{...f,date:e.target.value}:f)}/></label>
    {form.operation!=='delete'?<><label className="text-xs font-semibold text-slate-600">Tipo<select className={field+' mt-1'} value={form.dietType} onChange={e=>setForm(f=>f?{...f,dietType:e.target.value}:f)}><option value="" disabled>Selecciona la dieta registrada</option>{kinds.map(k=><option key={k.type} value={k.type}>{k.label}</option>)}</select></label>
     <label className="text-xs font-semibold text-slate-600">Porcentaje<select className={field+' mt-1'} value={form.percentage} onChange={e=>setForm(f=>f?{...f,percentage:Number(e.target.value)}:f)}>{[100,60,30].map(n=><option key={n} value={n}>{n}%</option>)}</select></label></>:null}
   </div>
   {form.operation!=='delete'?<div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
     <div><p className="text-sm font-semibold text-slate-900">Pluses de esta jornada</p><p className="text-xs text-slate-500">Cada plus tiene su concepto e importe. Puedes modificarlo, quitarlo o añadir otro.</p></div>
     <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700" onClick={()=>setForm(f=>f?{...f,plusItems:[...f.plusItems,{concepto:'',importe:0,source:'manual'}]}:f)}><Plus size={14}/> Añadir plus</button>
    </div>
    {form.plusItems.map((p,index)=><div className="grid grid-cols-[1fr_110px_auto] items-end gap-2" key={index}>
     <label className="min-w-0 text-xs font-semibold text-slate-600">Concepto
       <input className={field+' mt-1'} value={p.concepto} maxLength={120} placeholder="Ej. Domingo, festivo, nocturnidad" onChange={e=>setForm(f=>f?{...f,plusItems:f.plusItems.map((x,k)=>k===index?{...x,concepto:e.target.value}:x)}:f)}/></label>
     <label className="text-xs font-semibold text-slate-600">Importe (€)
       <input className={field+' mt-1'} inputMode="decimal" type="number" min="0" max="100000" step="0.01" value={p.importe} onChange={e=>setForm(f=>f?{...f,plusItems:f.plusItems.map((x,k)=>k===index?{...x,importe:Number(e.target.value)}:x)}:f)}/></label>
     <button type="button" aria-label={'Quitar plus '+(index+1)} className="mb-0.5 rounded-lg border border-rose-200 p-2.5 text-rose-700" onClick={()=>setForm(f=>f?{...f,plusItems:f.plusItems.filter((_,k)=>k!==index)}:f)}><Trash2 size={16}/></button>
     {p.source==='automatic'?<p className="col-span-3 text-xs text-emerald-700">Plus automático original · se propondrá una sola vez, sin duplicarlo</p>:null}
    </div>)}
    {!form.plusItems.length?<p className="text-xs text-slate-500">Esta jornada no tiene pluses registrados. Puedes añadir los que corresponda.</p>:null}
    <p className="text-xs text-slate-500">Los importes propuestos no modifican la jornada original hasta la aceptación del conductor.</p>
   </div>:null}
   <label className="mt-3 block text-xs font-semibold text-slate-600">Motivo de la propuesta<textarea className={field+' mt-1'} rows={3} maxLength={2000} value={form.reason} onChange={e=>setForm(f=>f?{...f,reason:e.target.value}:f)} placeholder="Explica por qué hay que añadir, modificar o eliminar la dieta"/></label>
   {message?<p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{message}</p>:null}
   <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={saving||blocked||form.reason.trim().length<10||!form.date||(form.operation!=='delete'&&(!form.dietType||form.plusItems.some(p=>!p.concepto.trim()||!Number.isFinite(p.importe)||p.importe<0)))} onClick={()=>void save()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving?'Guardando…':'Enviar propuesta'}</button><button type="button" onClick={closeDialog} className="rounded-xl border px-4 py-2.5 text-sm">Cancelar</button></div>
    </div>
   </div>, document.body
  ) : null}
  <div className="rounded-2xl border border-slate-200 bg-white p-5">
   <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
    <h3 className="flex items-center gap-2 font-bold"><CalendarDays size={18} className="text-blue-600"/> Dietas registradas</h3>
    <div className="flex flex-wrap items-center gap-2">
     <button type="button" className={secondary} disabled={saving||blocked||!validPeriod||!records.some(canConfirm)} onClick={()=>setSelectedRecords(records.filter(canConfirm).map(recordKey))}>Seleccionar pendientes</button>
     <button type="button" className={secondary} disabled={!selectedRecords.length||saving} onClick={()=>setSelectedRecords([])}>Limpiar selección</button>
     <button type="button" className={button+' inline-flex items-center gap-2'} disabled={!pendingConfirmations.length||saving||blocked||!validPeriod} onClick={()=>void confirmEntries(pendingConfirmations)}>
      <CheckCircle2 size={16}/>{saving?'Confirmando…':'Confirmar y enviar a RR. HH. ('+pendingConfirmations.length+')'}
     </button>
    </div>
   </div>
   <p className="mb-3 text-xs text-slate-500">Marca las fechas que quieras validar. Las confirmadas quedan disponibles en RR. HH. con sus importes calculados por el servidor. Las propuestas de cambio siguen requiriendo la respuesta del conductor.</p>
   <div className="space-y-2">{records.map(e=><div key={e.source+e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50">
    <div className="flex min-w-0 flex-1 items-start gap-3">
     <input type="checkbox" aria-label={'Seleccionar dieta del '+dateLabel(e.date)} className="mt-1 h-4 w-4 accent-blue-600" disabled={!canConfirm(e)||saving}
      checked={selectedRecords.includes(recordKey(e))&&canConfirm(e)}
      onChange={event=>setSelectedRecords(current=>event.target.checked?[...current,recordKey(e)]:current.filter(key=>key!==recordKey(e)))}/>
     <div><p className="font-semibold text-slate-900">{dateLabel(e.date)} · {e.type||'Sin tipo'} {e.percentage?e.percentage+'%':''}</p>
    <p className="text-xs text-slate-500">{label(e.source)}{e.pluses?.length?' · '+e.pluses.map(p=>p.concepto+' ('+Number(p.importe).toLocaleString('es-ES',{style:'currency',currency:'EUR'})+')').join(' · '):''}</p>
    {e.day_flag ? <p className="mt-1 text-xs font-semibold text-emerald-700">
      Plus {e.day_flag.toUpperCase()==='DOMINGO'?'domingo':e.day_flag.toUpperCase()==='FESTIVO'?'festivo':e.day_flag.toLowerCase()}
      {Number(e.day_extra_eur||0)>0?' · '+Number(e.day_extra_eur).toLocaleString('es-ES',{style:'currency',currency:'EUR'}):' · Sin importe registrado'}
    </p> : null}
     {findReview(e)?.status==='confirmed'?<p className="mt-1 text-xs font-semibold text-emerald-700">Confirmada · Disponible en RR. HH.</p>:
      findReview(e)&&findReview(e)?.status!=='pending_traffic'?<p className="mt-1 text-xs font-semibold text-amber-700">Revisión: {findReview(e)?.status==='awaiting_driver'?'Pendiente del conductor':findReview(e)?.status==='disputed'?'Discrepancia':findReview(e)?.status==='accepted'?'Aceptada':findReview(e)?.status==='closed'?'Cerrada':findReview(e)?.status}</p>:
      modifiedAccepted(e)?<p className="mt-1 text-xs font-semibold text-amber-700">Cambio aceptado · Requiere liquidación de la corrección</p>:null}
     </div></div>
    <div className="flex flex-wrap gap-2">{canConfirm(e)?<button type="button" disabled={saving||blocked} onClick={()=>void confirmEntries([e])} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"><CheckCircle2 size={13}/> Confirmar para RR. HH.</button>:null}<button type="button" disabled={blocked||e.source==='manual'} onClick={()=>edit(e,'edit')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold"><Pencil size={13}/> Modificar</button><button type="button" disabled={blocked||e.source==='manual'} onClick={()=>edit(e,'delete')} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"><Trash2 size={13}/> Eliminar</button></div>
   </div>)}
   {!records.length?<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No hay dietas registradas entre las fechas seleccionadas. Cambia el período o añade una propuesta.</p>:null}</div>
  </div>
  {proposals.length?<div className="rounded-2xl border border-slate-200 bg-white p-5">
   <h3 className="mb-3 flex items-center gap-2 font-bold"><Wallet size={18} className="text-blue-600"/> Historial de revisiones</h3>
   <div className="space-y-2">{proposals.map(a=><div key={a.id} className="flex flex-wrap justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
    <div><strong>{dateLabel(a.diet_date)} · {a.operation==='add'?'Alta':a.operation==='edit'?'Modificación':'Eliminación'}</strong>
    <p className="mt-1 text-xs text-slate-600">{a.proposed_diet_type||'Sin dieta'} {a.proposed_percentage||''} · {a.reason}</p>
    {a.driver_observation?<p className="mt-1 text-xs text-blue-700">Comentario conductor: {a.driver_observation}</p>:null}</div>
    <span className={'self-start rounded-lg px-2 py-1 text-xs font-semibold '+(a.status==='accepted'?'bg-emerald-100 text-emerald-700':a.status==='disputed'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-800')}>{a.status==='accepted'?'Aceptada':a.status==='disputed'?'Disputada':'Pendiente'}</span>
   </div>)}</div>
  </div>:null}
 </section>;
}
