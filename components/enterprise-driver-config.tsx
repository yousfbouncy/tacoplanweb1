'use client';
import {useState} from 'react';
import {emptyEmployeeConfig,type InitialEmployeeConfig} from '@/lib/tp-employee-config';

export type ConfigDraft=InitialEmployeeConfig;
export const blankCompanyConfig=():InitialEmployeeConfig=>({...emptyEmployeeConfig(),payment_mode:'' as InitialEmployeeConfig['payment_mode']});
const input='mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900';
const moneyNames=['nacional','internacional','regional'] as const;
const titleFor:Record<string,string>={nacional:'Nacional',internacional:'Internacional',regional:'Regional'};
const num=(s:unknown)=>s===undefined||s===null?'':String(s);
const asAmount=(v:string)=>v.trim()===''?undefined:v;
function Group({title,children}:{title:string;children:React.ReactNode}){return <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 text-sm font-bold text-slate-900 marker:hidden hover:bg-blue-50 sm:px-5"><span>{title}</span><span aria-hidden="true" className="text-blue-600 transition-transform group-open:rotate-180">⌄</span></summary><div className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5">{children}</div></details>;}
export function EnterpriseDriverConfig({value,onChange,idPrefix='employee'}:{value:ConfigDraft;onChange:(value:ConfigDraft)=>void;idPrefix?:string}){
 const [showAdvanced,setShowAdvanced]=useState(false);
 const set=<K extends keyof ConfigDraft>(k:K,v:ConfigDraft[K])=>onChange({...value,[k]:v});
 const mapRate=(section:'diet_rates'|'plus_rates'|'km_rates'|'trip_rates'|'payroll_terms',key:string,txt:string)=>{
  const next={...value[section]};if(txt.trim()==='')delete next[key];else next[key]=txt as unknown as number;
  onChange({...value,[section]:next});
 };
 const rate=(section:'diet_rates'|'plus_rates'|'km_rates'|'trip_rates'|'payroll_terms',key:string,label:string,suffix='€')=>
  <label key={section+key} className="text-sm font-medium text-slate-700">{label}
   <div className="relative"><input aria-label={label} type="number" inputMode="decimal" min="0" max="100000" step="0.01" className={input+' pr-8'} value={num(value[section][key])} onChange={e=>mapRate(section,key,e.target.value)} placeholder="0,00"/><span className="absolute right-3 top-3 text-xs text-slate-500">{suffix}</span></div>
  </label>;
 return <div className="space-y-3"><p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">Abre solo la sección que quieras configurar. Los datos que escribas se conservan al cerrar cada apartado.</p>
  <Group title="Perfil y tipos de viaje">
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-sm font-medium">Perfil del conductor<select className={input} value={value.driver_profile} onChange={e=>set('driver_profile',e.target.value as ConfigDraft['driver_profile'])}><option value="standard">Transporte estándar</option><option value="morocco">Marruecos</option><option value="ferry">Ferry</option></select></label>
    <label className="text-sm font-medium">Zona de trabajo<select className={input} value={value.operation_zone} onChange={e=>set('operation_zone',e.target.value as ConfigDraft['operation_zone'])}><option value="spain">España</option><option value="europe">Europa</option><option value="morocco">Marruecos</option><option value="mixed">Mixto</option></select></label>
   </div>
   <p className="mb-2 mt-3 text-sm font-semibold">Rutas que realiza</p>
   <div className="flex flex-wrap gap-3">
    {([{k:'nacional',l:'Nacionales'},{k:'internacional',l:'Internacionales'},{k:'morocco',l:'Marruecos'},{k:'ferry',l:'Ferry'}] as const).map(({k,l})=>
     <label key={k} className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={value.trip_types[k]} onChange={e=>set('trip_types',{...value.trip_types,[k]:e.target.checked})}/>{l}</label>)}
   </div>
  </Group>
  <Group title="Base y centro de trabajo">
   <div className="grid gap-3 sm:grid-cols-2">
    {([{k:'base_name',l:'Base de trabajo',ph:'Abrera'},{k:'base_city',l:'Ciudad',ph:'Abrera'},{k:'base_country',l:'País',ph:'España'},{k:'base_address',l:'Dirección de base',ph:'Calle y número'}] as const).map(({k,l,ph})=>
     <label key={k} className="text-sm font-medium">{l}<input className={input} placeholder={ph} value={value[k]} onChange={e=>set(k,e.target.value)}/></label>)}
    <label className="text-sm font-medium">Convenio aplicable<input className={input} placeholder="Convenio de transporte" value={value.agreement} onChange={e=>set('agreement',e.target.value)}/></label>
    <label className="text-sm font-medium">Radio de la base (km)<input type="number" className={input} min="0.1" max="999" step="0.1" value={value.base_radius_km} onChange={e=>set('base_radius_km',Number(e.target.value))}/></label>
   </div>
   <button type="button" className="mt-3 text-xs font-semibold text-blue-700" onClick={()=>setShowAdvanced(!showAdvanced)}>{showAdvanced?'Ocultar coordenadas de la base':'Añadir coordenadas de la base (opcional)'}</button>
   {showAdvanced?<div className="mt-2 grid grid-cols-2 gap-3">
    <label className="text-sm">Latitud<input type="number" min="-90" max="90" step="any" className={input} value={value.base_latitude??''} onChange={e=>set('base_latitude',e.target.value===''?null:Number(e.target.value))}/></label>
    <label className="text-sm">Longitud<input type="number" min="-180" max="180" step="any" className={input} value={value.base_longitude??''} onChange={e=>set('base_longitude',e.target.value===''?null:Number(e.target.value))}/></label>
   </div>:null}
  </Group>
  <Group title="Periodo de liquidación">
   <label className="block text-sm font-medium">Periodo de nómina
    <select className={input} value={value.period_type} onChange={e=>set('period_type',e.target.value as ConfigDraft['period_type'])}>
     <option value="AUTO_01_30">Del 1 al 30</option><option value="AUTO_20_20">Del 21 al 20</option><option value="MANUAL">Personalizado</option>
    </select>
   </label>
   {value.period_type==='MANUAL'?<div className="mt-3 grid grid-cols-2 gap-3">{([{k:'period_start_day',l:'Día inicial'},{k:'period_end_day',l:'Día final'}] as const).map(({k,l})=>
    <label key={k} className="text-sm">{l}<input className={input} type="number" min="1" max="31" value={value[k]} onChange={e=>set(k,Number(e.target.value))}/></label>)}</div>:null}
  </Group>
  <Group title="Cómo paga la empresa">
   <label className="block text-sm font-semibold">Sistema de pago <span className="text-red-600">*</span>
    <select className={input} value={value.payment_mode} onChange={e=>set('payment_mode',e.target.value as ConfigDraft['payment_mode'])} required>
     <option value="">Selecciona cómo se pagan las jornadas</option><option value="dietas">Dietas</option><option value="km">Kilómetros</option><option value="viaje">Viajes</option>
    </select>
   </label>
   {!value.payment_mode?<p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Elige el sistema de pago para mostrar únicamente sus tarifas.</p>:null}
   {value.payment_mode==='dietas'?<>
    <label className="mt-4 block text-sm font-semibold">Tipo de dietas
     <select className={input} value={value.diet_scheme} onChange={e=>set('diet_scheme',e.target.value as ConfigDraft['diet_scheme'])}><option value="percentage">Por porcentajes (100 %, 60 %, 30 %)</option><option value="fixed">Dieta fija por tipo de ruta</option></select>
    </label>
    {value.diet_scheme==='fixed'?<><p className="mt-2 text-xs text-slate-500">La tarifa fija de cada ruta se aplicará automáticamente a los porcentajes 100 %, 60 % y 30 % en Tacoplan del conductor.</p>
     <div className="mt-3 grid gap-3 sm:grid-cols-3">{moneyNames.map(k=>rate('diet_rates',k+'_fija',titleFor[k]))}</div>
    </>:<div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{moneyNames.flatMap(k=>[100,60,30].map(p=>rate('diet_rates',k+'_'+p,titleFor[k]+' · '+p+' %')))}</div>}
   </>:null}
   {value.payment_mode==='km'?<div className="mt-3 grid gap-3 sm:grid-cols-3">{moneyNames.map(k=>rate('km_rates',k,titleFor[k]+' · €/km'))}</div>:null}
   {value.payment_mode==='viaje'?<div className="mt-3 grid gap-3 sm:grid-cols-3">{moneyNames.map(k=>rate('trip_rates',k,titleFor[k]+' · €/viaje'))}</div>:null}
  </Group>
  {(value.driver_profile==='ferry'||value.driver_profile==='morocco')?<Group title="Configuración especial de ferry y Marruecos">
   <label className="block text-sm font-medium">Modalidad de pago de ferry/Marruecos
    <select className={input} value={value.ferry_config.paymentMode} onChange={e=>set('ferry_config',{...value.ferry_config,paymentMode:e.target.value as ConfigDraft['ferry_config']['paymentMode']})}>
     <option value="morocco_diet">Dietas</option><option value="morocco_trip">Por viaje</option><option value="morocco_pernight">Por pernocta</option>
    </select>
   </label>
   {value.ferry_config.paymentMode==='morocco_trip'?<label className="mt-2 block text-sm">Importe por viaje (€)<input type="number" min="0" step="0.01" className={input} value={value.ferry_config.tripRate} onChange={e=>set('ferry_config',{...value.ferry_config,tripRate:Number(e.target.value)})}/></label>:null}
   {value.ferry_config.paymentMode==='morocco_pernight'?<label className="mt-2 block text-sm">Importe por pernocta (€)<input type="number" min="0" step="0.01" className={input} value={value.ferry_config.pernightRate} onChange={e=>set('ferry_config',{...value.ferry_config,pernightRate:Number(e.target.value)})}/></label>:null}
  </Group>:null}
  <Group title="Pluses y descansos fuera">
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {([{k:'sabado',l:'Sábado'},{k:'domingo',l:'Domingo'},{k:'festivo',l:'Festivo'},{k:'nocturnidad',l:'Nocturnidad'},{k:'pernocta',l:'Pernocta'},{k:'fin_semana_fuera',l:'Fin de semana fuera'},{k:'offsite_weekly_reduced_nacional',l:'Descanso reducido nacional'},{k:'offsite_weekly_reduced_internacional',l:'Descanso reducido internacional'},{k:'offsite_weekly_complete_nacional',l:'Descanso completo nacional'},{k:'offsite_weekly_complete_internacional',l:'Descanso completo internacional'}] as const).map(({k,l})=>rate('plus_rates',k,l))}
   </div>
  </Group>
  <Group title="Condiciones de nómina">
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{([{k:'salario_base',l:'Salario base'},{k:'complementos',l:'Complementos'},{k:'pagas_extra',l:'Pagas extraordinarias'}] as const).map(({k,l})=>rate('payroll_terms',k,l))}</div>
  </Group>
 </div>;
}
