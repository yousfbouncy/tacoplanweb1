import {NextRequest} from 'next/server';
import {membership,enterpriseJson,isPaidAccess} from '@/lib/tp-enterprise';
export const dynamic='force-dynamic';

export async function GET(req:NextRequest){
 try{
 const auth=await membership(req);
 if(!auth)return enterpriseJson({error:'Sesión requerida'},401);
 if(!auth.member)return enterpriseJson({account:auth.user.email,member:null});
 const {db,user,member}=auth,companyId=member.company_id;
 const {data:company,error:companyError}=await db.from('tp_companies')
  .select('id,name,subscription_status,trial_ends_at,plan_price_id,created_at')
  .eq('id',companyId).single();
 if(companyError||!company)return enterpriseJson({error:'Empresa no disponible'},404);
 const role=member.role;
 const subscriptionActive=isPaidAccess(company);
 // Keep employee rosters visible to HR even when billing is pending. Restricted
 // payroll details and traffic/location data remain unavailable until active.
 if(role==='hr'&&!subscriptionActive){
  const [drivers,trafficMembers,assignments]=await Promise.all([
   db.from('tp_company_members').select('user_id,username,employee_name,role').eq('company_id',companyId).eq('active',true).eq('role','driver'),
   db.from('tp_company_members').select('user_id,username,employee_name,role').eq('company_id',companyId).eq('active',true).eq('role','traffic'),
   db.from('tp_traffic_driver_assignments').select('driver_id,traffic_user_id,assigned_at').eq('company_id',companyId)
  ]);
  for(const result of [drivers,trafficMembers,assignments])if(result.error)throw result.error;
  return enterpriseJson({company,member,blocked:true,reason:'Prueba gratuita o suscripción no activa',drivers:drivers.data||[],trafficMembers:trafficMembers.data||[],assignments:assignments.data||[],reviews:[],closures:[]});
 }
 if(role!=='owner'&&!subscriptionActive)return enterpriseJson({company,member,blocked:true,reason:'Prueba gratuita o suscripción no activa'});
 // HR does not receive route, location, individual jornada or traffic data.
 if(role==='hr'){
  const [reviews,closures,drivers,trafficMembers,assignments]=await Promise.all([
   db.from('tp_diet_reviews').select('id,driver_id,jornada_id,jornada_date,status,original_diet_type,original_amount,original_pluses,proposed_diet_type,proposed_amount,proposed_pluses,driver_observation,traffic_observation,change_reason,confirmed_at,created_at')
    .eq('company_id',companyId).order('created_at',{ascending:false}).limit(500),
   db.from('tp_payroll_closures').select('id,month,driver_id,total_diets,total_pluses,confirmed_count,pending_count,disputed_count,closed_at')
    .eq('company_id',companyId).order('closed_at',{ascending:false}).limit(200),
   db.from('tp_company_members').select('user_id,username,employee_name,role').eq('company_id',companyId).eq('active',true).eq('role','driver'),
   db.from('tp_company_members').select('user_id,username,employee_name,role').eq('company_id',companyId).eq('active',true).eq('role','traffic'),
   db.from('tp_traffic_driver_assignments').select('driver_id,traffic_user_id,assigned_at').eq('company_id',companyId)
  ]);
  for(const response of [reviews,closures,drivers,trafficMembers,assignments])if(response.error)throw response.error;
  // Payroll-only split of automatically registered Sunday/holiday amounts.
  // The original jornada total already includes the automatic extra, so never
  // double-count it as a second payment.
  const reviewRows=reviews.data||[];
  const jornadaIds=Array.from(new Set(reviewRows.map(r=>r.jornada_id).filter((id):id is string=>typeof id==='string')));
  const linked=jornadaIds.length?await db.from('jornadas').select('id,day_extra_eur,day_flag').in('id',jornadaIds):{data:[],error:null};
  if(linked.error)throw linked.error;
  const extras=new Map((linked.data||[]).map(j=>[j.id,{amount:Math.max(0,Number(String(j.day_extra_eur||0).replace(',','.'))||0),concept:String(j.day_flag||'Plus automático')}]));
  const financialReviews=reviewRows.map(r=>({...r,automatic_plus:extras.get(r.jornada_id)?.amount||0,automatic_plus_concept:extras.get(r.jornada_id)?.concept||null}));
  return enterpriseJson({company,member,drivers:drivers.data||[],trafficMembers:trafficMembers.data||[],assignments:assignments.data||[],reviews:financialReviews,closures:closures.data||[]});
 }
 if(role==='traffic'){
  const [members,allocation]=await Promise.all([
   db.from('tp_company_members').select('user_id,username,employee_name,joined_at').eq('company_id',companyId).eq('active',true).eq('role','driver'),
   db.from('tp_traffic_driver_assignments').select('driver_id').eq('company_id',companyId).eq('traffic_user_id',user.id)
  ]);
  if(members.error||allocation.error)throw members.error||allocation.error;
  const assigned=new Set((allocation.data||[]).map(x=>x.driver_id));
  const myDrivers=(members.data||[]).filter(x=>assigned.has(x.user_id));
  const ids=myDrivers.map(x=>x.user_id);
  // Joining an employer never shares a conductor's prior personal history.
  const joinedAt=new Map(myDrivers.map(m=>[m.user_id,new Date(m.joined_at).getTime()]));
  const [jornadas,reviews,plusSettings]=await Promise.all([
   ids.length?db.from('jornadas').select('id,user_id,created_at,fecha_inicio,fecha_fin,hora_inicio,hora_fin,lugar_inicio,lugar_fin,tipo_ruta,dieta_manual_tipo,dieta_percent,conduccion_min,tacho_driving_min,tacho_work_min,tacho_available_min,tacho_rest_min,start_at,end_at').in('user_id',ids).order('created_at',{ascending:false}).limit(1500):Promise.resolve({data:[],error:null}),
   db.from('tp_diet_reviews').select('id,jornada_id,jornada_date,driver_id,status,original_diet_type,proposed_diet_type,traffic_observation,change_reason,driver_observation,created_at').eq('company_id',companyId).in('driver_id',ids.length?ids:['00000000-0000-0000-0000-000000000000']).order('created_at',{ascending:false}).limit(1000),
   ids.length?db.from('tp_driver_settings').select('driver_id,plus_rates').eq('company_id',companyId).in('driver_id',ids):Promise.resolve({data:[],error:null})
  ]);
  if(jornadas.error||reviews.error||plusSettings.error)throw jornadas.error||reviews.error||plusSettings.error;
  return enterpriseJson({company,member,drivers:myDrivers,plusOptions:Object.fromEntries((plusSettings.data||[]).map(s=>[s.driver_id,Object.keys(s.plus_rates||{})])),jornadas:(jornadas.data||[]).filter(j=>{const joined=joinedAt.get(j.user_id);return joined!==undefined&&new Date(j.created_at).getTime()>=joined;}),reviews:reviews.data||[]});
 }
 if(role==='driver'){
  const [settings,reviews]=await Promise.all([
   db.from('tp_driver_settings').select('base_name,workplace,agreement,diet_rates,plus_rates,payroll_terms,effective_from').eq('company_id',companyId).eq('driver_id',user.id).maybeSingle(),
   db.from('tp_diet_reviews').select('id,status,original_diet_type,original_amount,original_pluses,proposed_diet_type,proposed_amount,proposed_pluses,change_reason,traffic_observation,driver_observation,created_at')
    .eq('company_id',companyId).eq('driver_id',user.id).order('created_at',{ascending:false}).limit(250)
  ]);
  if(settings.error||reviews.error)throw settings.error||reviews.error;
  return enterpriseJson({company,member,driverSettings:settings.data,reviews:reviews.data||[]});
 }
 // Owner manages identity, plan and configuration, but does not automatically
 // receive traffic routes, GPS or HR payroll figures.
 if(role==='owner'){
  const [team,settings,invites]=await Promise.all([
   db.from('tp_company_members').select('user_id,username,employee_name,role,active,joined_at').eq('company_id',companyId).order('joined_at',{ascending:false}),
   db.from('tp_driver_settings').select('driver_id,base_name,workplace,agreement,effective_from,diet_rates,plus_rates,payroll_terms,initial_config,updated_at').eq('company_id',companyId),
   db.from('tp_company_invites').select('id,email,username,employee_name,role,initial_settings,created_at,expires_at,accepted_at,revoked_at').eq('company_id',companyId).order('created_at',{ascending:false}).limit(100)
  ]);
  for(const response of [team,settings,invites])if(response.error)throw response.error;
  return enterpriseJson({company,member,team:team.data||[],settings:settings.data||[],invites:invites.data||[]});
 }
 return enterpriseJson({error:'Rol sin acceso'},403);
 }catch(error){console.error('tp enterprise dashboard',error);return enterpriseJson({error:'No se pudo consultar el panel'},500);}
}
