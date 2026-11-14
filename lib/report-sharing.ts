export const REPORT_FIELD_OPTIONS=[
 {key:'driver_name',label:'Nombre del conductor'},
 {key:'start_end',label:'Fecha y hora de inicio y fin'},
 {key:'locations',label:'Origen y destino'},
 {key:'route_type',label:'Tipo de ruta'},
 {key:'driving',label:'Horas de conducción'},
 {key:'availability',label:'Disponibilidad del tacógrafo'},
 {key:'working',label:'Duración de la jornada'},
 {key:'diet_type',label:'Tipo de dieta'},
 {key:'diet_pct',label:'Porcentaje de dieta'},
 {key:'diet_rate',label:'Tarifa base de dieta'},
 {key:'diet_amount',label:'Importe de dieta'},
 {key:'day_flags',label:'Domingos y festivos'},
 {key:'pluses',label:'Conceptos de pluses'},
 {key:'plus_amount',label:'Importes de pluses'},
 {key:'km',label:'Kilómetros'},
 {key:'rest',label:'Descanso anterior'}
] as const;
export type ReportField=typeof REPORT_FIELD_OPTIONS[number]['key'];
export const ALL_REPORT_FIELDS=REPORT_FIELD_OPTIONS.map(v=>v.key);
export const DEFAULT_REPORT_FIELDS:ReportField[]=['start_end','locations','route_type','diet_type','diet_pct','driving','availability','day_flags','pluses'];
export type SharedReportRow={
 date:string;start:string|null;end:string|null;routeType:string|null;
 startTime:string|null;endTime:string|null;endDate:string|null;
 dayFlag:string|null;dayExtra:number|null;plusItems:{concept:string;amount:number|null}[];
 driving:number|null;availability:number|null;working:number|null;dietType:string|null;dietPct:number|null;
 dietRate:number|null;dietAmount:number|null;km:number|null;rest:number|null;
};
export type SharedReportData={title:string;driverName:string|null;from:string;to:string;fields:ReportField[];rows:SharedReportRow[];generatedAt:string;};
export const validDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
export const validFields=(v:unknown):v is ReportField[]=>Array.isArray(v)&&v.length>0&&v.length<=ALL_REPORT_FIELDS.length&&new Set(v).size===v.length&&v.every(x=>ALL_REPORT_FIELDS.includes(x));
export const money=(v:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(v);
export const hours=(n:number)=>Math.floor(n/60)+' h '+String(Math.round(n%60)).padStart(2,'0')+' min';
export function parseAmount(v:unknown):number|null{
 if(typeof v==='number')return Number.isFinite(v)?v:null;
 if(typeof v!=='string'||!v.trim())return null;
 let s=v.trim().replace(/\s/g,'');
 if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');
 const n=Number(s);return Number.isFinite(n)&&n>=0?n:null;
}
export type RawReportJornada={
 fecha_inicio:string|null;created_at:string;fecha_fin:string|null;hora_inicio:string|null;hora_fin:string|null;
 lugar_inicio:string|null;lugar_fin:string|null;tipo_ruta:string|null;
 conduccion_min:number|null;tacho_driving_min:number|null;tacho_available_min:number|null;duracion_jornada_min:number|null;
 dieta_manual_tipo:string|null;dieta_modo:string|null;dieta_manual_pct:number|null;dieta_percent:number|null;
 dieta_importe_eur:string|null;diet_base_eur:number|null;dietas_items:unknown;
 km_total:number|null;descanso_anterior_min:number|null;
 day_flag:string|null;day_extra_eur:string|null;plus_items:unknown;
 report_hide_amounts:boolean|null;report_hide_pluses:boolean|null;
};
export const REPORT_DB_COLUMNS='fecha_inicio,fecha_fin,hora_inicio,hora_fin,day_flag,day_extra_eur,plus_items,dietas_items,report_hide_amounts,report_hide_pluses,created_at,lugar_inicio,lugar_fin,tipo_ruta,conduccion_min,tacho_driving_min,tacho_available_min,duracion_jornada_min,dieta_manual_tipo,dieta_modo,dieta_manual_pct,dieta_percent,dieta_importe_eur,diet_base_eur,km_total,descanso_anterior_min';
export function mapReportRow(j:RawReportJornada):SharedReportRow{
 const dietItem=Array.isArray(j.dietas_items)?j.dietas_items.find(x=>x&&typeof x==='object'&&x.tipo):null;
 const plusItems=Array.isArray(j.plus_items)&&!j.report_hide_pluses
  ?j.plus_items.filter(x=>x&&typeof x==='object'&&!/^dieta\b/i.test(String(x.concepto||'')))
   .map((x:any)=>({concept:String(x.concepto||'Plus').slice(0,100),amount:j.report_hide_amounts?null:parseAmount(x.importe)}))
  :[];
 const time=(t:string|null)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t||'')?t:null;
 return {
  date:j.fecha_inicio||j.created_at.slice(0,10),
  start:j.lugar_inicio,end:j.lugar_fin,routeType:j.tipo_ruta,
  startTime:time(j.hora_inicio),endTime:time(j.hora_fin),endDate:j.fecha_fin,
  dayFlag:j.day_flag,dayExtra:j.report_hide_amounts||j.report_hide_pluses?null:parseAmount(j.day_extra_eur),plusItems,
  driving:j.conduccion_min??(j.tacho_driving_min&&j.tacho_driving_min>0?j.tacho_driving_min:null),
  working:j.duracion_jornada_min,availability:j.tacho_available_min,
  dietType:j.dieta_manual_tipo||dietItem?.tipo||j.tipo_ruta||null,
  dietPct:j.dieta_manual_pct??j.dieta_percent??parseAmount(dietItem?.pct)??null,
  dietRate:j.report_hide_amounts?null:j.diet_base_eur,
  dietAmount:j.report_hide_amounts?null:(parseAmount(j.dieta_importe_eur)??j.diet_base_eur),
  km:j.km_total,rest:j.descanso_anterior_min
 };
}
export function redactRows(rows:SharedReportRow[],fields:ReportField[]):SharedReportRow[]{
 const show=(key:ReportField)=>fields.includes(key);
 return rows.map(r=>({
  date:r.date,
  start:show('locations')?r.start:null,end:show('locations')?r.end:null,
  routeType:show('route_type')?r.routeType:null,
  startTime:show('start_end')?r.startTime:null,endTime:show('start_end')?r.endTime:null,endDate:show('start_end')?r.endDate:null,
  dayFlag:show('day_flags')?r.dayFlag:null,
  dayExtra:show('plus_amount')?r.dayExtra:null,
  plusItems:show('pluses')||show('plus_amount')?r.plusItems.map(x=>({concept:show('pluses')?x.concept:'Plus',amount:show('plus_amount')?x.amount:null})):[],
  driving:show('driving')?r.driving:null,availability:show('availability')?r.availability:null,working:show('working')?r.working:null,
  dietType:show('diet_type')?r.dietType:null,dietPct:show('diet_pct')?r.dietPct:null,
  dietRate:show('diet_rate')?r.dietRate:null,dietAmount:show('diet_amount')?r.dietAmount:null,
  km:show('km')?r.km:null,rest:show('rest')?r.rest:null
 }));
}
export function labelValue(r:SharedReportRow,key:ReportField):string{
 switch(key){
 case 'start_end':return (r.startTime||'—')+' → '+(r.endTime||'—');
 case 'locations':return [r.start||'—',r.end||'—'].join(' → ');
 case 'route_type':return r.routeType||'—';
 case 'driving':return r.driving==null?'—':hours(r.driving);
 case 'availability':return r.availability==null?'—':hours(r.availability);
 case 'working':return r.working==null?'—':hours(r.working);
 case 'diet_type':return r.dietType||'—';
 case 'diet_pct':return r.dietPct==null?'—':r.dietPct+' %';
 case 'diet_rate':return r.dietRate==null?'—':money(r.dietRate);
 case 'diet_amount':return r.dietAmount==null?'—':money(r.dietAmount);
 case 'day_flags':return r.dayFlag||'—';
 case 'pluses':return r.plusItems.map(x=>x.concept).join(', ')||'—';
 case 'plus_amount':{const a=[r.dayExtra,...r.plusItems.map(x=>x.amount)].filter((x):x is number=>x!==null);return a.length?money(a.reduce((v,n)=>v+n,0)):'—';}
 case 'km':return r.km==null?'—':r.km.toLocaleString('es-ES')+' km';
 case 'rest':return r.rest==null?'—':hours(r.rest);
 default:return '—';
 }
}
