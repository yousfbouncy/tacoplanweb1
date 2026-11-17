/** The HR view displays only monetary amounts already confirmed for payment.
 * Compute in cents so the sum of daily rows matches the employee and company totals.
 */
export type FinancialReview = {
 id:string;
 jornada_date?:string|null;
 status:string;
 original_amount?:number|null;
 proposed_amount?:number|null;
 automatic_plus?:number|null;
 original_pluses?:Array<{concepto:string;importe:number}>|null;
 proposed_pluses?:Array<{concepto:string;importe:number}>|null;
};
export type DailyLiquidation={date:string;diet:number;plus:number;total:number;records:number};
export const isApprovedReview=(review:Pick<FinancialReview,'status'>)=>
 ['confirmed','accepted','closed'].includes(review.status);
const cents=(value:unknown)=>{
 const n=typeof value==='number'?value:Number(value);
 return Number.isFinite(n)?Math.max(0,Math.round(n*100)):0;
};
export const reviewCents=(r:FinancialReview)=>{
 if(!isApprovedReview(r))return {diet:0,plus:0,total:0};
 const gross=cents(r.status==='accepted'?r.proposed_amount??r.original_amount:r.original_amount);
 const automatic=Math.min(gross,cents(r.automatic_plus));
 const items=r.status==='accepted'&&r.proposed_pluses!=null?r.proposed_pluses:r.original_pluses||[];
 const manual=items.reduce((sum,p)=>{
  if(!p||/dieta|n[oó]mina|salario|sueldo|anticipo/i.test(String(p.concepto||'')))return sum;
  return sum+cents(p.importe);
 },0);
 return {diet:gross-automatic,plus:automatic+manual,total:gross+manual};
};
export const reviewAmounts=(r:FinancialReview)=>{
 const p=reviewCents(r);
 return {diet:p.diet/100,plus:p.plus/100,total:p.total/100};
};
export const groupConfirmedDays=(reviews:FinancialReview[]):DailyLiquidation[]=>{
 const byDate=new Map<string,{date:string;diet:number;plus:number;total:number;records:number}>();
 for(const r of reviews){
  if(!isApprovedReview(r)||!r.jornada_date||!/^\d{4}-\d{2}-\d{2}$/.test(r.jornada_date))continue;
  const p=reviewCents(r),old=byDate.get(r.jornada_date)||{date:r.jornada_date,diet:0,plus:0,total:0,records:0};
  old.diet+=p.diet;old.plus+=p.plus;old.total+=p.total;old.records++;
  byDate.set(r.jornada_date,old);
 }
 return Array.from(byDate.values()).sort((a,b)=>b.date.localeCompare(a.date))
  .map(x=>({...x,diet:x.diet/100,plus:x.plus/100,total:x.total/100}));
};
export const sumConfirmedReviews=(reviews:FinancialReview[])=>{
 const p=reviews.reduce((tot,r)=>{const x=reviewCents(r);return {diet:tot.diet+x.diet,plus:tot.plus+x.plus,total:tot.total+x.total};},{diet:0,plus:0,total:0});
 return {diet:p.diet/100,plus:p.plus/100,total:p.total/100};
};
