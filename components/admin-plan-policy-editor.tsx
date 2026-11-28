'use client';
import {useEffect,useState} from 'react';
import {
 FEATURE_KEYS,changed,type FeatureKey,type PlanConfig,type PlanPolicyRow,type PlanSlug
} from '@/lib/plan-policy';

type Response={
 policies:PlanPolicyRow[];
 runtime:{billing_enabled:boolean;restrictions_enabled:boolean};
 catalog:Array<{slug:string;plan:string;trial_days:number}>;
 activeSubscriptions:number;
};
const names:Record<PlanSlug,string>={free:'Gratis',plus:'Plan anterior',pro:'Pro'};
const featureLabels:Record<FeatureKey,{label:string;description:string}>={
 auto:{label:'AutoStart',description:'Inicio de jornada y conducción automática por GPS'},
 diets:{label:'Dietas y pluses',description:'Registro y consulta de importes'},
 manual:{label:'Actividades de jornada',description:'Conducción, descanso, disponibilidad y otros trabajos'},
 notify:{label:'Avisos y notificaciones',description:'Alertas preventivas y avisos de jornada'},
 reports:{label:'Informes',description:'Informes avanzados y exportación'},
 trip:{label:'Registro de jornadas',description:'Iniciar y cerrar jornadas'},
 widget:{label:'Widgets',description:'Contadores y accesos rápidos disponibles en el dispositivo'},
};
const clone=(c:PlanConfig):PlanConfig=>({...c,features:{...c.features},free_feature_days:{...c.free_feature_days}});
const dur=(n:number|null)=>n===null?'Ilimitado':n+' días';
export default function AdminPlanPolicyEditor() {
 const [state,setState]=useState<Response|null>(null);
 const [selected,setSelected]=useState<PlanSlug>('free');
 const [form,setForm]=useState<PlanConfig|null>(null);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [working,setWorking]=useState(false);
 const load=async()=>{
  setError('');
  try{
   const response=await fetch('/api/admin/plan-policies',{credentials:'same-origin',cache:'no-store'});
   const data=await response.json() as Response & {error?:string};
   if(!response.ok)throw Error(data.error||'No se pudieron cargar las restricciones');
   setState(data);
  }catch(e){setError(e instanceof Error?e.message:'Error al cargar');}
 };
 useEffect(()=>{void load()},[]);
 const policy=state?.policies.find(p=>p.slug===selected);
 useEffect(()=>{if(policy)setForm(clone(policy.draft_config));},[selected,policy?.version]);
 const update=(changes:Partial<PlanConfig>)=>setForm(p=>p?{...p,...changes}:p);
 const request=async(action:'draft'|'publish')=>{
  if(!policy||!form||working)return;
  if(action==='publish'&&changed(form,policy.draft_config)){
   setError('Primero guarda el borrador. Publicar nunca incluye cambios sin guardar.');return;
  }
  if(action==='publish'&&!window.confirm('¿Publicar las restricciones de '+names[selected]+'? Los cambios se aplicarán a los usuarios de este plan. Las pruebas activas y los cobros existentes no se modifican. Los nuevos plazos por función se conservarán al desactivar o reactivar planes.'))return;
  setWorking(true);setError('');setNotice('');
  try{
   const response=await fetch('/api/admin/plan-policies',{
    method:action==='draft'?'PATCH':'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(action==='draft'
      ?{slug:selected,config:form,version:policy.version}
      :{slug:selected,version:policy.version,confirmed:true})
   });
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'No se pudieron guardar los cambios');
   setState(old=>old?{...old,policies:old.policies.map(p=>p.slug===selected?data.policy:p)}:old);
   setNotice(action==='draft'?'Borrador guardado. La configuración pública no ha cambiado.':
      'Plan publicado. Los permisos se actualizarán sin reiniciar pruebas ni plazos de funciones usados.');
  }catch(e){setError(e instanceof Error?e.message:'Error guardando configuración');}
  finally{setWorking(false);}
 };
 return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" id="restricciones-planes">
  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
   <div><h2 className="text-xl font-extrabold">Funciones, límites y pruebas</h2>
    <p className="mt-1 text-sm text-slate-600">Edita un borrador y publícalo cuando esté revisado. No modifica suscripciones ya iniciadas.</p>
   </div>
   <button onClick={()=>void load()} disabled={working} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40">Actualizar</button>
  </div>
  {error&&<p role="alert" className="my-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
  {notice&&<p role="status" className="my-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
  {state&&<>
   <div className="mb-4 grid gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm sm:grid-cols-3">
    <p><strong>Restricciones:</strong> {state.runtime.restrictions_enabled?'activadas':'desactivadas'}</p>
    <p><strong>Cobros:</strong> {state.runtime.billing_enabled?'activados':'desactivados'}</p>
    <p><strong>Suscripciones en curso:</strong> {state.activeSubscriptions}</p>
   </div>
   <div role="tablist" aria-label="Seleccionar plan" className="mb-5 grid grid-cols-2 gap-2">
    {(['free','pro'] as const).map(tier=><button key={tier} type="button" role="tab" aria-selected={selected===tier}
      onClick={()=>setSelected(tier)}
      className={'rounded-xl border px-3 py-3 font-semibold '+(selected===tier?'border-blue-600 bg-blue-700 text-white':'border-slate-200 bg-slate-50 text-slate-800')}>{names[tier]}</button>)}
   </div>
   {policy&&form&&<>
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
     <label className="space-y-1 text-sm font-semibold text-slate-700">
      <span>Duración del plan</span>
      {selected==='free'?<select className="w-full rounded-lg border p-3" value={form.duration_days===null?'forever':form.duration_days===7?'7':form.duration_days===30?'30':form.duration_days===90?'90':'custom'}
       onChange={e=>update({duration_days:e.target.value==='forever'?null:e.target.value==='custom'?365:Number(e.target.value)})}>
        <option value="forever">Para siempre</option><option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option><option value="custom">Personalizado</option>
       </select>:<p className="rounded-lg border bg-slate-50 p-3">Mientras mantenga el acceso</p>}
      {selected==='free'&&form.duration_days!==null&&!([7,30,90].includes(form.duration_days))&&
       <input aria-label="Duración personalizada del plan Gratis en días" type="number" min={1} max={3650} className="w-full rounded-lg border p-2" value={form.duration_days}
        onChange={e=>update({duration_days:Number(e.target.value)})}/>}
     </label>
     <label className="space-y-1 text-sm font-semibold text-slate-700"><span>Historial visible</span>
      <select value={form.history_days===null?'all':String(form.history_days)} onChange={e=>update({history_days:e.target.value==='all'?null:Number(e.target.value)})}
        className="w-full rounded-lg border p-3">
       <option value="7">7 días</option><option value="14">14 días</option><option value="30">30 días</option><option value="90">90 días</option><option value="365">365 días</option><option value="all">Sin límite</option>
      </select>
     </label>
     <label className="space-y-1 text-sm font-semibold text-slate-700"><span>Prueba de {names[selected]}</span>
      {selected==='free'?<p className="rounded-lg border bg-slate-50 p-3">No corresponde</p>
       :<select className="w-full rounded-lg border p-3" value={form.trial_days} onChange={e=>update({trial_days:Number(e.target.value)})}>
         {[0,3,7,14,21,30].map(n=><option key={n} value={n}>{n===0?'Sin prueba':n+' días'}</option>)}
        </select>}
     </label>
    </div>
    <label className="mb-5 block space-y-1 text-sm font-semibold text-slate-700">
     <span>Estado legal y conducción semanal/bisemanal</span>
     <select className="w-full rounded-lg border p-3" value={form.legal_access===undefined?'automatic':form.legal_access?'allowed':'blocked'}
      onChange={e=>{const mode=e.target.value;setForm(old=>{if(!old)return old;const next={...old};if(mode==='automatic')delete next.legal_access;else next.legal_access=mode==='allowed';return next;});}}>
      <option value="automatic">Automático (regla de prueba actual)</option>
      <option value="allowed">Permitido</option><option value="blocked">Restringido</option>
     </select>
     <span className="block text-xs font-normal text-slate-500">Controla los detalles del estado legal sin eliminar jornadas ni modificar los cobros.</span>
    </label>
    <h3 className="mb-2 font-bold">Funciones permitidas y límites individuales</h3>
    {selected==='free'&&<p className="mb-3 text-sm text-slate-600">
      Cada función puede estar bloqueada, permitida siempre o gratis durante un número de días.
      El plazo empieza al publicarla para usuarios actuales y al registrarse para usuarios posteriores.
      Desactivar y reactivar los planes no reinicia el plazo consumido.
    </p>}
    <div className="grid gap-2 sm:grid-cols-2">
     {FEATURE_KEYS.map(feature=>{
      const days=form.free_feature_days?.[feature];
      const mode=days?'limited':form.features[feature]?'unlimited':'blocked';
      const setMode=(v:string)=>{
       const limited=v==='limited';
       const limits={...form.free_feature_days};delete limits[feature];
       if(limited)limits[feature]=30;
       update({features:{...form.features,[feature]:v==='unlimited'},free_feature_days:limits});
      };
      return <div key={feature} className="flex flex-col gap-3 rounded-xl border bg-slate-50 p-3">
       <div><strong className="block text-sm">{featureLabels[feature].label}</strong>
        <span className="block text-xs text-slate-500">{featureLabels[feature].description}</span></div>
       {selected==='free'?<>
        <label className="text-xs font-semibold text-slate-600">Acceso en Gratis
         <select aria-label={'Acceso a '+featureLabels[feature].label} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"
          value={mode} onChange={e=>setMode(e.target.value)}>
          <option value="blocked">No permitido</option>
          <option value="unlimited">Gratis sin límite</option>
          <option value="limited">Gratis por tiempo limitado</option>
         </select>
        </label>
        {mode==='limited'&&<label className="text-xs font-semibold text-slate-600">Días permitidos
         <input aria-label={'Días gratis de '+featureLabels[feature].label}
          type="number" min={1} max={3650} value={days??30}
          onChange={e=>update({free_feature_days:{...form.free_feature_days,[feature]:Number(e.target.value)}})}
          className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"/>
        </label>}
       </>:<label className="flex items-center justify-between gap-2 text-sm">
        Permitida <input type="checkbox" className="h-5 w-5 accent-blue-700"
         checked={form.features[feature]} onChange={e=>update({features:{...form.features,[feature]:e.target.checked}})}/>
       </label>}
      </div>;
     })}
    </div>
    <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
     <p className="font-semibold">Configuración actualmente publicada: {names[selected]}</p>
     <p className="mt-1 text-slate-600">Duración: {dur(policy.published_config.duration_days)} · Historial: {dur(policy.published_config.history_days)}
      · Prueba: {policy.published_config.trial_days} días</p>
     <p className="mt-1 text-slate-500">Última publicación: {policy.published_at?new Date(policy.published_at).toLocaleString('es-ES'):'No publicada'}</p>
    </div>
    <div className="mt-5 flex flex-wrap gap-3">
     <button disabled={working||!changed(form,policy.draft_config)} onClick={()=>void request('draft')}
      className="rounded-xl border border-blue-700 px-5 py-3 font-bold text-blue-700 disabled:opacity-40">Guardar borrador</button>
     <button disabled={working||changed(form,policy.draft_config)||!changed(policy.draft_config,policy.published_config)}
      onClick={()=>void request('publish')}
      className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-40">
      {working?'Guardando…':'Publicar configuración'}</button>
     {changed(form,policy.draft_config)&&<span className="self-center text-sm text-amber-700">Tienes cambios sin guardar</span>}
    </div>
    <p className="mt-3 text-xs text-slate-500">Los límites remotos solo afectan a las versiones de la app que los consulten; los datos históricos y los permisos de administrador quedan protegidos.</p>
   </>}
  </>}
 </section>;
}
