import {NextRequest} from 'next/server';
import {membership,enterpriseJson,originAllowed,permitted,isPaidAccess} from '@/lib/tp-enterprise';
import {reviewCents} from '@/lib/tp-hr-diet-breakdown';
import {payrollDateRange} from '@/lib/tp-payroll-period';

export const dynamic='force-dynamic';

type Review={
 id:string;driver_id:string;jornada_id:string;jornada_date:string|null;status:string;
 original_amount:number;proposed_amount:number|null;
 original_pluses:Array<{concepto:string;importe:number}>|null;
 proposed_pluses:Array<{concepto:string;importe:number}>|null;
};
const monthRange=(month:unknown)=>{
 if(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return null;
 const y=Number(month.slice(0,4)),m=Number(month.slice(5));
 return {from:month+'-01',to:new Date(Date.UTC(y,m,0)).toISOString().slice(0,10)};
};
const incomingRange=(value:any)=>value?.from!=null||value?.to!=null
 ?payrollDateRange(value?.from,value?.to):monthRange(value?.month);

async function payroll(req:NextRequest,from:string,to:string){
 const auth=await membership(req);
 if(!auth?.member)return {error:'Sesión de empresa requerida',status:401} as const;
 if(!permitted(auth.member.role,'hr'))return {error:'Solo RR. HH. tiene acceso al cierre de nómina',status:403} as const;
 const {db,member}=auth,companyId=member.company_id;
 const state=await db.from('tp_companies').select('subscription_status,trial_ends_at').eq('id',companyId).single();
 if(state.error)throw state.error;
 if(!isPaidAccess(state.data))return {error:'La suscripción empresarial no está activa',status:402} as const;

 const reviews:Review[]=[];
 // Paginate rather than silently close only the first 3000 lines.
 for(let offset=0;offset<10000;offset+=500){
  const result=await db.from('tp_diet_reviews')
   .select('id,driver_id,jornada_id,jornada_date,status,original_amount,proposed_amount,original_pluses,proposed_pluses')
   .eq('company_id',companyId).gte('jornada_date',from).lte('jornada_date',to)
   .order('jornada_date',{ascending:false}).order('id',{ascending:false})
   .range(offset,offset+499);
  if(result.error)throw result.error;
  const page=(result.data||[]) as Review[];
  reviews.push(...page);
  if(page.length<500)break;
 }
 if(reviews.length>=10000)return {error:'El período contiene demasiadas revisiones. Reduce el intervalo de fechas.',status:413} as const;
 const drivers=await db.from('tp_company_members')
  .select('user_id,username').eq('company_id',companyId).eq('role','driver');
 if(drivers.error)throw drivers.error;

 const jornadaIds=Array.from(new Set(reviews.map(r=>r.jornada_id)
  .filter((id):id is string=>typeof id==='string'&&!id.startsWith('natural_day:'))));
 type Extra={id:string;day_extra_eur:number|null;diet_base_eur:number|null};
 const extras:Extra[]=[];
 for(let i=0;i<jornadaIds.length;i+=100){
  const part=await db.from('jornadas').select('id,day_extra_eur,diet_base_eur').in('id',jornadaIds.slice(i,i+100));
  if(part.error)throw part.error;
  extras.push(...(part.data||[] as Extra[]));
 }
 const byId=new Map(extras.map(j=>[j.id,j]));
 const byDriver=new Map<string,{id:string;username:string;dietsCents:number;plusesCents:number;confirmed:number;pending:number;disputed:number;lines:unknown[]}>();
 for(const d of drivers.data||[])byDriver.set(d.user_id,{id:d.user_id,username:d.username,dietsCents:0,plusesCents:0,confirmed:0,pending:0,disputed:0,lines:[]});
 for(const review of reviews){
  const row=byDriver.get(review.driver_id);
  if(!row)continue;
  if(['confirmed','accepted','closed'].includes(review.status)){
   const related=byId.get(review.jornada_id);
   const original=Number(review.original_amount)||0,extra=Math.max(0,Number(String(related?.day_extra_eur||0).replace(',','.'))||0);
   const base=Number(related?.diet_base_eur)||0;
   const auto=extra>0&&original+0.01>=base+extra?extra:0;
   const cents=reviewCents({...review,automatic_plus:auto});
   row.dietsCents+=cents.diet;
   row.plusesCents+=cents.plus;
   row.confirmed++;
   row.lines.push({review_id:review.id,date:review.jornada_date,diet:cents.diet/100,plus:cents.plus/100,status:review.status});
  }else if(review.status==='disputed')row.disputed++;
  else row.pending++;
 }
 // Do not close employees without a single approved line: doing so would
 // incorrectly lock their dates from a later legitimate payment.
 const rows=Array.from(byDriver.values()).filter(row=>row.confirmed>0).map(row=>({
  id:row.id,username:row.username,diets:row.dietsCents/100,pluses:row.plusesCents/100,
  confirmed:row.confirmed,pending:row.pending,disputed:row.disputed,lines:row.lines
 }));
 return {db,auth,companyId,from,to,rows};
}
export async function GET(req:NextRequest){
 const range=incomingRange(Object.fromEntries(req.nextUrl.searchParams));
 if(!range)return enterpriseJson({error:'Selecciona fechas válidas Desde/Hasta (máximo 366 días)'},400);
 try{
  const r=await payroll(req,range.from,range.to);
  if('error' in r)return enterpriseJson({error:r.error},r.status);
  return enterpriseJson({from:range.from,to:range.to,rows:r.rows});
 }catch(error){console.error('payroll period preview',error);return enterpriseJson({error:'Error calculando el cierre del período'},500);}
}
export async function POST(req:NextRequest){
 if(!originAllowed(req))return enterpriseJson({error:'Origen no permitido'},403);
 let body:any;try{body=await req.json();}catch{return enterpriseJson({error:'Datos inválidos'},400);}
 const range=incomingRange(body);
 if(!range)return enterpriseJson({error:'Selecciona fechas válidas Desde/Hasta (máximo 366 días)'},400);
 try{
  const r=await payroll(req,range.from,range.to);
  if('error' in r)return enterpriseJson({error:r.error},r.status);
  if(!r.rows.length)return enterpriseJson({error:'No existen dietas ni pluses confirmados para cerrar en las fechas seleccionadas'},409);
  const {db,auth,companyId}=r;

  const ids=r.rows.map(row=>row.id);
  const existing=await db.from('tp_payroll_closures')
   .select('driver_id,period_from,period_to').eq('company_id',companyId)
   .in('driver_id',ids).lte('period_from',range.to).gte('period_to',range.from).limit(5);
  if(existing.error)throw existing.error;
  if(existing.data?.length)return enterpriseJson({error:'El período se solapa con un cierre anterior para uno o más conductores. Selecciona fechas sin liquidar para evitar duplicados.'},409);

  const payload=r.rows.map(row=>({
   company_id:companyId,month:range.from.slice(0,7),
   period_from:range.from,period_to:range.to,
   driver_id:row.id,total_diets:row.diets,total_pluses:row.pluses,
   confirmed_count:row.confirmed,pending_count:row.pending,disputed_count:row.disputed,
   line_items:row.lines,closed_by:auth.user.id
  }));
  // One atomic PostgREST insert. PostgreSQL's GiST exclusion constraint
  // rejects overlapping periods even during concurrent requests.
  const inserted=await db.from('tp_payroll_closures').insert(payload);
  if(inserted.error){
   if(['23P01','23505'].includes(inserted.error.code||''))return enterpriseJson({error:'Las fechas seleccionadas se solapan con un cierre existente. No se han duplicado importes.'},409);
   throw inserted.error;
  }
  const audit=await db.from('tp_company_audit').insert({
   company_id:companyId,actor_id:auth.user.id,action:'payroll.period.closed',
   entity:'period',entity_id:range.from+'_'+range.to,
   after_data:{from:range.from,to:range.to,drivers:r.rows.length,
    diet_total:r.rows.reduce((v,row)=>v+Math.round(row.diets*100),0)/100,
    plus_total:r.rows.reduce((v,row)=>v+Math.round(row.pluses*100),0)/100,
    confirmed:r.rows.reduce((v,row)=>v+row.confirmed,0)}
  });
  if(audit.error)console.warn('audit payroll period',audit.error.message);
  return enterpriseJson({ok:true,from:range.from,to:range.to,drivers:r.rows.length});
 }catch(error){
  console.error('payroll period close',error);
  return enterpriseJson({error:'No se pudo cerrar el período seleccionado'},500);
 }
}
