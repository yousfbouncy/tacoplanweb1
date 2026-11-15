'use client';
import {useState} from 'react';
import {Plus,Trash2,Truck} from 'lucide-react';
import {supabase} from '@/lib/supabase';

type Driver={user_id:string;username:string;employee_name?:string|null};
type Stop={tipo:'CARGA'|'DESCARGA'|'ENTREGA_REMOLQUE';lugar:string;observaciones:string};
type Trip={id:string;user_id:string;cliente?:string|null;modo_viaje?:string|null;estado?:string|null;paradas?:unknown;created_at:string};
const field='w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500';
const blank=(tipo:Stop['tipo']='CARGA'):Stop=>({tipo,lugar:'',observaciones:''});
export default function TrafficTripAssignment({drivers,trips,refresh,blocked=false}:{drivers:Driver[];trips:Trip[];refresh:()=>Promise<void>;blocked?:boolean}){
 const [driverId,setDriverId]=useState('');
 const [tipo,setTipo]=useState('CARGA_DESCARGA');
 const [cliente,setCliente]=useState('');
 const [remolque,setRemolque]=useState('');
 const [observaciones,setObservaciones]=useState('');
 const [paradas,setParadas]=useState<Stop[]>([blank('CARGA'),blank('DESCARGA')]);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 const change=(key:'tipo'|'lugar'|'observaciones',index:number,value:string)=>setParadas(s=>s.map((p,i)=>i===index?{...p,[key]:value}:p));
 const choose=(value:string)=>{
  setTipo(value);
  setParadas(value==='CARGA'?[blank('CARGA')]:value==='DESCARGA'?[blank('DESCARGA')]:value==='ENTREGA_REMOLQUE'?[blank('CARGA'),blank('ENTREGA_REMOLQUE')]:[blank('CARGA'),blank('DESCARGA')]);
 };
 const save=async(e:React.FormEvent)=>{
  e.preventDefault();setSaving(true);setMessage('');
  try{
   const {data:{session}}=await supabase.auth.getSession();
   if(!session)throw Error('Sesión caducada');
   const res=await fetch('/api/empresas/assign-trip',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({driverId,tipo,cliente,remolque,observaciones,paradas})});
   const result=await res.json();
   if(!res.ok)throw Error(result.error||'No se pudo guardar');
   setMessage('Viaje asignado en Supabase. Se muestra en Tráfico; para recibirlo en Tacoplan móvil hace falta la actualización de sincronización.');
   setCliente('');setRemolque('');setObservaciones('');setParadas([blank('CARGA'),blank('DESCARGA')]);setTipo('CARGA_DESCARGA');
   await refresh();
  }catch(err){setMessage(err instanceof Error?err.message:'Error al asignar viaje');}
  finally{setSaving(false);}
 };
 return <div className="space-y-5">
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
   <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-3 text-blue-600"><Truck size={20}/></span><div><h2 className="text-lg font-bold">Asignar viaje a un conductor</h2><p className="text-xs text-slate-500">Cargas, descargas y entrega de remolque sin descarga</p></div></div>
   <form className="mt-5 space-y-4" onSubmit={e=>void save(e)}>
    <div className="grid gap-4 sm:grid-cols-2">
     <label className="text-sm font-semibold">Conductor<select required className={field+' mt-1'} value={driverId} onChange={e=>setDriverId(e.target.value)}><option value="">Seleccionar conductor</option>{drivers.map(d=><option key={d.user_id} value={d.user_id}>{d.employee_name||d.username}</option>)}</select></label>
     <label className="text-sm font-semibold">Tipo de viaje<select className={field+' mt-1'} value={tipo} onChange={e=>choose(e.target.value)}><option value="CARGA_DESCARGA">Carga y descarga</option><option value="CARGA">Solo carga</option><option value="DESCARGA">Solo descarga</option><option value="ENTREGA_REMOLQUE">Cargar y soltar remolque (sin descargar)</option></select></label>
     <label className="text-sm font-semibold">Cliente<input required maxLength={120} className={field+' mt-1'} value={cliente} onChange={e=>setCliente(e.target.value)} placeholder="Empresa o cliente"/></label>
     <label className="text-sm font-semibold">Matrícula / referencia del remolque<input maxLength={80} className={field+' mt-1'} value={remolque} onChange={e=>setRemolque(e.target.value)} placeholder="Ej. R-1234-BCD"/></label>
    </div>
    <div className="space-y-3"><h3 className="text-sm font-bold">Paradas y operaciones</h3>{paradas.map((p,i)=><div key={i} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[160px_1fr_1fr_auto]">
     <select aria-label={'Operación '+(i+1)} className={field} value={p.tipo} onChange={e=>change('tipo',i,e.target.value)}><option value="CARGA">Carga</option><option value="DESCARGA">Descarga</option><option value="ENTREGA_REMOLQUE">Soltar remolque</option></select>
     <input required maxLength={200} aria-label={'Destino '+(i+1)} className={field} value={p.lugar} onChange={e=>change('lugar',i,e.target.value)} placeholder="Lugar, ciudad y país"/>
     <input maxLength={500} aria-label={'Observaciones de parada '+(i+1)} className={field} value={p.observaciones} onChange={e=>change('observaciones',i,e.target.value)} placeholder="Indicaciones de esta parada"/>
     <button type="button" aria-label={'Eliminar parada '+(i+1)} className="rounded-xl border p-2 text-slate-600 disabled:opacity-40" disabled={paradas.length===1} onClick={()=>setParadas(s=>s.filter((_,n)=>n!==i))}><Trash2 size={17}/></button>
    </div>)}<button type="button" disabled={paradas.length>=12} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold" onClick={()=>setParadas(s=>[...s,blank('CARGA')])}><Plus size={16}/> Añadir parada</button></div>
    <label className="block text-sm font-semibold">Observaciones generales<textarea maxLength={1000} rows={3} className={field+' mt-1'} value={observaciones} onChange={e=>setObservaciones(e.target.value)} placeholder="Instrucciones, horarios, contacto, documentación…"/></label>
    <p className="text-xs text-amber-800">La orden se guarda en Supabase y aparece en el panel de Tráfico. La versión móvil instalada aún no descarga órdenes asignadas desde la web.</p>
    <button disabled={saving||blocked||!drivers.length} type="submit" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving?'Guardando…':'Asignar viaje'}</button>
    {message?<p role="status" className="text-sm text-blue-700">{message}</p>:null}
   </form>
  </div>
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold">Viajes registrados del equipo</h3><div className="mt-3 space-y-2">{trips.slice(0,30).map(t=><div key={t.id} className="rounded-xl border border-slate-100 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{t.cliente||'Sin cliente'}</strong><span className="text-xs text-slate-500">{t.estado||'Sin estado'}</span></div><p className="mt-1 text-xs text-slate-500">{drivers.find(d=>d.user_id===t.user_id)?.employee_name||drivers.find(d=>d.user_id===t.user_id)?.username||'Conductor'} · {t.modo_viaje||'Operación'}</p>{Array.isArray(t.paradas)?<p className="mt-1 text-xs text-slate-700">{t.paradas.map((p:any)=>p.tipo+': '+p.lugar).join(' → ')}</p>:null}</div>)}{!trips.length?<p className="text-sm text-slate-500">Todavía no hay viajes sincronizados.</p>:null}</div></div>
 </div>;
}
