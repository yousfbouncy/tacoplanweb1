import {NextRequest} from 'next/server';
import {membership,enterpriseJson,originAllowed,permitted,isPaidAccess} from '@/lib/tp-enterprise';
export const dynamic='force-dynamic';
type Review={id:string;driver_id:string;jornada_id:string;status:string;original_amount:number;proposed_amount:number|null;original_pluses:unknown;proposed_pluses:unknown;jornada_date:string|null};
const parseAmount=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:0;};
const calcPlus=(items:unknown)=>{
 if(!Array.isArray(items))return 0;
 return items.reduce<number>((sum,item)=>{
  if(!item||typeof item!=='object')return sum;
  const x=item as Record<string,unknown>;
  if(/dieta|n[oó]mina|salario|sueldo|anticipo/i.test(String(x.concepto??x.concept??'')))return sum;
  return sum+parseAmount(x.importe??x.amount);
 },0);
};
const validMonth=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(v);
async function payroll(req:NextRequest,month:string){
 const auth=await membership(req);
 if(!auth||!auth.member)return {error:'Sesión de empresa requerida',status:401} as const;
 if(!permitted(auth.member.role,'hr'))return {error:'Solo RRHH tiene acceso al cierre de nómina',status:403} as const;
 const {db,member}=auth,companyId=member.company_id;
 const state=await db.from('tp_companies').select('subscription_status,trial_ends_at').eq('id',companyId).single();
 if(state.error||!isPaidAccess(state.data))return {error:'La suscripción empresarial no está activa',status:402} as const;
 const year=Number(month.slice(0,4)),mm=Number(month.slice(5));
 const first=new Date(Date.UTC(year,mm-1,1)).toISOString().slice(0,10),last=new Date(Date.UTC(year,mm,0)).toISOString().slice(0,10);
 const [reviews,drivers]=await Promise.all([
  db.from('tp_diet_reviews').select('id,driver_id,jornada_id,status,original_amount,proposed_amount,original_pluses,proposed_pluses,jornada_date')
   .eq('company_id',companyId).gte('jornada_date',first).lte('jornada_date',last).limit(3000),
  db.from('tp_company_members').select('user_id,username').eq('company_id',companyId).eq('role','driver')
 ]);
 if(reviews.error||drivers.error)throw reviews.error||drivers.error;
 const jornadaIds=Array.from(new Set((reviews.data||[]).map(r=>r.jornada_id).filter((id):id is string=>typeof id==='string')));
 const extrasQuery=jornadaIds.length?await db.from('jornadas').select('id,day_extra_eur').in('id',jornadaIds):{data:[],error:null};
 if(extrasQuery.error)throw extrasQuery.error;
 const extras=new Map((extrasQuery.data||[]).map(j=>[j.id,Math.max(0,Number(String(j.day_extra_eur||0).replace(',','.'))||0)]));
 const byDriver=new Map<string,{id:string;username:string;diets:number;pluses:number;confirmed:number;pending:number;disputed:number;lines:unknown[]}>();
 for(const d of drivers.data||[])byDriver.set(d.user_id,{id:d.user_id,username:d.username,diets:0,pluses:0,confirmed:0,pending:0,disputed:0,lines:[]});
 for(const r of reviews.data||[] as Review[]){
  const target=byDriver.get(r.driver_id);if(!target)continue;
  if(['confirmed','accepted','closed'].includes(r.status)){
   const gross=parseAmount(r.status==='accepted'?r.proposed_amount??r.original_amount:r.original_amount);
   const auto=Math.min(gross,extras.get(r.jornada_id)||0);
   const value=Math.max(0,gross-auto);
   const plus=calcPlus(r.status==='accepted'&&r.proposed_pluses!==null?r.proposed_pluses:r.original_pluses)+auto;target.diets+=value;target.pluses+=plus;target.confirmed++;
   target.lines.push({review_id:r.id,date:r.jornada_date,diet:value,plus,status:r.status});
  }else if(r.status==='disputed')target.disputed++;
  else target.pending++;
 }
 return {db,auth,companyId,month,rows:Array.from(byDriver.values())};
}
export async function GET(req:NextRequest){
 const month=req.nextUrl.searchParams.get('month');
 if(!validMonth(month))return enterpriseJson({error:'Mes inválido'},400);
 try{
  const r=await payroll(req,month);
  if('error'in r)return enterpriseJson({error:r.error},r.status);
  return enterpriseJson({month,rows:r.rows});
 }catch(error){console.error('payroll preview',error);return enterpriseJson({error:'Error calculando el cierre'},500);}
}
export async function POST(req:NextRequest){
 if(!originAllowed(req))return enterpriseJson({error:'Origen no permitido'},403);
 let body:any;try{body=await req.json();}catch{return enterpriseJson({error:'Datos inválidos'},400);}
 if(!validMonth(body?.month))return enterpriseJson({error:'Mes inválido'},400);
 try{
  const r=await payroll(req,body.month);
  if('error'in r)return enterpriseJson({error:r.error},r.status);
  if(!r.rows.length)return enterpriseJson({error:'No hay conductores'},409);
  const {db,auth,companyId}=r;
  const already=await db.from('tp_payroll_closures').select('id',{count:'exact',head:true}).eq('company_id',companyId).eq('month',body.month);
  if(already.error)throw already.error;
  if((already.count||0)>0)return enterpriseJson({error:'Este mes ya tiene cierres registrados. No se puede sobrescribir; utiliza una regularización.'},409);
  const payload=r.rows.map(x=>({company_id:companyId,month:body.month,driver_id:x.id,total_diets:Math.round(x.diets*100)/100,total_pluses:Math.round(x.pluses*100)/100,confirmed_count:x.confirmed,pending_count:x.pending,disputed_count:x.disputed,line_items:x.lines,closed_by:auth.user.id}));
  const insert=await db.from('tp_payroll_closures').insert(payload);
  if(insert.error)throw insert.error;
  const audit=await db.from('tp_company_audit').insert({company_id:companyId,actor_id:auth.user.id,action:'payroll.month.closed',entity:'month',entity_id:body.month,after_data:{drivers:r.rows.length,confirmed:r.rows.reduce((n,x)=>n+x.confirmed,0),pending:r.rows.reduce((n,x)=>n+x.pending,0),disputed:r.rows.reduce((n,x)=>n+x.disputed,0)}});
  if(audit.error)console.error('audit payroll',audit.error.message);
  return enterpriseJson({ok:true,month:body.month,drivers:r.rows.length});
 }catch(error){console.error('payroll close',error);return enterpriseJson({error:'No se pudo cerrar el mes'},500);}
}
