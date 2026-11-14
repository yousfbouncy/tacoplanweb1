// Canonical company-owned onboarding for Tacoplan's existing mobile settings.
export type InitialEmployeeConfig={
 driver_profile:'standard'|'morocco'|'ferry';
 operation_zone:'spain'|'europe'|'morocco'|'mixed';
 trip_types:{nacional:boolean;internacional:boolean;morocco:boolean;ferry:boolean};
 payment_mode:'dietas'|'km'|'viaje';
 diet_scheme:'percentage'|'fixed';
 base_name:string;base_city:string;base_country:string;base_address:string;agreement:string;base_latitude:number|null;base_longitude:number|null;
 base_radius_km:number;
 ferry_config:{crossesFerry:boolean;routeMode:'spain'|'morocco';paymentMode:'spain_diet'|'morocco_diet'|'morocco_trip'|'morocco_pernight';tripRate:number;pernightRate:number;ferryRestEnabled:boolean};
 period_type:'AUTO_01_30'|'AUTO_20_20'|'MANUAL';
 period_start_day:number;period_end_day:number;
 diet_rates:Record<string,number>;
 plus_rates:Record<string,number>;
 km_rates:Record<string,number>;
 trip_rates:Record<string,number>;
 payroll_terms:Record<string,number>;
};
export const emptyEmployeeConfig=():InitialEmployeeConfig=>({
 driver_profile:'standard',operation_zone:'spain',
 trip_types:{nacional:true,internacional:false,morocco:false,ferry:false},
 payment_mode:'dietas',diet_scheme:'percentage',
 base_name:'',base_city:'',base_country:'España',base_address:'',agreement:'',base_latitude:null,base_longitude:null,base_radius_km:20,
 ferry_config:{crossesFerry:false,routeMode:'spain',paymentMode:'spain_diet',tripRate:0,pernightRate:0,ferryRestEnabled:false},
 period_type:'AUTO_01_30',period_start_day:1,period_end_day:30,
 diet_rates:{},plus_rates:{},km_rates:{},trip_rates:{},payroll_terms:{}
});
const numberField=(v:unknown):number|null=>{
 if(typeof v!=='string'&&typeof v!=='number')return null;
 const n=Number(String(v).replace(',','.'));
 return Number.isFinite(n)&&n>=0&&n<=100000?Math.round(n*100)/100:null;
};
const clean=(v:unknown,max=160)=>typeof v==='string'?v.trim().slice(0,max):'';
const allowed=<T extends string>(v:unknown,vals:readonly T[],fallback:T):T=>vals.includes(v as T)?v as T:fallback;
function numericRates(value:unknown,allowedKeys:string[]):Record<string,number>{
 const raw=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 const data:Record<string,number>={};
 for(const key of allowedKeys)if(raw[key]!==undefined&&String(raw[key]).trim()!==''){
  const n=numberField(raw[key]);if(n===null)throw new Error('Importe incorrecto para '+key);
  data[key]=n;
 }
 return data;
}
const dietNames=['nacional','internacional','regional'] as const;
const percents=[100,60,30] as const;
export function normalizeEmployeeConfig(raw:unknown):InitialEmployeeConfig{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('La configuración inicial del conductor es obligatoria');
 const c=raw as Record<string,unknown>;
 const cfg=emptyEmployeeConfig();
 cfg.driver_profile=allowed(c.driver_profile,['standard','morocco','ferry'],'standard');
 cfg.operation_zone=allowed(c.operation_zone,['spain','europe','morocco','mixed'],'spain');
 if(!['dietas','km','viaje'].includes(String(c.payment_mode)))throw new Error('Selecciona cómo paga la empresa: dietas, kilómetros o viajes');
 cfg.payment_mode=c.payment_mode as InitialEmployeeConfig['payment_mode'];
 cfg.diet_scheme=allowed(c.diet_scheme,['percentage','fixed'],'percentage');
 const types=c.trip_types&&typeof c.trip_types==='object'&&!Array.isArray(c.trip_types)?c.trip_types as Record<string,unknown>:{};
 cfg.trip_types={nacional:types.nacional===true,internacional:types.internacional===true,morocco:types.morocco===true,ferry:types.ferry===true};
 if(!Object.values(cfg.trip_types).some(Boolean))throw new Error('Selecciona al menos un tipo de viaje');
 cfg.base_name=clean(c.base_name);cfg.base_city=clean(c.base_city);cfg.base_country=clean(c.base_country,80);
 cfg.base_address=clean(c.base_address,255);cfg.agreement=clean(c.agreement,160);
 cfg.base_latitude=c.base_latitude===undefined||c.base_latitude===null||String(c.base_latitude).trim()===''?null:Number(c.base_latitude);
 cfg.base_longitude=c.base_longitude===undefined||c.base_longitude===null||String(c.base_longitude).trim()===''?null:Number(c.base_longitude);
 if((cfg.base_latitude!==null&&(!Number.isFinite(cfg.base_latitude)||Math.abs(cfg.base_latitude)>90))||(cfg.base_longitude!==null&&(!Number.isFinite(cfg.base_longitude)||Math.abs(cfg.base_longitude)>180)))throw new Error('Coordenadas de base incorrectas');
 const radius=numberField(c.base_radius_km);cfg.base_radius_km=radius===null?20:radius;
 if(!cfg.base_name||!cfg.base_city||!cfg.base_country||cfg.base_radius_km<=0)throw new Error('Indica la base, ciudad, país y radio de trabajo');
 cfg.period_type=allowed(c.period_type,['AUTO_01_30','AUTO_20_20','MANUAL'],'AUTO_01_30');
 cfg.period_start_day=cfg.period_type==='AUTO_20_20'?21:cfg.period_type==='MANUAL'?Number(c.period_start_day):1;
 cfg.period_end_day=cfg.period_type==='AUTO_20_20'?20:cfg.period_type==='MANUAL'?Number(c.period_end_day):30;
 if(!Number.isInteger(cfg.period_start_day)||cfg.period_start_day<1||cfg.period_start_day>31||!Number.isInteger(cfg.period_end_day)||cfg.period_end_day<1||cfg.period_end_day>31)throw new Error('Los días del periodo deben estar entre 1 y 31');
 const rateKeys=dietNames.flatMap(d=>percents.map(p=>d+'_'+p));
 const dayPlusKeys=['sabado','domingo','festivo','nocturnidad','pernocta','fin_semana_fuera','offsite_weekly_reduced_nacional','offsite_weekly_reduced_internacional','offsite_weekly_complete_nacional','offsite_weekly_complete_internacional'];
 cfg.diet_rates=numericRates(c.diet_rates,rateKeys.concat(dietNames.map(x=>x+'_fija')));
 cfg.plus_rates=numericRates(c.plus_rates,dayPlusKeys);
 cfg.km_rates=numericRates(c.km_rates,[...dietNames]);
 cfg.trip_rates=numericRates(c.trip_rates,[...dietNames]);
 cfg.payroll_terms=numericRates(c.payroll_terms,['salario_base','complementos','pagas_extra']);
 const ferry=c.ferry_config&&typeof c.ferry_config==='object'?c.ferry_config as Record<string,unknown>:{};
 const isFerry=cfg.driver_profile==='ferry'||cfg.driver_profile==='morocco';
 cfg.ferry_config={crossesFerry:isFerry,routeMode:cfg.driver_profile==='morocco'?'morocco':'spain',paymentMode:isFerry?allowed(ferry.paymentMode,['morocco_diet','morocco_trip','morocco_pernight'],'morocco_diet'):'spain_diet',tripRate:numberField(ferry.tripRate)??0,pernightRate:numberField(ferry.pernightRate)??0,ferryRestEnabled:cfg.driver_profile==='ferry'};
 if(isFerry&&cfg.ferry_config.paymentMode==='morocco_trip'&&cfg.ferry_config.tripRate<=0)throw new Error('Indica el precio por viaje para Marruecos o ferry');
 if(isFerry&&cfg.ferry_config.paymentMode==='morocco_pernight'&&cfg.ferry_config.pernightRate<=0)throw new Error('Indica el precio por pernocta para Marruecos o ferry');
 if(cfg.payment_mode==='dietas'&&cfg.diet_scheme==='fixed'){
  for(const name of dietNames){
   const amount=cfg.diet_rates[name+'_fija'];
   if(amount===undefined)throw new Error('Indica el importe fijo para '+name);
   for(const pct of percents)cfg.diet_rates[name+'_'+pct]=amount;
  }
 }
 if(cfg.payment_mode==='km'&&!dietNames.some(name=>cfg.km_rates[name]!==undefined))throw new Error('Indica las tarifas por kilómetro');
 if(cfg.payment_mode==='viaje'&&!dietNames.some(name=>cfg.trip_rates[name]!==undefined))throw new Error('Indica las tarifas por viaje');
 if(cfg.payment_mode==='dietas'&&!rateKeys.some(key=>cfg.diet_rates[key]!==undefined))throw new Error('Introduce al menos una tarifa de dieta');
 return cfg;
}
export function mobileDietRates(cfg:InitialEmployeeConfig){
 return dietNames.flatMap(name=>percents.map(percent=>({
  trip_type:name.toUpperCase(),percent,amount:cfg.diet_rates[name+'_'+percent]??0
 })));
}
export function mobileProfileConfig(cfg:InitialEmployeeConfig,displayName:string){
 const p:Record<string,unknown>={
  display_name:displayName,driver_profile:cfg.driver_profile,operation_zone:cfg.operation_zone,
  trip_types:cfg.trip_types,payment_mode:cfg.payment_mode,
  period_type:cfg.period_type,period_start_day:cfg.period_start_day,period_end_day:cfg.period_end_day,
  base_name:cfg.base_name,base_city:cfg.base_city,base_country:cfg.base_country,base_address:cfg.base_address,
  base_latitude:cfg.base_latitude,base_longitude:cfg.base_longitude,
  base_radius_km:cfg.base_radius_km,
 };
 for(const name of dietNames){
  p['price_per_km_'+name]=cfg.payment_mode==='km'?(cfg.km_rates[name]??0):0;
  p['price_per_trip_'+name]=cfg.payment_mode==='viaje'?(cfg.trip_rates[name]??0):0;
 }
 p.price_per_km=cfg.payment_mode==='km'?(cfg.km_rates.nacional??0):0;
 p.price_per_trip=cfg.payment_mode==='viaje'?(cfg.trip_rates.nacional??0):0;
 return p;
}
export async function syncEmployeeConfig(db:any,driverId:string,name:string,cfg:InitialEmployeeConfig){
 // Use native Supabase tables so the current installed mobile app reads the
 // configured rates without waiting for a new APK.
 const profile=await db.from('profiles').upsert({id:driverId,...mobileProfileConfig(cfg,name),onboarding_completed:true,updated_at:new Date().toISOString()},{onConflict:'id'});
 if(profile.error)throw profile.error;
 const rates=await db.from('user_diet_rates').upsert(mobileDietRates(cfg).map(r=>({user_id:driverId,...r})),{onConflict:'user_id,trip_type,percent'});
 if(rates.error)throw rates.error;
 const plus=cfg.plus_rates;
 const extras=await db.from('user_day_extras').upsert({user_id:driverId,
  extra_saturday:plus.sabado??0,extra_sunday:plus.domingo??0,extra_holiday:plus.festivo??0,
  offsite_weekly_reduced_nacional:plus.offsite_weekly_reduced_nacional??0,
  offsite_weekly_reduced_internacional:plus.offsite_weekly_reduced_internacional??0,
  offsite_weekly_complete_nacional:plus.offsite_weekly_complete_nacional??0,
  offsite_weekly_complete_internacional:plus.offsite_weekly_complete_internacional??0,
 },{onConflict:'user_id'});
 if(extras.error)throw extras.error;
 if(cfg.ferry_config.crossesFerry){
  const f=cfg.ferry_config;
  const update=await db.from('user_ferry_config').upsert({user_id:driverId,crosses_ferry:f.crossesFerry,route_mode:f.routeMode,payment_mode:f.paymentMode,trip_rate:f.tripRate,pernight_rate:f.pernightRate,ferry_rest_enabled:f.ferryRestEnabled,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  if(update.error)throw update.error;
 }
}
