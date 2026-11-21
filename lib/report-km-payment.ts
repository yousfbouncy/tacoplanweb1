import type {ReportField, SharedReportRow} from './report-sharing';

export type KmPaymentProfile={
 payment_mode:string|null;
 price_per_km:number|null;
 price_per_km_nacional:number|null;
 price_per_km_internacional:number|null;
 price_per_km_regional:number|null;
};
const numberOrNull=(v:unknown):number|null=>{
 if(v===null||v===undefined||String(v).trim()==='')return null;
 const n=Number(String(v).replace(',','.'));
 return Number.isFinite(n)&&n>0?n:null;
};
const cents=(v:number)=>Math.round((v+Number.EPSILON)*100)/100;
/** The main/default €/km price is a fallback, never an additional multiplier. */
export function rateForRoute(profile:KmPaymentProfile,route:string|null):number|null{
 const kind=String(route||'').trim().toUpperCase();
 const dedicated=kind.includes('INTERNACIONAL')||kind.includes('INTL')
  ?profile.price_per_km_internacional
  :kind.includes('REGIONAL')?profile.price_per_km_regional
  :kind.includes('NACIONAL')?profile.price_per_km_nacional:null;
 return numberOrNull(dedicated)??numberOrNull(profile.price_per_km);
}
export function attachKmPayment(rows:SharedReportRow[],profile:KmPaymentProfile,fields:readonly ReportField[]):SharedReportRow[]{
 const canShowRate=fields.includes('km_rate');
 const canShowAmount=fields.includes('km_amount');
 if(!canShowRate&&!canShowAmount)return rows;
 if(profile.payment_mode!=='km')return rows;
 return rows.map(row=>{
  const price=rateForRoute(profile,row.routeType);
  const amount=price!==null&&row.km!==null&&Number.isFinite(row.km)&&row.km>=0
   ?cents(row.km*price):null;
  return {...row,kmRate:canShowRate?price:null,kmAmount:canShowAmount?amount:null};
 });
}
export function kmPaymentTotal(rows:SharedReportRow[]):{total:number;missing:number;count:number}{
 const paid=rows.filter(r=>r.kmAmount!==null&&r.kmAmount!==undefined);
 return {total:cents(paid.reduce((sum,r)=>sum+(r.kmAmount||0),0)),
  missing:rows.filter(r=>r.kmAmount===null||r.kmAmount===undefined).length,count:paid.length};
}
