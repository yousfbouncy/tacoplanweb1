import {NextRequest} from 'next/server';
import {membership,enterpriseJson,isPaidAccess} from '@/lib/tp-enterprise';

export const dynamic='force-dynamic';
const validDay=(s:string|null)=>{
 if(!s||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const d=new Date(s+'T12:00:00Z');
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;
};
/** Access-controlled, date-scoped finance data; no routes, locations or driving times. */
export async function GET(req:NextRequest){
 const from=req.nextUrl.searchParams.get('from'),to=req.nextUrl.searchParams.get('to');
 if(!validDay(from)||!validDay(to)||from!>to!)return enterpriseJson({error:'Selecciona un período válido: Desde no puede ser posterior a Hasta'},400);
 try{
  const auth=await membership(req);
  if(!auth?.member||auth.member.role!=='hr')return enterpriseJson({error:'Solo RR. HH. puede consultar liquidaciones'},403);
  const {db,member}=auth,companyId=member.company_id;
  const company=await db.from('tp_companies').select('subscription_status,trial_ends_at').eq('id',companyId).single();
  if(company.error)throw company.error;
  if(!isPaidAccess(company.data))return enterpriseJson({error:'La suscripción empresarial no está activa'},402);
  type Review={
   id:string;driver_id:string;jornada_id:string;jornada_date:string|null;status:string;
   original_diet_type:string|null;original_amount:number;original_pluses:unknown;
   proposed_diet_type:string|null;proposed_amount:number|null;proposed_pluses:unknown;
   driver_observation:string|null;traffic_observation:string|null;change_reason:string|null;
  };
  const reviews:Review[]=[];
  // Page through the selected range rather than silently truncating older days.
  for(let offset=0;offset<10000;offset+=500){
   const part=await db.from('tp_diet_reviews')
    .select('id,driver_id,jornada_id,jornada_date,status,original_diet_type,original_amount,original_pluses,proposed_diet_type,proposed_amount,proposed_pluses,driver_observation,traffic_observation,change_reason')
    .eq('company_id',companyId).gte('jornada_date',from).lte('jornada_date',to)
    .order('jornada_date',{ascending:false}).order('id',{ascending:false})
    .range(offset,offset+499);
   if(part.error)throw part.error;
   const rows=(part.data||[]) as Review[];
   reviews.push(...rows);
   if(rows.length<500)break;
  }
  if(reviews.length>=10000)return enterpriseJson({error:'Hay más de 10.000 revisiones en el período. Reduce las fechas para obtener el desglose completo.'},413);
  const ids=Array.from(new Set(reviews.map(r=>r.jornada_id).filter((id):id is string=>typeof id==='string'&&!id.startsWith('natural_day:'))));
  type Linked={id:string;day_extra_eur:number|null;day_flag:string|null;diet_base_eur:number|null};
  const linked:Linked[]=[];
  for(let i=0;i<ids.length;i+=100){
   const part=await db.from('jornadas').select('id,day_extra_eur,day_flag,diet_base_eur').in('id',ids.slice(i,i+100));
   if(part.error)throw part.error;
   linked.push(...(part.data||[]) as Linked[]);
  }
  const byId=new Map(linked.map(j=>[j.id,j]));
  const financial=reviews.map(r=>{
   const item=byId.get(r.jornada_id);
   const extra=Math.max(0,Number(String(item?.day_extra_eur||0).replace(',','.'))||0);
   const base=Number(item?.diet_base_eur)||0;
   const original=Number(r.original_amount)||0;
   return {...r,automatic_plus:extra>0&&original+0.01>=base+extra?extra:0,
    automatic_plus_concept:item?.day_flag||null};
  });
  return enterpriseJson({from,to,reviews:financial});
 }catch(error){
  console.error('hr period review',error);
  return enterpriseJson({error:'No se pudo cargar el desglose del período'},500);
 }
}
