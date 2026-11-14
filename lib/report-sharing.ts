export const REPORT_FIELD_OPTIONS=[
 {key:'driver_name',label:'Nombre del conductor'},
 {key:'locations',label:'Origen y destino'},
 {key:'route_type',label:'Tipo de ruta'},
 {key:'driving',label:'Horas de conducción'},
 {key:'working',label:'Duración de la jornada'},
 {key:'diet_type',label:'Tipo de dieta'},
 {key:'diet_pct',label:'Porcentaje de dieta'},
 {key:'diet_rate',label:'Tarifa base de dieta'},
 {key:'diet_amount',label:'Importe de dieta'},
 {key:'km',label:'Kilómetros'},
 {key:'rest',label:'Descanso anterior'}
] as const;
export type ReportField=typeof REPORT_FIELD_OPTIONS[number]['key'];
export const ALL_REPORT_FIELDS=REPORT_FIELD_OPTIONS.map(v=>v.key);
export const DEFAULT_REPORT_FIELDS:ReportField[]=['route_type','diet_type','diet_pct'];
export type SharedReportRow={
 date:string; start:string|null;end:string|null;routeType:string|null;
 driving:number|null;working:number|null;dietType:string|null;dietPct:number|null;
 dietRate:number|null;dietAmount:number|null;km:number|null;rest:number|null;
};
export type SharedReportData={
 title:string;driverName:string|null;from:string;to:string;
 fields:ReportField[]; rows:SharedReportRow[];generatedAt:string;
};
export const validDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
export const validFields=(v:unknown):v is ReportField[]=>Array.isArray(v)&&v.length>0&&v.length<=ALL_REPORT_FIELDS.length&&new Set(v).size===v.length&&v.every(x=>ALL_REPORT_FIELDS.includes(x));
export const money=(v:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(v);
export const hours=(n:number)=>Math.floor(n/60)+' h '+String(Math.round(n%60)).padStart(2,'0')+' min';
export function parseAmount(v:unknown):number|null{
 if(typeof v==='number')return Number.isFinite(v)?v:null;
 if(typeof v!=='string'||!v.trim())return null;
 let s=v.trim().replace(/\s/g,'');
 if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');
 const n=Number(s);
 return Number.isFinite(n)&&n>=0?n:null;
}
export type RawReportJornada={
 fecha_inicio:string|null;created_at:string;
 lugar_inicio:string|null;lugar_fin:string|null;tipo_ruta:string|null;
 conduccion_min:number|null;tacho_driving_min:number|null;duracion_jornada_min:number|null;
 dieta_manual_tipo:string|null;dieta_modo:string|null;dieta_manual_pct:number|null;dieta_percent:number|null;
 dieta_importe_eur:string|null;diet_base_eur:number|null;km_total:number|null;descanso_anterior_min:number|null;
};
export const REPORT_DB_COLUMNS='fecha_inicio,created_at,lugar_inicio,lugar_fin,tipo_ruta,conduccion_min,tacho_driving_min,duracion_jornada_min,dieta_manual_tipo,dieta_modo,dieta_manual_pct,dieta_percent,dieta_importe_eur,diet_base_eur,km_total,descanso_anterior_min';
export function mapReportRow(j:RawReportJornada):SharedReportRow{
 return {
 date:j.fecha_inicio||j.created_at.slice(0,10),
 start:j.lugar_inicio,end:j.lugar_fin,routeType:j.tipo_ruta,
 driving:j.conduccion_min??(j.tacho_driving_min&&j.tacho_driving_min>0?j.tacho_driving_min:null),
 working:j.duracion_jornada_min,
 dietType:j.dieta_manual_tipo||dietItem?.tipo||j.tipo_ruta||null,
 dietPct:j.dieta_manual_pct??j.dieta_percent??parseAmount(dietItem?.pct)??null,
 dietRate:j.diet_base_eur,
 dietAmount:parseAmount(j.dieta_importe_eur)??j.diet_base_eur,
 km:j.km_total,rest:j.descanso_anterior_min
 };
}
export function redactRows(rows:SharedReportRow[],fields:ReportField[]):SharedReportRow[]{
 const include=(field:ReportField)=>fields.includes(field);
 return rows.map(r=>({
 date:r.date,
 start:include('locations')?r.start:null,end:include('locations')?r.end:null,
 routeType:include('route_type')?r.routeType:null,
 driving:include('driving')?r.driving:null,working:include('working')?r.working:null,
 dietType:include('diet_type')?r.dietType:null,dietPct:include('diet_pct')?r.dietPct:null,
 dietRate:include('diet_rate')?r.dietRate:null,dietAmount:include('diet_amount')?r.dietAmount:null,
 km:include('km')?r.km:null,rest:include('rest')?r.rest:null
 }));
}
export function labelValue(r:SharedReportRow,key:ReportField):string{
 switch(key){
 case 'locations':return [r.start||'—',r.end||'—'].join(' → ');
 case 'route_type':return r.routeType||'—';
 case 'driving':return r.driving==null?'—':hours(r.driving);
 case 'working':return r.working==null?'—':hours(r.working);
 case 'diet_type':return r.dietType||'—';
 case 'diet_pct':return r.dietPct==null?'—':r.dietPct+' %';
 case 'diet_rate':return r.dietRate==null?'—':money(r.dietRate);
 case 'diet_amount':return r.dietAmount==null?'—':money(r.dietAmount);
 case 'km':return r.km==null?'—':r.km.toLocaleString('es-ES')+' km';
 case 'rest':return r.rest==null?'—':hours(r.rest);
 default:return '—';
 }
}
