'use client';
import {useEffect,useMemo,useState} from 'react';
import {Activity,AlertCircle,ArrowRight,BarChart3,CheckCircle2,ChevronDown,Clock3,FileText,Filter,LayoutDashboard,LogOut,Menu,Plus,RefreshCw,Search,ShieldCheck,Truck,Users,Wallet, X} from 'lucide-react';
import {supabase} from '@/lib/supabase';

type Driver={user_id:string;username:string;employee_name?:string|null;joined_at?:string};
type Journey={id:string;user_id:string;fecha_inicio?:string|null;fecha_fin?:string|null;hora_inicio?:string|null;hora_fin?:string|null;start_at?:string|null;end_at?:string|null;lugar_inicio?:string|null;lugar_fin?:string|null;tipo_ruta?:string|null;dieta_manual_tipo?:string|null;dieta_percent?:number|null;conduccion_min?:number|null;tacho_driving_min?:number|null;tacho_work_min?:number|null;tacho_available_min?:number|null;tacho_rest_min?:number|null;planned_rest_min?:number|null;planned_rest_type?:string|null;legal_summary?:LegalInfo|null};
type Review={id:string;driver_id:string;jornada_id?:string;jornada_date?:string|null;status:string;original_diet_type?:string|null;proposed_diet_type?:string|null;original_amount?:number;proposed_amount?:number|null;automatic_plus?:number;automatic_plus_concept?:string|null;original_pluses?:Array<{concepto:string;importe:number}>;proposed_pluses?:Array<{concepto:string;importe:number}>|null;traffic_observation?:string|null;driver_observation?:string|null;change_reason?:string|null};
type ActivityRow={user_id:string;tipo:string;inicio:string;fin:string|null;updated_at:string};
type Trip={id:string;user_id:string;cliente?:string|null;modo_viaje?:string|null;fin_lugar?:string|null;estado?:string|null;paradas?:unknown;created_at:string;updated_at?:string|null};
type LegalInfo={jornada_maxima_min?:number;max_jornada_min?:number;jornadaMaximaMin?:number;limit_verified?:boolean};
type OperationalLimit={maximum:780|900;label:string}|null;
// Never infer an authorized 15-hour duty window from the number of reduced rests alone.
function verifiedDutyLimit(j?:Journey):OperationalLimit{
 const legal=j?.legal_summary;
 if(!legal||legal.limit_verified!==true)return null;
 const n=Number(legal.jornada_maxima_min??legal.max_jornada_min??legal.jornadaMaximaMin);
 return n===900?{maximum:900,label:'15 h'}:n===780?{maximum:780,label:'13 h'}:null;
}
function tripDestination(trip:Trip):string|null{
 if(!Array.isArray(trip.paradas))return null;
 const stop=trip.paradas.find((p:unknown)=>p&&typeof p==='object'&&!Array.isArray(p)&&['destino','destination','entrega'].includes(String((p as Record<string,unknown>).tipo||'').toLowerCase()))
  || trip.paradas[trip.paradas.length-1];
 if(typeof stop==='string')return stop.trim()||null;
 if(!stop||typeof stop!=='object')return null;
 const p=stop as Record<string,unknown>;
 for(const key of ['destino','destination','lugar','localidad','direccion','ubicacion','nombre']){
  const value=p[key];if(typeof value==='string'&&value.trim())return value.trim();
 }
 return null;
}
function currentTrip(trips:Trip[],userId:string):Trip|undefined{
 return trips.find(t=>t.user_id===userId&&/^(activo|activa|en curso|en_curso|in_progress|ongoing|iniciado|iniciada)$/i.test((t.estado||'').trim()));
}
function dutyCountdown(j:Journey|undefined,now:number){
 if(!j||j.fecha_fin&&j.hora_fin)return null;
 const limit=verifiedDutyLimit(j);
 const start=validDate(dt(j.fecha_inicio,j.hora_inicio));
 if(!start||!limit)return null;
 const left=Math.max(0,limit.maximum-Math.floor((now-start.getTime())/60000));
 return {label:limit.label,remaining:hours(left),end:new Date(start.getTime()+limit.maximum*60000).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}),expired:now>start.getTime()+limit.maximum*60000};
}
type WorkspaceView={member:{role:'traffic'|'hr';username:string;company_id:string};company?:{name:string;subscription_status:string};drivers?:Driver[];trafficMembers?:Driver[];assignments?:Array<{driver_id:string;traffic_user_id:string}>;jornadas?:Journey[];activities?:ActivityRow[];trips?:Trip[];reviews?:Review[];closures?:Array<{id:string;driver_id:string;month:string;total_diets:number;total_pluses?:number;closed_at:string}>;plusOptions?:Record<string,string[]>;blocked?:boolean};
type Props={view:WorkspaceView;busy:boolean;loading:boolean;error:string;message:string;refresh:()=>Promise<void>;onAction:(body:Record<string,unknown>)=>Promise<unknown>;signOut:()=>Promise<unknown>|void};
type Page='resumen'|'conductores'|'jornadas'|'dietas'|'informes'|'asignaciones';
const euro=(n:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);
const field='w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const primary='inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';
const secondary='inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const card='rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_18px_rgba(16,35,70,.045)]';
const todayMonth=()=>new Date().toISOString().slice(0,7);
const dt=(day?:string|null,time?:string|null)=>day&&time?new Date(day+'T'+time+':00'):null;
const validDate=(d:Date|null)=>d&&!Number.isNaN(d.getTime())?d:null;
const hours=(n?:number|null)=>n==null?'Sin datos':Math.floor(n/60)+' h '+String(n%60).padStart(2,'0')+' min';
const labels:Record<string,string>={confirmed:'Confirmada',accepted:'Aceptada',closed:'Cerrada',awaiting_driver:'Pendiente del conductor',disputed:'En discrepancia'};
const approved=(r:Review)=>['confirmed','accepted','closed'].includes(r.status);
const gross=(r:Review)=>Number(r.status==='accepted'?r.proposed_amount??r.original_amount:r.original_amount)||0;
const items=(r:Review)=>r.status==='accepted'&&r.proposed_pluses!=null?r.proposed_pluses:r.original_pluses||[];
const components=(r:Review)=>{const base=gross(r),auto=Math.min(base,Number(r.automatic_plus)||0);const extras=items(r).filter(p=>!/dieta|n[oó]mina|salario|sueldo|anticipo/i.test(p.concepto)).reduce((a,p)=>a+(Number(p.importe)||0),0);return {diet:Math.max(0,base-auto),plus:auto+extras,total:base+extras};};
const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join('')||'TP';
const status=(j?:Journey,activity?:ActivityRow)=>{
 if(!j)return 'Sin jornada';
 if(j.fecha_fin&&j.hora_fin)return 'Finalizada';
 const start=validDate(dt(j.fecha_inicio,j.hora_inicio));
 if(!start||start.getTime()>Date.now()+120000)return 'Pendiente de inicio';
 if(Date.now()-start.getTime()>36*3600000)return 'Sin cierre (antigua)';
 if(activity&&activity.fin===null&&Date.now()-new Date(activity.updated_at).getTime()<15*60000){
  const t=activity.tipo.toLowerCase();
  if(/conduc|driv/.test(t))return 'Conduciendo';
  if(/dispon|avail/.test(t))return 'Disponibilidad';
  if(/descans|pausa|rest|break/.test(t))return 'Descanso';
  if(/trabaj|work/.test(t))return 'Otros trabajos';
 }
 return 'Abierta · sin actividad actual';
};
function Pill({value}:{value:string}){
 const green=value==='Conduciendo'||value==='Confirmada'||value==='Aceptada';
 const amber=value==='Disponibilidad'||value.includes('Pendiente')||value.includes('sin actividad')||value.includes('Sin cierre');
 return <span className={'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold '+(green?'bg-emerald-50 text-emerald-700':amber?'bg-amber-50 text-amber-700':'bg-slate-100 text-slate-600')}><span className={'h-1.5 w-1.5 rounded-full '+(green?'bg-emerald-500':amber?'bg-amber-500':'bg-slate-400')}/>{value}</span>;
}
function Stat({label,value,sub,icon:Icon}:{label:string;value:string|number;sub:string;icon:typeof Users}){
 return <div className={card+' min-h-[124px]'}><div className="flex justify-between gap-2"><p className="text-xs font-semibold text-slate-500">{label}</p><span className="rounded-xl bg-blue-50 p-2 text-blue-600"><Icon size={18}/></span></div><p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-400">{sub}</p></div>;
}
export default function EnterpriseWorkspace({view,busy,loading,error,message,refresh,onAction,signOut}:Props){
 const traffic=view.member.role==='traffic';
 const [page,setPage]=useState<Page>('resumen');
 const [drawer,setDrawer]=useState<string|null>(null);
 const [selectedJourney,setSelectedJourney]=useState<string>('');
 const [q,setQ]=useState('');
 const [filter,setFilter]=useState('todos');
 const [month,setMonth]=useState(todayMonth);
 const [mobileMenu,setMobileMenu]=useState(false);
 const [mode,setMode]=useState<'confirm'|'propose'>('confirm');
 const [dietTypes,setDietTypes]=useState<string[]>([]);
 const [plusTypes,setPlusTypes]=useState<string[]>([]);
 const [reason,setReason]=useState('');
 const [observation,setObservation]=useState('');
 const [chosenAssignment,setChosenAssignment]=useState<Record<string,string>>({});
 const [notice,setNotice]=useState('');
 const [closing,setClosing]=useState(false);
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),30000);return()=>window.clearInterval(timer);},[]);
 const drivers=view.drivers||[],journeys=view.jornadas||[],reviews=view.reviews||[],activities=view.activities||[],trips=view.trips||[];
 const display=(d:Driver)=>d.employee_name||d.username;
 const byId=(id:string)=>drivers.find(d=>d.user_id===id);
 const latest=new Map<string,Journey>();
 for(const j of journeys)if(!latest.has(j.user_id))latest.set(j.user_id,j);
 const latestActivities=new Map<string,ActivityRow>();
 for(const a of activities)if(!latestActivities.has(a.user_id))latestActivities.set(a.user_id,a);
 const state=(d:Driver)=>status(latest.get(d.user_id),latestActivities.get(d.user_id));
 const journeyLimit=(d:Driver)=>dutyCountdown(latest.get(d.user_id),now);
 const tripFor=(d:Driver)=>currentTrip(trips,d.user_id);
 const operating=(d:Driver)=>{
  const j=latest.get(d.user_id),a=latestActivities.get(d.user_id),t=tripFor(d),limit=journeyLimit(d),s=state(d);
  const opened=Boolean(j)&&!(j?.fecha_fin&&j?.hora_fin)&&s!=='Sin cierre (antigua)'&&s!=='Pendiente de inicio';
  return <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 p-4">
   <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-slate-900">{display(d)}</strong><Pill value={s}/></div>
   <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
    <div className="rounded-xl bg-white p-3"><p className="text-slate-500">Inicio de jornada</p><p className="mt-1 font-bold">{j?.fecha_inicio||'—'} · {j?.hora_inicio||'—'}</p></div>
    <div className="rounded-xl bg-white p-3"><p className="text-slate-500">Tiempo restante de jornada</p><p className="mt-1 text-base font-bold">{opened?(limit?limit.remaining:'Pendiente de verificar'):'Sin jornada activa'}</p>{limit&&opened?<p className="mt-1 text-slate-500">Límite {limit.label} · hasta {limit.end}{limit.expired?' · límite superado':''}</p>:opened?<p className="mt-1 text-amber-700">13/15 h: falta límite legal sincronizado</p>:null}</div>
   </div>
   <div className="mt-3 rounded-xl bg-white p-3 text-xs"><p className="font-semibold text-slate-500">Actividad en curso</p><p className="mt-1 font-bold text-slate-900">{opened&&a&&a.fin===null&&Number.isFinite(new Date(a.updated_at).getTime())&&now-new Date(a.updated_at).getTime()<15*60000?status(j,a):'Sin actividad reciente sincronizada'}</p>{a?.updated_at?<p className="mt-1 text-slate-500">Última actualización: {new Date(a.updated_at).toLocaleString('es-ES')}</p>:null}</div>
   <div className="mt-2 rounded-xl bg-white p-3 text-xs"><p className="font-semibold text-slate-500">Viaje en curso · Tacoplan móvil</p><p className="mt-1 font-bold text-slate-900">{t?'Destino: '+(tripDestination(t)||'No registrado'):'Sin viaje activo sincronizado'}</p>{t?.cliente?<p className="mt-1 text-slate-600">Cliente: {t.cliente}</p>:null}</div>
  </div>;
 };
 const active=drivers.filter(d=>{const s=state(d);return s==='Conduciendo'||s==='Disponibilidad'||s==='Descanso'||s==='Otros trabajos'||s==='Abierta · sin actividad actual'}).length;
 const driving=drivers.filter(d=>state(d)==='Conduciendo').length;
 const available=drivers.filter(d=>state(d)==='Disponibilidad').length;
 const resting=drivers.filter(d=>state(d)==='Descanso').length;
 const ended=drivers.filter(d=>state(d)==='Finalizada').length;
 const selectedDriver=drawer?byId(drawer):undefined;
 const driverJourneys=selectedDriver?journeys.filter(j=>j.user_id===selectedDriver.user_id):[];
 const chosen=journeys.find(j=>j.id===selectedJourney);
 const currentReviews=reviews.filter(r=>r.jornada_date?.startsWith(month));
 const approvedReviews=currentReviews.filter(approved);
 const monthGroups=drivers.map(d=>{const all=currentReviews.filter(r=>r.driver_id===d.user_id);const ok=all.filter(approved);const summed=ok.reduce((acc,r)=>{const p=components(r);return {diet:acc.diet+p.diet,plus:acc.plus+p.plus,total:acc.total+p.total};},{diet:0,plus:0,total:0});return {driver:d,all,ok,summed,pending:all.filter(r=>r.status==='awaiting_driver').length,disputed:all.filter(r=>r.status==='disputed').length};});
 const total=monthGroups.reduce((sum,x)=>sum+x.summed.total,0);
 const sumPlus=monthGroups.reduce((sum,x)=>sum+x.summed.plus,0);
 const filtered=drivers.filter(d=>{
  const j=latest.get(d.user_id);
  const query=q.trim().toLowerCase();
  const search=[display(d),d.username,j?.lugar_inicio,j?.lugar_fin].join(' ').toLowerCase().includes(query);
  const s=state(d);
  return search&&(filter==='todos'||(filter==='activa'&&s!=='Finalizada'&&s!=='Sin jornada'&&!s.includes('antigua')&&s!=='Pendiente de inicio')||(filter==='finalizada'&&s==='Finalizada')||(filter==='sincronizar'&&(s.includes('sin actividad')||s==='Sin jornada'||s.includes('antigua'))));
 });
 const dietChoices=['REGIONAL','NACIONAL','INTERNACIONAL'].flatMap(t=>[30,60,100].map(n=>({value:t+'_'+n,label:t.charAt(0)+t.slice(1).toLowerCase()+' '+n+' %'})));
 const navigate=(next:Page)=>{setPage(next);setMobileMenu(false);setDrawer(null);setNotice('');};
 const chooseJourney=(j:Journey)=>{
  setSelectedJourney(j.id);setDrawer(j.user_id);setMode('confirm');setReason('');setObservation('');
  const v=(j.dieta_manual_tipo||j.tipo_ruta||'').toUpperCase()+'_'+(j.dieta_percent||100);
  setDietTypes(dietChoices.some(x=>x.value===v)?[v]:[]);setPlusTypes([]);
 };
 const performReview=async()=>{
  if(!chosen)return;
  const result=await onAction({action:'review',jornadaId:chosen.id,driverId:chosen.user_id,mode,dietTypes,plusTypes,reason,observation});
  if(result){setNotice(mode==='confirm'?'Dieta confirmada.':'Propuesta registrada para revisión del conductor.');setSelectedJourney('');await refresh();}
 };
 const saveAssignment=async(driverId:string)=>{
  const existing=view.assignments?.find(a=>a.driver_id===driverId)?.traffic_user_id||'';
  const target=Object.prototype.hasOwnProperty.call(chosenAssignment,driverId)?chosenAssignment[driverId]:existing;
  if(await onAction({action:'assign_driver',driverId,trafficUserId:target||null})){setNotice('Asignación actualizada.');await refresh();}
 };
 const closeMonth=async()=>{
  if(closing||!window.confirm('¿Cerrar el mes '+month+' con las dietas confirmadas? Los cambios posteriores requerirán una regularización.'))return;
  setClosing(true);setNotice('');
  try{
   const {data}=await supabase.auth.getSession();
   const token=data.session?.access_token;if(!token)throw Error('Sesión no disponible');
   const r=await fetch('/api/empresas/payroll',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({month})});
   const result=await r.json();if(!r.ok)throw Error(result.error||'No se pudo cerrar el mes');
   setNotice('Cierre mensual guardado para '+result.drivers+' conductores.');await refresh();
  }catch(e:unknown){setNotice(e instanceof Error?e.message:'Error al cerrar el mes');}
  finally{setClosing(false);}
 };
 const menu: Array<{id:Page;label:string;icon:typeof Users}> = traffic?[
  {id:'resumen',label:'Resumen',icon:LayoutDashboard},{id:'conductores',label:'Conductores',icon:Users},{id:'jornadas',label:'Jornadas',icon:Clock3},{id:'dietas',label:'Dietas y pluses',icon:Wallet},{id:'informes',label:'Informes',icon:BarChart3}
 ]:[
  {id:'resumen',label:'Resumen',icon:LayoutDashboard},{id:'conductores',label:'Conductores',icon:Users},{id:'dietas',label:'Liquidación mensual',icon:Wallet},{id:'asignaciones',label:'Asignar Tráfico',icon:Users},{id:'informes',label:'Informes',icon:BarChart3}
 ];
 const selectedTitle=menu.find(m=>m.id===page)?.label||'Resumen';
 const table=<div className={card+' overflow-hidden !p-0'}>
  <div className="flex flex-wrap items-start justify-between gap-3 p-5"><div><h2 className="text-base font-bold text-slate-900">Equipo de conductores</h2><p className="mt-1 text-xs text-slate-500">Consulta únicamente los conductores que tienes asignados.</p></div><span className="text-xs text-slate-500">{filtered.length} de {drivers.length} conductores</span></div>
  <div className="flex flex-wrap gap-3 px-5 pb-4"><div className="relative min-w-[200px] flex-1 sm:max-w-xs"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input className={field+' pl-9'} value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar conductor o trayecto…"/></div><select className={field+' !w-auto'} value={filter} onChange={e=>setFilter(e.target.value)}><option value="todos">Todos los estados</option><option value="activa">Jornadas abiertas</option><option value="finalizada">Finalizadas</option><option value="sincronizar">Sin actividad actual</option></select></div>
  <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Conductor</th><th className="px-3 py-3">Actividad actual</th><th className="px-3 py-3">Trayecto / localización</th><th className="px-3 py-3">Jornada / referencia</th><th className="px-3 py-3">Dieta</th><th className="px-3 py-3">Acción</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((d,i)=>{
  const j=latest.get(d.user_id);const start=validDate(dt(j?.fecha_inicio,j?.hora_inicio));const stop=validDate(dt(j?.fecha_fin,j?.hora_fin));const min=start&&start.getTime()<=Date.now()?Math.max(0,Math.round(((stop||new Date()).getTime()-start.getTime())/60000)):null;const limit=journeyLimit(d);const maximum=verifiedDutyLimit(j)?.maximum;const pr=min!=null&&maximum?Math.min(100,Math.round(min/maximum*100)):0;
  return <tr key={d.user_id} className="hover:bg-slate-50/80"><td className="px-4 py-3"><div className="flex items-center gap-2.5"><span className={'flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white '+(['bg-blue-600','bg-teal-600','bg-indigo-600','bg-amber-600'][i%4])}>{initials(display(d))}</span><span><strong className="block text-slate-800">{display(d)}</strong><span className="text-[11px] text-slate-400">@{d.username}</span></span></div></td>
   <td className="px-3 py-3"><Pill value={state(d)}/></td>
   <td className="px-3 py-3"><strong className="block max-w-[200px] truncate text-slate-800">{tripFor(d)?'Viaje: '+(tripDestination(tripFor(d)!)||'Destino no registrado'):(j?.lugar_inicio||'Sin origen')+' → '+(j?.lugar_fin||'Pendiente')}</strong><span className="text-[11px] text-slate-400">Ubicación en vivo: no disponible</span></td>
   <td className="px-3 py-3"><strong>{min==null?'—':hours(min)}</strong><span className="text-slate-400"> {limit?' / '+limit.label:' · límite sin verificar'}</span><div className="mt-1.5 h-1.5 w-28 rounded-full bg-slate-100"><div className={'h-1.5 rounded-full '+(pr>85?'bg-amber-500':'bg-blue-500')} style={{width:pr+'%'}}/></div></td>
   <td className="px-3 py-3 text-slate-600">{j?.dieta_manual_tipo||j?.tipo_ruta||'No registrada'}{j?.dieta_percent?' '+j.dieta_percent+' %':''}</td>
   <td className="px-3 py-3"><button className={secondary+' !px-3 !py-1.5 !text-xs text-blue-600'} onClick={()=>{setDrawer(d.user_id);setSelectedJourney('');}}>Ver ficha</button></td>
  </tr>;
 })}</tbody></table>{!filtered.length?<p className="p-6 text-sm text-slate-500">No se encontraron conductores con estos filtros.</p>:null}</div>
 </div>;
 const selectedGroup=selectedDriver?monthGroups.find(x=>x.driver.user_id===selectedDriver.user_id):null;
 const hrTable=<div className={card+' overflow-hidden !p-0'}>
  <div className="flex flex-wrap items-start justify-between gap-3 p-5"><div><h2 className="text-base font-bold">Liquidación por conductor</h2><p className="text-xs text-slate-500">Importes confirmados del periodo seleccionado, incluidos pluses automáticos ya registrados.</p></div><label className="text-xs font-semibold text-slate-500">Mes <input type="month" className={field+' mt-1'} value={month} onChange={e=>setMonth(e.target.value)}/></label></div>
  <div className="overflow-x-auto"><table className="w-full min-w-[670px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">Conductor</th><th className="px-4 py-3">Dietas</th><th className="px-4 py-3">Pluses</th><th className="px-4 py-3">Confirmadas</th><th className="px-4 py-3">Pendientes</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Acción</th></tr></thead><tbody className="divide-y divide-slate-100">{monthGroups.map(x=><tr key={x.driver.user_id}><td className="px-4 py-3 font-semibold">{display(x.driver)}</td><td className="px-4 py-3">{euro(x.summed.diet)}</td><td className="px-4 py-3">{euro(x.summed.plus)}</td><td className="px-4 py-3">{x.ok.length}</td><td className="px-4 py-3">{x.pending+x.disputed}</td><td className="px-4 py-3 font-bold">{euro(x.summed.total)}</td><td className="px-4 py-3"><button className={secondary+' !py-1.5 text-blue-600'} onClick={()=>setDrawer(x.driver.user_id)}>Ver desglose</button></td></tr>)}</tbody></table></div>
  <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4"><p className="font-semibold text-slate-700">Total mensual empresa: <strong className="text-lg text-slate-900">{euro(total)}</strong></p><button className={primary} disabled={closing||busy||view.blocked||currentReviews.length===0||view.closures?.some(x=>x.month===month)!==undefined&&Boolean(view.closures?.some(x=>x.month===month))} onClick={()=>void closeMonth()}>{closing?'Cerrando…':view.closures?.some(x=>x.month===month)?'Mes cerrado':'Cerrar mes confirmado'}</button></div>
 </div>;
 const assigned=<div className={card}><h2 className="text-base font-bold">Asignar conductores a Tráfico</h2><p className="mt-1 text-xs text-slate-500">Solo RRHH puede cambiar los responsables. Cada usuario de Tráfico accede exclusivamente a los conductores asignados.</p><div className="mt-4 space-y-3">{drivers.map(d=>{const current=view.assignments?.find(a=>a.driver_id===d.user_id)?.traffic_user_id||'';return <div key={d.user_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3"><span className="min-w-[170px] flex-1 text-sm font-semibold">{display(d)}</span><select className={field+' sm:!w-64'} value={chosenAssignment[d.user_id]??current} onChange={e=>setChosenAssignment(v=>({...v,[d.user_id]:e.target.value}))}><option value="">Sin asignar</option>{(view.trafficMembers||[]).map(m=><option key={m.user_id} value={m.user_id}>{display(m)}</option>)}</select><button className={primary} disabled={busy||view.blocked} onClick={()=>void saveAssignment(d.user_id)}>Guardar</button></div>})}</div>{!drivers.length?<p className="mt-4 text-sm text-slate-500">No hay conductores vinculados.</p>:null}</div>;
 const summaryTraffic=<>
  <div className={card}><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold">Seguimiento de jornadas y viajes</h2><p className="mt-1 text-xs text-slate-500">Tiempo de jornada, actividad y viajes registrados en la app del conductor</p></div><span className="text-xs text-slate-400">Actualización de datos cada minuto</span></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{drivers.filter(d=>{const s=state(d);return s!== 'Finalizada'&&s!=='Sin jornada'&&s!=='Sin cierre (antigua)';}).map(d=><div key={d.user_id}>{operating(d)}</div>)}{!drivers.some(d=>{const s=state(d);return s!== 'Finalizada'&&s!=='Sin jornada'&&s!=='Sin cierre (antigua)';})?<p className="text-sm text-slate-500">No hay jornadas activas recientes en este equipo.</p>:null}</div></div>
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={Users} label="Conductores asignados" value={drivers.length} sub="Solo tu equipo asignado"/><Stat icon={Activity} label="Jornadas abiertas recientes" value={active} sub="No implica actividad confirmada"/><Stat icon={Truck} label="En conducción" value={driving} sub="Con actividad reciente sincronizada"/><Stat icon={Clock3} label="En disponibilidad" value={available} sub="Con actividad reciente sincronizada"/></div>
  <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]"><div className={card}><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Seguimiento de actividad</h2><p className="mt-1 text-xs text-slate-500">Últimas jornadas registradas de tu equipo</p></div><button className="text-xs font-semibold text-blue-600" onClick={()=>navigate('jornadas')}>Ver todas →</button></div>
  <div className="mt-4 space-y-2">{drivers.filter(d=>state(d)!=='Finalizada'&&state(d)!=='Sin jornada').slice(0,5).map(d=><div key={d.user_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3"><span className="rounded-lg bg-blue-50 p-2 text-blue-600"><Truck size={18}/></span><div className="min-w-[150px] flex-1"><p className="text-sm font-semibold">{display(d)}</p><p className="text-xs text-slate-400">{latest.get(d.user_id)?.lugar_inicio||'Sin origen'} → {latest.get(d.user_id)?.lugar_fin||'Sin destino'}</p></div><Pill value={state(d)}/><button className={secondary+' !px-3 !py-1.5 !text-xs'} onClick={()=>setDrawer(d.user_id)}>Abrir</button></div>)}{!drivers.length?<p className="py-5 text-sm text-slate-500">RRHH todavía no te ha asignado conductores.</p>:null}</div>
  <p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">La información procede de Tacoplan. La actividad actual se muestra únicamente cuando existe un evento reciente y abierto; los datos no sincronizados no se inventan.</p></div>
  <div className={card}><h2 className="font-bold">Actividad del equipo</h2><p className="mt-1 text-xs text-slate-500">Resumen de conductores asignados</p><div className="mt-6 space-y-5">{[{n:'Conduciendo',v:driving,color:'bg-emerald-500'},{n:'Disponibilidad',v:available,color:'bg-amber-400'},{n:'Descanso',v:resting,color:'bg-sky-400'},{n:'Jornada finalizada',v:ended,color:'bg-slate-400'}].map(x=><div className="flex items-center gap-3 text-xs" key={x.n}><span className="flex-1 text-slate-600">{x.n}</span><div className="h-1.5 w-24 rounded-full bg-slate-100"><div className={x.color+' h-1.5 rounded-full'} style={{width:(drivers.length?x.v/drivers.length*100:0)+'%'}}/></div><strong>{x.v}</strong></div>)}</div><div className="mt-7 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-900"><p className="font-bold">Permisos de Tráfico</p><p className="mt-1">Puedes consultar horas y tipos de dieta, y proponer dietas y pluses. No puedes consultar importes económicos.</p></div></div></div>
  {table}
 </>;
 const summaryHR=<>
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={Users} label="Conductores" value={drivers.length} sub="Vinculados a la empresa"/><Stat icon={CheckCircle2} label="Confirmadas" value={approvedReviews.length} sub={'En '+month}/><Stat icon={Clock3} label="Pendientes" value={currentReviews.filter(x=>x.status==='awaiting_driver').length} sub="Respuesta del conductor"/><Stat icon={AlertCircle} label="En discrepancia" value={currentReviews.filter(x=>x.status==='disputed').length} sub="Pendientes de revisión"/></div>
  <div className="grid gap-4 md:grid-cols-3"><div className={card}><p className="text-xs font-semibold text-slate-500">Dietas confirmadas</p><p className="mt-3 text-2xl font-bold">{euro(total-sumPlus)}</p></div><div className={card}><p className="text-xs font-semibold text-slate-500">Pluses confirmados</p><p className="mt-3 text-2xl font-bold">{euro(sumPlus)}</p></div><div className={card}><p className="text-xs font-semibold text-slate-500">Total del mes</p><p className="mt-3 text-2xl font-bold text-blue-700">{euro(total)}</p></div></div>
  {hrTable}
 </>;
 const drawerContent=selectedDriver?<div className="fixed inset-0 z-[100] flex justify-end bg-[#06132d]/55" onClick={()=>{setDrawer(null);setSelectedJourney('');}}><div role="dialog" aria-modal="true" aria-label={'Ficha de '+display(selectedDriver)} onClick={e=>e.stopPropagation()} className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
  <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-600">{traffic?'Ficha operativa':'Liquidación individual'}</p><h2 className="mt-1 text-xl font-bold">{display(selectedDriver)}</h2><p className="text-xs text-slate-500">@{selectedDriver.username}</p></div><button aria-label="Cerrar ficha" className={secondary+' !p-2'} onClick={()=>{setDrawer(null);setSelectedJourney('');}}><X size={18}/></button></div>
  <div className="flex-1 space-y-5 overflow-y-auto p-5">{traffic?<>
   {operating(selectedDriver)}
   <div><h3 className="font-bold">Jornadas y actividades registradas</h3><div className="mt-3 space-y-2">{driverJourneys.slice(0,35).map(j=><button onClick={()=>chooseJourney(j)} key={j.id} className={'w-full rounded-xl border p-3 text-left text-sm '+(selectedJourney===j.id?'border-blue-400 bg-blue-50':'border-slate-200 hover:bg-slate-50')}>
    <p className="font-semibold">{j.fecha_inicio||'Sin fecha'} · {j.hora_inicio||'—'} → {j.fecha_fin||'Sin cierre'} · {j.hora_fin||'—'}</p><p className="mt-1 text-xs text-slate-500">{j.lugar_inicio||'Origen pendiente'} → {j.lugar_fin||'Destino pendiente'}</p><p className="mt-1 text-xs">Conducción: {hours(j.tacho_driving_min??j.conduccion_min)} · Disponibilidad: {hours(j.tacho_available_min)} · Descanso: {hours(j.tacho_rest_min)} · Otros trabajos: {hours(j.tacho_work_min)}</p><p className="mt-1 text-xs text-blue-700">Dieta: {j.dieta_manual_tipo||j.tipo_ruta||'Sin tipo'} {j.dieta_percent||''}{j.dieta_percent?' %':''}</p></button>)}{!driverJourneys.length?<p className="text-sm text-slate-500">Sin jornadas disponibles.</p>:null}</div></div>
   {chosen&&chosen.user_id===selectedDriver.user_id?<div className="rounded-xl border border-blue-200 p-4"><h3 className="font-bold">Revisión de dieta y pluses</h3><p className="mt-1 text-xs text-slate-500">No se muestran importes. Las tarifas se calculan en el servidor.</p><div className="mt-3 flex flex-wrap gap-3 text-sm"><label><input type="radio" checked={mode==='confirm'} onChange={()=>setMode('confirm')}/> Confirmar sin cambios</label><label><input type="radio" checked={mode==='propose'} onChange={()=>setMode('propose')}/> Proponer modificación</label></div>
    {mode==='propose'?<div className="mt-4 space-y-3"><p className="text-sm font-semibold">Dietas propuestas</p>{dietTypes.map((v,i)=><div className="flex gap-2" key={i}><select className={field} value={v} onChange={e=>setDietTypes(old=>old.map((x,k)=>k===i?e.target.value:x))}>{dietChoices.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}</select><button className={secondary} onClick={()=>setDietTypes(old=>old.filter((_,k)=>k!==i))}>Quitar</button></div>)}<button className={secondary} disabled={dietTypes.length>=8} onClick={()=>setDietTypes(old=>[...old,'NACIONAL_100'])}><Plus size={15}/> Añadir dieta</button><p className="text-sm font-semibold">Pluses configurados</p><div className="flex flex-wrap gap-3">{(view.plusOptions?.[selectedDriver.user_id]||[]).map(s=><label key={s} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={plusTypes.includes(s)} onChange={e=>setPlusTypes(old=>e.target.checked?[...old,s]:old.filter(x=>x!==s))}/>{s.replace(/_/g,' ')}</label>)}</div>{!view.plusOptions?.[selectedDriver.user_id]?.length?<p className="text-xs text-amber-700">Este conductor no tiene pluses configurados.</p>:null}<textarea className={field} rows={2} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Justificación obligatoria (mínimo 10 caracteres)"/></div>:null}
    <textarea className={field+' mt-3'} rows={2} value={observation} onChange={e=>setObservation(e.target.value)} placeholder="Observación opcional"/><button className={primary+' mt-3 w-full'} disabled={busy||view.blocked||(mode==='propose'&&reason.trim().length<10)} onClick={()=>void performReview()}>{mode==='confirm'?'Confirmar dieta':'Enviar propuesta al conductor'}</button></div>:null}
   </>:<>
    <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-blue-50 p-4"><p className="text-xs text-slate-500">Dietas confirmadas</p><p className="mt-1 text-xl font-bold">{euro(selectedGroup?.summed.diet||0)}</p></div><div className="rounded-xl bg-blue-50 p-4"><p className="text-xs text-slate-500">Pluses confirmados</p><p className="mt-1 text-xl font-bold">{euro(selectedGroup?.summed.plus||0)}</p></div></div><p className="text-lg font-bold">Total a liquidar: {euro(selectedGroup?.summed.total||0)}</p>
    <h3 className="font-bold">Conceptos de {month}</h3><div className="space-y-3">{(selectedGroup?.all||[]).map(r=>{const p=components(r);return <div key={r.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{r.jornada_date||'Sin fecha'}</strong><Pill value={labels[r.status]||r.status}/></div><p className="mt-2 text-sm">Tipo de dieta: {r.status==='accepted'&&r.proposed_diet_type?r.proposed_diet_type:r.original_diet_type||'Sin especificar'}</p><p className="mt-1 text-sm">Dieta: <strong>{euro(p.diet)}</strong></p>{p.plus>0?<p className="mt-1 text-sm">Pluses: <strong>{euro(p.plus)}</strong> {r.automatic_plus_concept?'· '+r.automatic_plus_concept:''}</p>:null}<p className="mt-2 font-bold">Total jornada: {euro(p.total)}</p>{r.change_reason?<p className="mt-2 text-xs text-amber-800">Motivo: {r.change_reason}</p>:null}{r.driver_observation?<p className="mt-1 text-xs text-blue-700">Conductor: {r.driver_observation}</p>:null}</div>})}{!selectedGroup?.all.length?<p className="text-sm text-slate-500">No hay revisiones en este mes.</p>:null}</div>
   </>}
  </div>
 </div></div>:null;
 return <div data-enterprise-workspace className="fixed inset-0 z-[70] overflow-y-auto bg-[#f4f6fb] text-[#17243f]">
  <div className="flex min-h-screen">
   {mobileMenu?<button aria-label="Cerrar menú" className="fixed inset-0 z-[70] bg-slate-900/40 lg:hidden" onClick={()=>setMobileMenu(false)}/>:null}
   <aside className={'fixed inset-y-0 left-0 z-[80] flex w-[244px] flex-col bg-gradient-to-b from-[#11244c] to-[#081632] text-slate-100 transition-transform lg:translate-x-0 '+(mobileMenu?'translate-x-0':'-translate-x-full')}>
    <div className="flex items-center gap-3 px-5 py-7"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-lg font-bold shadow-lg">T</div><div><p className="text-lg font-bold tracking-tight">Tacoplan</p><p className="text-[10px] font-semibold tracking-[.19em] text-slate-400">EMPRESAS</p></div></div>
    <p className="px-6 pb-3 pt-7 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Espacio de trabajo</p><nav className="space-y-1 px-3" aria-label="Menú empresarial">{menu.map(m=>{const Icon=m.icon;return <button key={m.id} onClick={()=>navigate(m.id)} className={'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition '+(page===m.id?'bg-blue-600 font-semibold text-white shadow-md':'text-slate-300 hover:bg-white/10 hover:text-white')}><Icon size={17}/>{m.label}{m.id==='conductores'?<span className="ml-auto rounded-md bg-white/10 px-1.5 text-xs">{drivers.length}</span>:null}</button>})}</nav>
    <div className="mt-auto space-y-3 px-4 pb-5"><div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300"><p className="font-bold text-white">Datos reales · {view.company?.name||'Empresa'}</p><p className="mt-1 text-[11px] leading-relaxed">Solo información autorizada de tu empresa. Los datos de actividad dependen de la sincronización de Tacoplan.</p></div><p className="truncate text-xs text-slate-300">@{view.member.username} · {traffic?'Tráfico':'RRHH'}</p><button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-300 hover:bg-white/10" onClick={()=>void signOut()}><LogOut size={16}/> Cerrar sesión</button></div>
   </aside>
   <div className="min-w-0 flex-1 lg:ml-[244px]">
    <header className="sticky top-0 z-40 flex min-h-[70px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-7"><div className="flex items-center gap-3"><button className="rounded-lg border p-2 lg:hidden" aria-label="Abrir menú" onClick={()=>setMobileMenu(true)}><Menu size={19}/></button><p className="text-xs text-slate-500">Tacoplan Empresas <span className="mx-2">/</span> <strong className="text-slate-800">{traffic?'Panel de Tráfico':'Panel de RRHH'}</strong></p></div><div className="flex items-center gap-2"><span className="hidden rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 sm:inline-flex">{view.company?.subscription_status==='free'?'Cuenta de pruebas gratuita':'Cuenta empresarial'}</span><span className="max-w-[150px] truncate rounded-lg border px-3 py-2 text-xs font-semibold">{view.member.username}</span><div className="flex rounded-xl bg-slate-100 p-1 text-xs"><span className={'rounded-lg px-3 py-1.5 '+(traffic?'bg-white font-bold text-blue-700 shadow-sm':'text-slate-400')}>Tráfico</span><span className={'rounded-lg px-3 py-1.5 '+(!traffic?'bg-white font-bold text-blue-700 shadow-sm':'text-slate-400')}>RRHH</span></div></div></header>
    <main className="mx-auto max-w-[1510px] space-y-5 px-4 py-7 sm:px-7">
     <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-blue-600">{traffic?'Operaciones · Datos registrados':'Recursos humanos · Liquidaciones'}</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{page==='resumen'?(traffic?'Centro de operaciones':'Centro de liquidaciones'):selectedTitle}</h1><p className="mt-1 text-xs text-slate-500">{traffic?'Visión de jornadas y actividades del equipo · Sin estados ficticios':'Dietas, pluses y asignaciones de personal de la empresa'}</p></div><div className="flex gap-2"><button disabled={loading} className={secondary} onClick={()=>void refresh()}><RefreshCw size={15} className={loading?'animate-spin':''}/> Actualizar</button>{traffic&&page==='resumen'?<button className={primary} onClick={()=>navigate('jornadas')}>Ver jornadas <ArrowRight size={15}/></button>:null}</div></div>
     {error?<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>:null}
     {message||notice?<div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{notice||message}</div>:null}
     {view.blocked?<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">La suscripción de la empresa no está activa. Algunas funciones están restringidas.</div>:null}
     {traffic?(page==='resumen'?summaryTraffic:page==='conductores'?table:page==='jornadas'?<><div className={card}><h2 className="font-bold">Jornadas pendientes de cierre</h2><p className="mt-1 text-xs text-slate-500">No equivalen necesariamente a conductores trabajando en este momento.</p><div className="mt-3 space-y-2">{journeys.filter(j=>!j.fecha_fin||!j.hora_fin).slice(0,30).map(j=><button className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-left text-sm" key={j.id} onClick={()=>chooseJourney(j)}><span><strong>{byId(j.user_id)?display(byId(j.user_id)!):'Conductor'}</strong> · {j.fecha_inicio||'Sin fecha'} {j.hora_inicio||'—'}</span><Pill value={status(j,latestActivities.get(j.user_id))}/></button>)}{!journeys.some(j=>!j.fecha_fin||!j.hora_fin)?<p className="text-sm text-slate-500">No hay jornadas sin cierre.</p>:null}</div></div>{table}</>:page==='dietas'?<div className={card}><h2 className="font-bold">Revisiones y dietas</h2><p className="mt-1 text-xs text-slate-500">Puedes confirmar o proponer dietas y pluses desde la ficha del conductor. No se muestran importes económicos.</p><div className="mt-4 divide-y">{reviews.map(r=><button key={r.id} className="flex w-full flex-wrap items-center justify-between gap-3 py-3 text-left text-sm" onClick={()=>{setDrawer(r.driver_id);const j=journeys.find(j=>j.id===r.jornada_id);if(j)chooseJourney(j);}}><span>{byId(r.driver_id)?display(byId(r.driver_id)!):'Conductor'} · {r.jornada_date||'Sin fecha'} · {r.proposed_diet_type||r.original_diet_type||'Sin tipo'}</span><Pill value={labels[r.status]||r.status}/></button>)}{!reviews.length?<p className="py-4 text-sm text-slate-500">No hay revisiones de los conductores asignados.</p>:null}</div></div>:<div className={card}><h2 className="font-bold">Informe operativo</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><Stat icon={Users} label="Asignados" value={drivers.length} sub="Equipo accesible"/><Stat icon={Clock3} label="Jornadas registradas" value={journeys.length} sub="Desde vinculación"/><Stat icon={FileText} label="Revisiones" value={reviews.length} sub="Sin importes económicos"/></div></div>):page==='resumen'?summaryHR:page==='asignaciones'?assigned:page==='conductores'?<div className={card}><h2 className="font-bold">Personal conductor</h2><div className="mt-4 divide-y">{drivers.map(d=><div key={d.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><strong className="text-sm">{display(d)}</strong><p className="text-xs text-slate-500">Tráfico: {display(view.trafficMembers?.find(t=>t.user_id===view.assignments?.find(a=>a.driver_id===d.user_id)?.traffic_user_id)||{username:'Sin asignar',user_id:''})}</p></div><button className={secondary} onClick={()=>setDrawer(d.user_id)}>Ver liquidación</button></div>)}</div></div>:page==='dietas'?hrTable:<div className={card}><h2 className="font-bold">Historial de cierres mensuales</h2><p className="mt-1 text-xs text-slate-500">Solo cierres guardados para cada conductor.</p><div className="mt-4 divide-y">{(view.closures||[]).map(x=><div key={x.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><span>{x.month} · {byId(x.driver_id)?display(byId(x.driver_id)!):'Conductor'}</span><strong>{euro(Number(x.total_diets)+Number(x.total_pluses||0))}</strong></div>)}{!view.closures?.length?<p className="text-sm text-slate-500">Aún no hay cierres guardados.</p>:null}</div></div>}
     <p className="pt-4 text-center text-[11px] text-slate-400">Tacoplan Empresas · Información real de la empresa · Permisos verificados por el servidor</p>
    </main>
   </div>
  </div>
  {drawerContent}
 </div>;
}
