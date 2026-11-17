'use client';
import {useMemo,useState} from 'react';
import {ArrowLeft,CalendarDays,CheckCircle2,ChevronRight,Plus,Search,Trash2,Pencil,Wallet} from 'lucide-react';
import {supabase} from '@/lib/supabase';

export type Driver={user_id:string;username:string;employee_name?:string|null};
export type Entry={id:string;driver_id:string;source:'jornada'|'natural_day';date:string;type:string|null;percentage:number|null;pluses:string[];day_flag?:string|null};
export type Adjustment={id:string;driver_id:string;diet_date:string;target_kind:string;target_id?:string|null;operation:'add'|'edit'|'delete';original_diet_type?:string|null;proposed_diet_type?:string|null;proposed_percentage?:number|null;reason:string;status:string;driver_observation?:string|null;created_at:string};
type Form={operation:'add'|'edit'|'delete';targetKind:'jornada'|'natural_day'|'manual';targetId:string;date:string;dietType:string;percentage:number;plusTypes:string[];reason:string};
const field='w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500';
const dateLabel=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):s;
const kinds:{type:string;label:string}[]=[{type:'NACIONAL',label:'Nacional'},{type:'INTERNACIONAL',label:'Internacional'},{type:'REGIONAL',label:'Regional'}];
const newForm=(date:string):Form=>({operation:'add',targetKind:'manual',targetId:'',date,dietType:'NACIONAL',percentage:100,plusTypes:[],reason:''});
const baseType=(s:string|null)=>kinds.find(k=>s?.toUpperCase().includes(k.type))?.type||'NACIONAL';
const label=(kind:string)=>kind==='natural_day'?'Día natural':'Jornada';
export default function TrafficDietManager({drivers,entries,adjustments,plusOptions,blocked=false,refresh}:{
 drivers:Driver[];entries:Entry[];adjustments:Adjustment[];plusOptions:Record<string,string[]>;
 blocked?:boolean;refresh:()=>Promise<void>;
}){
 const [selected,setSelected]=useState('');
 const [query,setQuery]=useState('');
 const [month,setMonth]=useState(new Date().toISOString().slice(0,7));
 const [form,setForm]=useState<Form|null>(null);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 const driver=drivers.find(d=>d.user_id===selected);
 const name=(d:Driver)=>d.employee_name||d.username;
 const records=useMemo(()=>entries.filter(e=>e.driver_id===selected&&(!month||e.date.startsWith(month)))
  .sort((a,b)=>b.date.localeCompare(a.date)),[entries,selected,month]);
 const proposals=useMemo(()=>adjustments.filter(a=>a.driver_id===selected&&(!month||a.diet_date.startsWith(month)))
  .sort((a,b)=>b.created_at.localeCompare(a.created_at)),[adjustments,selected,month]);
 const list=drivers.filter(d=>name(d).toLowerCase().includes(query.toLowerCase())||d.username.toLowerCase().includes(query.toLowerCase()));
 const edit=(e:Entry,op:'edit'|'delete')=>{setForm({operation:op,targetKind:e.source,targetId:e.id,
  date:e.date,dietType:baseType(e.type),percentage:[30,60,100].includes(Number(e.percentage))?Number(e.percentage):100,
  plusTypes:[],reason:''});setMessage('');};
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
      dietType:form.dietType,percentage:form.percentage,plusTypes:form.plusTypes,reason:form.reason})});
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
    {list.map(d=><button type="button" key={d.user_id} onClick={()=>{setSelected(d.user_id);setForm(null);setMessage('');}} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-blue-400 hover:bg-blue-50">
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
     <button type="button" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50" aria-label="Volver a los conductores" onClick={()=>{setSelected('');setForm(null);}}><ArrowLeft size={19}/></button>
     <div><h2 className="text-xl font-bold">{name(driver)}</h2><p className="text-xs text-slate-500">Dietas y pluses del conductor · @{driver.username}</p></div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
     <label className="text-xs font-semibold text-slate-600">Periodo <input type="month" className={field+' mt-1'} value={month} onChange={e=>setMonth(e.target.value)}/></label>
     <button disabled={blocked} type="button" onClick={()=>setForm(newForm(month+'-01'))}
       className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16}/> Añadir dieta</button>
    </div>
   </div>
   <div className="mt-4 flex flex-wrap gap-2 text-xs">
    <span className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700">{records.length} registros en el periodo</span>
    <span className="rounded-lg bg-amber-50 px-3 py-2 font-semibold text-amber-700">{proposals.filter(p=>p.status==='awaiting_driver').length} pendientes de respuesta</span>
   </div>
   <p className="mt-3 text-xs text-slate-500">Las propuestas de Tráfico no borran los registros originales: el conductor puede aceptarlas o dejar una discrepancia. Solo se muestran datos compartidos con la empresa.</p>
  </div>
  {message?<div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div>:null}
  {form?<div className="rounded-2xl border border-blue-200 bg-white p-5">
   <h3 className="font-bold">{form.operation==='add'?'Añadir dieta':form.operation==='delete'?'Proponer eliminar dieta':'Modificar dieta'} · {dateLabel(form.date)}</h3>
   <div className="mt-3 grid gap-3 sm:grid-cols-3">
    <label className="text-xs font-semibold text-slate-600">Fecha<input type="date" disabled={form.operation!=='add'} className={field+' mt-1'} value={form.date} onChange={e=>setForm(f=>f?{...f,date:e.target.value}:f)}/></label>
    {form.operation!=='delete'?<><label className="text-xs font-semibold text-slate-600">Tipo<select className={field+' mt-1'} value={form.dietType} onChange={e=>setForm(f=>f?{...f,dietType:e.target.value}:f)}>{kinds.map(k=><option key={k.type} value={k.type}>{k.label}</option>)}</select></label>
     <label className="text-xs font-semibold text-slate-600">Porcentaje<select className={field+' mt-1'} value={form.percentage} onChange={e=>setForm(f=>f?{...f,percentage:Number(e.target.value)}:f)}>{[100,60,30].map(n=><option key={n} value={n}>{n}%</option>)}</select></label></>:null}
   </div>
   {form.operation!=='delete' && (plusOptions[driver.user_id]||[]).length?<div className="mt-3"><p className="text-xs font-semibold">Pluses</p><div className="mt-2 flex flex-wrap gap-3">{plusOptions[driver.user_id].map(p=><label key={p} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.plusTypes.includes(p)} onChange={e=>setForm(f=>f?{...f,plusTypes:e.target.checked?[...f.plusTypes,p]:f.plusTypes.filter(x=>x!==p)}:f)}/>{p.replace(/_/g,' ')}</label>)}</div></div>:null}
   <label className="mt-3 block text-xs font-semibold text-slate-600">Motivo de la propuesta<textarea className={field+' mt-1'} rows={3} maxLength={2000} value={form.reason} onChange={e=>setForm(f=>f?{...f,reason:e.target.value}:f)} placeholder="Explica por qué hay que añadir, modificar o eliminar la dieta"/></label>
   <div className="mt-3 flex gap-2"><button type="button" disabled={saving||blocked||form.reason.trim().length<10||!form.date} onClick={()=>void save()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving?'Guardando…':'Enviar propuesta'}</button><button type="button" onClick={()=>setForm(null)} className="rounded-xl border px-4 py-2.5 text-sm">Cancelar</button></div>
  </div>:null}
  <div className="rounded-2xl border border-slate-200 bg-white p-5">
   <h3 className="mb-3 flex items-center gap-2 font-bold"><CalendarDays size={18} className="text-blue-600"/> Dietas registradas</h3>
   <div className="space-y-2">{records.map(e=><div key={e.source+e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50">
    <div><p className="font-semibold text-slate-900">{dateLabel(e.date)} · {e.type||'Sin tipo'} {e.percentage?e.percentage+'%':''}</p>
    <p className="text-xs text-slate-500">{label(e.source)}{e.pluses?.length?' · '+e.pluses.join(', '):''}{e.day_flag?' · '+e.day_flag:''}</p></div>
    <div className="flex gap-2"><button type="button" disabled={blocked} onClick={()=>edit(e,'edit')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold"><Pencil size={13}/> Modificar</button><button type="button" disabled={blocked} onClick={()=>edit(e,'delete')} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"><Trash2 size={13}/> Eliminar</button></div>
   </div>)}
   {!records.length?<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No hay dietas registradas para este mes. Cambia el periodo o añade una propuesta.</p>:null}</div>
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
