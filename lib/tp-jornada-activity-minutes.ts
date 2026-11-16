/**
 * Tacoplan jornada fields can have tacho_* = 0 when tachograph activity
 * telemetry was never recorded. Never let that placeholder override actual
 * driver-entered driving minutes.
 */
export type JornadaActivitySummary = {
  conduccion_min?:number|null;
  tacho_driving_min?:number|null;
  tacho_available_min?:number|null;
  tacho_rest_min?:number|null;
  tacho_work_min?:number|null;
};
const nonNegative=(value:number|null|undefined):number|null=>
  typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
export function jornadaActivityMinutes(j:JornadaActivitySummary){
 const manualDriving=nonNegative(j.conduccion_min);
 const tachoDriving=nonNegative(j.tacho_driving_min);
 // Manual driving has priority when stored tachograph fields are defaults.
 const driving=manualDriving!==null&&manualDriving>0?manualDriving:tachoDriving!==null&&tachoDriving>0?tachoDriving:manualDriving;
 // An unpopulated tachograph summary often stores all auxiliary fields as 0.
 const hasTachoData=[j.tacho_driving_min,j.tacho_available_min,j.tacho_rest_min,j.tacho_work_min]
   .some(v=>typeof v==='number'&&v>0);
 const auxiliary=(v:number|null|undefined)=>hasTachoData?nonNegative(v):null;
 return {driving,available:auxiliary(j.tacho_available_min),rest:auxiliary(j.tacho_rest_min),work:auxiliary(j.tacho_work_min)};
}
