import type {SharedReportRow,ReportField} from './report-sharing';
/**
 * Attach per-shift nocturnity evidence, respecting field-level authorization.
 * Never infer a per-hour statutory rate from monthly León article 25.
 */
export async function attachNightReportData(
 db:{from:(name:string)=>any},
 userId:string,
 rows:SharedReportRow[],
 fields:ReportField[],
 from:string,
 to:string,
):Promise<{rows:SharedReportRow[];nightPremiumMonthly:number|null;nightPremiumEstimate:number|null}> {
 if(!fields.includes('night_work')&&!fields.includes('night_premium'))return {rows,nightPremiumMonthly:null,nightPremiumEstimate:null};
 const ids=rows.map(r=>r.shiftId).filter((x):x is string=>!!x);
 const found=new Map<string,{night_work_minutes:number;night_window_minutes:number;is_estimated:boolean}>();
 if(ids.length){
  for(let i=0;i<ids.length;i+=100){
   const {data,error}=await db.from('user_night_work_shift_summaries')
    .select('shift_id,night_work_minutes,night_window_minutes,is_estimated')
    .eq('user_id',userId).in('shift_id',ids.slice(i,i+100));
   if(error)throw Error('No se pudieron consultar las horas nocturnas: '+error.message);
   for(const r of data||[])found.set(String(r.shift_id),r);
  }
 }
 const enhanced=rows.map(r=>{
  const n=r.shiftId?found.get(r.shiftId):undefined;
  return {...r,nightMinutes:fields.includes('night_work')?(n?.is_estimated?n.night_window_minutes:n?.night_work_minutes??null):null,
   nightEstimated:fields.includes('night_work')?(n?.is_estimated??false):false};
 });
 if(!fields.includes('night_premium'))return {rows:enhanced,nightPremiumMonthly:null,nightPremiumEstimate:null};
 const [settings,profile]=await Promise.all([
  db.from('user_night_work_settings').select('enabled,rate_percent,base_salary_monthly').eq('user_id',userId).maybeSingle(),
  db.from('profiles').select('payroll_config').eq('id',userId).maybeSingle()
 ]);
 if(settings.error||profile.error)throw Error('No se pudo cargar la configuración de nocturnidad');
 const cfg=(profile.data?.payroll_config||{}) as Record<string,unknown>;
 const enabled=settings.data?.enabled===true||cfg.night_enabled===true;
 const rate=Number(settings.data?.rate_percent??cfg.night_rate_pct??7);
 const entered=Number(String(settings.data?.base_salary_monthly??cfg.night_salary_base_monthly??'').replace(',','.'));
 const rawBase=Number(String(cfg.salario_base_bruto??'').replace(',','.'));
 const base=Number.isFinite(entered)&&entered>0?entered:(cfg.fixed_unit==='day'?rawBase*30:rawBase);
 const monthly=enabled&&Number.isFinite(base)&&base>0&&Number.isFinite(rate)?Math.round(base*rate)/100:null;
 const eligible=enhanced.some(r=>r.nightMinutes!==null&&(r.nightMinutes??0)>0);
 // A partial month can vary by payroll conditions: this is a monthly reference,
 // not a certified amount earned in an arbitrary shorter report period.
 return {rows:enhanced,nightPremiumMonthly:monthly,nightPremiumEstimate:eligible?monthly:null};
}
