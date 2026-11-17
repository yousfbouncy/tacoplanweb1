'use client';
import {useEffect,useState} from 'react';
import {Plus,Trash2,Truck,ArrowLeft,ArrowRightLeft,Pencil,CalendarDays} from 'lucide-react';
import {supabase} from '@/lib/supabase';

type Driver={user_id:string;username:string;employee_name?:string|null};
type Stop={tipo:'CARGA'|'DESCARGA'|'ENTREGA_REMOLQUE';lugar:string;observaciones:string;fecha_cita?:string|null;hora_cita?:string|null;salidaConfirmada?:boolean};
type Trip={id:string;user_id:string;cliente?:string|null;modo_viaje?:string|null;estado?:string|null;paradas?:unknown;created_at:string;updated_at?:string|null};
const field='w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500';
const button='rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50';
const secondary='rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const blank=(tipo:Stop['tipo']='CARGA'):Stop=>({tipo,lugar:'',observaciones:'',fecha_cita:null,hora_cita:null});
const readStops=(trip:Trip):Stop[]=>Array.isArray(trip.paradas)?trip.paradas.filter((x):x is Stop=>Boolean(x)&&typeof x==='object'&&'tipo' in x&&'lugar' in x).map(x=>({...x,observaciones:x.observaciones||'',fecha_cita:x.fecha_cita||null,hora_cita:x.hora_cita||null})):[];

export default function TrafficTripAssignment({drivers,trips,refresh,blocked=false,initialDriverId='',onClose}:{drivers:Driver[];trips:Trip[];refresh:()=>Promise<void>;blocked?:boolean;initialDriverId?:string;onClose?:()=>void}){
 const [screen,setScreen]=useState<'list'|'detail'|'form'>('list');
 const [selectedId,setSelectedId]=useState('');
 const [editing,setEditing]=useState(false);
 const [driverId,setDriverId]=useState(initialDriverId);
 const [tipo,setTipo]=useState('CARGA_DESCARGA'),[cliente,setCliente]=useState(''),[remolque,setRemolque]=useState(''),[observaciones,setObservaciones]=useState('');
 const [paradas,setParadas]=useState<Stop[]>([blank('CARGA'),blank('DESCARGA')]);
 const [transferTo,setTransferTo]=useState(''),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 const [search,setSearch]=useState(''),[filter,setFilter]=useState('todos');
 const selected=trips.find(t=>t.id===selectedId);
 const name=(id:string)=>{const d=drivers.find(x=>x.user_id===id);return d?.employee_name||d?.username||'Conductor no disponible';};
 useEffect(()=>{if(initialDriverId){setDriverId(initialDriverId);setScreen('form');setEditing(false);}},[initialDriverId]);
 const reset=(id='')=>{setEditing(false);setSelectedId('');setDriverId(id);setTipo('CARGA_DESCARGA');setCliente('');setRemolque('');setObservaciones('');setParadas([blank('CARGA'),blank('DESCARGA')]);setMessage('');setScreen('form');};
 const inspect=(t:Trip)=>{setSelectedId(t.id);setScreen('detail');setMessage('');setTransferTo('');};
 const edit=(t:Trip)=>{setSelectedId(t.id);setEditing(true);setDriverId(t.user_id);setTipo(t.modo_viaje||'CARGA_DESCARGA');setCliente(t.cliente||'');setParadas(readStops(t).length?readStops(t):[blank('CARGA')]);setMessage('');setScreen('form');};
 const change=(index:number,key:keyof Stop,value:string)=>setParadas(old=>old.map((p,i)=>i===index?{...p,[key]:value}:p));
 const choose=(value:string)=>{setTipo(value);if(!editing)setParadas(value==='CARGA'?[blank('CARGA')]:value==='DESCARGA'?[blank('DESCARGA')]:value==='ENTREGA_REMOLQUE'?[blank('CARGA'),blank('ENTREGA_REMOLQUE')]:[blank('CARGA'),blank('DESCARGA')]);};
 const call=async(url:string,body:Record<string,unknown>)=>{
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)throw Error('Sesión caducada');
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify(body)});
  const data=await res.json();
  if(!res.ok)throw Error(data.error||'No se pudo completar la operación');
  return data;
 };
 const save=async(e:React.FormEvent)=>{
  e.preventDefault();if(saving||blocked)return;setSaving(true);setMessage('');
  try{
   if(!driverId||!drivers.some(d=>d.user_id===driverId))throw Error('Selecciona un conductor asignado');
   const body={driverId,tipo,cliente,remolque,observaciones,paradas};
   await call(editing?'/api/empresas/manage-trip':'/api/empresas/assign-trip',editing?{...body,tripId:selectedId,operation:'edit'}:body);
   await refresh();setMessage(editing?'Viaje actualizado correctamente':'Viaje asignado correctamente');
   setScreen('list');setEditing(false);
  }catch(error){setMessage(error instanceof Error?error.message:'No se pudo guardar el viaje');}
  finally{setSaving(false);}
 };
 const transfer=async()=>{
  if(!selected||!transferTo||transferTo===selected.user_id||blocked||saving)return;
  if(!window.confirm('¿Transferir este viaje a '+name(transferTo)+'? Dejará de estar asignado al conductor anterior.'))return;
  setSaving(true);setMessage('');
  try{await call('/api/empresas/manage-trip',{operation:'transfer',tripId:selected.id,driverId:transferTo});await refresh();setMessage('Viaje transferido a '+name(transferTo));setTransferTo('');}
  catch(error){setMessage(error instanceof Error?error.message:'No se pudo transferir');}
  finally{setSaving(false);}
 };
 const remove=async()=>{
  if(!selected||blocked||saving)return;
  if(!window.confirm('¿Eliminar definitivamente este viaje? Esta acción no se puede deshacer.'))return;
  setSaving(true);setMessage('');
  try{await call('/api/empresas/manage-trip',{operation:'delete',tripId:selected.id});await refresh();setScreen('list');setSelectedId('');setMessage('Viaje eliminado');}
  catch(error){setMessage(error instanceof Error?error.message:'No se pudo eliminar');}
  finally{setSaving(false);}
 };
 const filtered=trips.filter(t=>(filter==='todos'||(filter==='activos'?!/finaliz|complet|cerrad/i.test(t.estado||''): /finaliz|complet|cerrad/i.test(t.estado||'')))&&[t.cliente,name(t.user_id),t.estado].join(' ').toLowerCase().includes(search.toLowerCase()));
 return <section className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
   <div className="flex items-center gap-3"><Truck className="text-blue-600"/><div><h2 className="text-lg font-bold">Viajes</h2><p className="text-xs text-slate-500">Gestión de viajes, conductores, operaciones y citas</p></div></div>
   <div className="flex gap-2">{screen!=='list'?<button className={secondary} onClick={()=>setScreen('list')}><ArrowLeft size={15} className="inline"/> Volver a viajes</button>:null}{onClose?<button className={secondary} onClick={onClose}>Volver al conductor</button>:null}<button className={button} disabled={blocked} onClick={()=>reset()}><Plus size={15} className="inline"/> Nuevo viaje</button></div>
  </div>
  {message?<p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>:null}
  {screen==='list'?<div className="rounded-2xl border bg-white p-5">
   <div className="mb-4 flex flex-wrap gap-3"><input className={field+' max-w-sm'} aria-label="Buscar viajes" placeholder="Buscar cliente, conductor o estado" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filtrar viajes" className={field+' max-w-[190px]'} value={filter} onChange={e=>setFilter(e.target.value)}><option value="todos">Todos los viajes</option><option value="activos">En curso</option><option value="finalizados">Finalizados</option></select></div>
   <div className="space-y-2">{filtered.map(t=><button key={t.id} onClick={()=>inspect(t)} className="w-full rounded-xl border border-slate-200 p-4 text-left hover:border-blue-400 hover:bg-blue-50/30"><div className="flex flex-wrap justify-between gap-2"><strong>{t.cliente||'Sin cliente'}</strong><span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">{t.estado||'Sin estado'}</span></div><p className="mt-1 text-sm text-blue-700">Asignado a: {name(t.user_id)}</p><p className="mt-1 text-xs text-slate-500">{t.modo_viaje||'Operación'} · {new Date(t.created_at).toLocaleDateString('es-ES')}</p><p className="mt-1 text-xs">{readStops(t).map(x=>x.tipo+': '+x.lugar).join(' → ')||'Sin paradas'}</p></button>)}{!filtered.length?<p className="p-6 text-sm text-slate-500">No hay viajes para estos filtros.</p>:null}</div>
  </div>:null}
  {screen==='detail'&&selected?<div className="rounded-2xl border bg-white p-5">
   <div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-xl font-bold">{selected.cliente||'Viaje'}</h3><p className="text-sm text-blue-700">Conductor asignado: {name(selected.user_id)}</p><p className="text-xs text-slate-500">Estado: {selected.estado||'Sin estado'} · {selected.modo_viaje||'Operación'}</p></div><div className="flex flex-wrap gap-2"><button className={secondary} disabled={blocked} onClick={()=>edit(selected)}><Pencil size={15} className="inline"/> Editar</button><button className={secondary+' text-red-700'} disabled={blocked||saving} onClick={()=>void remove()}><Trash2 size={15} className="inline"/> Eliminar</button></div></div>
   <h4 className="mt-5 text-sm font-bold">Paradas y citas</h4><div className="mt-2 space-y-2">{readStops(selected).map((p,i)=><div key={i} className="rounded-xl bg-slate-50 p-3 text-sm"><strong>{i+1}. {p.tipo.replace('_',' ')} · {p.lugar}</strong><p className="text-xs text-slate-600">{p.fecha_cita?'Cita '+p.fecha_cita:'Sin fecha de cita'}{p.hora_cita?' a las '+p.hora_cita:''}</p>{p.observaciones?<p className="mt-1 text-xs">{p.observaciones}</p>:null}</div>)}</div>
   <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4"><h4 className="font-bold"><ArrowRightLeft size={17} className="mr-2 inline"/>Transferir a otro conductor</h4><p className="mt-1 text-xs text-slate-600">Solo conductores asignados a tu cuenta de Tráfico.</p><div className="mt-3 flex flex-wrap gap-2"><select aria-label="Nuevo conductor" className={field+' max-w-sm'} value={transferTo} onChange={e=>setTransferTo(e.target.value)}><option value="">Seleccionar conductor</option>{drivers.filter(d=>d.user_id!==selected.user_id).map(d=><option key={d.user_id} value={d.user_id}>{name(d.user_id)}</option>)}</select><button className={button} disabled={!transferTo||saving||blocked} onClick={()=>void transfer()}>Transferir viaje</button></div></div>
  </div>:null}
  {screen==='form'?<form className="space-y-4 rounded-2xl border bg-white p-5" onSubmit={e=>void save(e)}>
   <h3 className="font-bold">{editing?'Editar viaje':'Asignar nuevo viaje'}</h3>
   <div className="grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-semibold">Conductor<select required disabled={editing} className={field+' mt-1'} value={driverId} onChange={e=>setDriverId(e.target.value)}><option value="">Seleccionar conductor</option>{drivers.map(d=><option key={d.user_id} value={d.user_id}>{name(d.user_id)}</option>)}</select></label>
    <label className="text-sm font-semibold">Tipo de viaje<select className={field+' mt-1'} value={tipo} onChange={e=>choose(e.target.value)}><option value="CARGA_DESCARGA">Carga y descarga</option><option value="CARGA">Solo carga</option><option value="DESCARGA">Solo descarga</option><option value="ENTREGA_REMOLQUE">Cargar y soltar remolque</option></select></label>
    <label className="text-sm font-semibold">Cliente<input required maxLength={120} className={field+' mt-1'} value={cliente} onChange={e=>setCliente(e.target.value)}/></label>
    <label className="text-sm font-semibold">Matrícula / referencia de remolque<input maxLength={80} className={field+' mt-1'} value={remolque} onChange={e=>setRemolque(e.target.value)}/></label>
   </div>
   <h4 className="text-sm font-bold">Paradas, operaciones y citas</h4>
   <div className="space-y-3">{paradas.map((p,i)=><div key={i} className="space-y-2 rounded-xl border bg-slate-50 p-3">
    <div className="flex gap-2"><select className={field} aria-label={'Operación '+(i+1)} value={p.tipo} onChange={e=>change(i,'tipo',e.target.value)}><option value="CARGA">Carga</option><option value="DESCARGA">Descarga</option><option value="ENTREGA_REMOLQUE">Soltar remolque</option></select><button type="button" className={secondary} disabled={paradas.length===1} onClick={()=>setParadas(old=>old.filter((_,n)=>n!==i))} aria-label={'Eliminar parada '+(i+1)}><Trash2 size={16}/></button></div>
    <input className={field} aria-label={'Lugar '+(i+1)} required maxLength={200} placeholder="Lugar, ciudad y país" value={p.lugar} onChange={e=>change(i,'lugar',e.target.value)}/>
    <div className="grid gap-2 sm:grid-cols-2"><label className="text-xs text-slate-600">Fecha de cita (opcional)<input type="date" className={field+' mt-1'} value={p.fecha_cita||''} onChange={e=>change(i,'fecha_cita',e.target.value)}/></label><label className="text-xs text-slate-600">Hora de cita (opcional)<input type="time" className={field+' mt-1'} value={p.hora_cita||''} onChange={e=>change(i,'hora_cita',e.target.value)}/></label></div>
    <input className={field} aria-label={'Indicaciones '+(i+1)} maxLength={500} placeholder="Indicaciones de esta parada" value={p.observaciones} onChange={e=>change(i,'observaciones',e.target.value)}/>
   </div>)}<button type="button" className={secondary} disabled={paradas.length>=12} onClick={()=>setParadas(old=>[...old,blank()])}><Plus size={16} className="inline"/> Añadir parada</button></div>
   <label className="block text-sm font-semibold">Observaciones generales<textarea rows={3} className={field+' mt-1'} value={observaciones} onChange={e=>setObservaciones(e.target.value)}/></label>
   <p className="text-xs text-amber-800">Los cambios reales se guardan en Supabase. La sincronización de órdenes con las versiones móviles antiguas aún requiere validación.</p>
   <button className={button} type="submit" disabled={saving||blocked}>{saving?'Guardando…':editing?'Guardar cambios':'Asignar viaje'}</button>
  </form>:null}
 </section>;
}
