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
 if(role!=='owner'&&!isPaidAccess(company))return enterpriseJson({company,member,blocked:true,reason:'Prueba gratuita o suscripción no activa'});
 // HR does not receive route, location, individual jornada or traffic data.
 if(role==='hr'){
  const [reviews,closures,drivers]=await Promise.all([
   db.from('tp_diet_reviews').select('id,driver_id,jornada_date,status,original_diet_type,original_amount,original_pluses,proposed_diet_type,proposed_amount,proposed_pluses,driver_observation,traffic_observation,change_reason,confirmed_at,created_at')
    .eq('company_id',companyId).order('created_at',{ascending:false}).limit(500),
   db.from('tp_payroll_closures').select('id,month,driver_id,total_diets,total_pluses,confirmed_count,pending_count,disputed_count,closed_at')
    .eq('company_id',companyId).order('closed_at',{ascending:false}).limit(200),
   db.from('tp_company_members').select('user_id,username,role').eq('company_id',companyId).eq('active',true).eq('role','driver')
  ]);
  for(const response of [reviews,closures,drivers])if(response.error)throw response.error;
  return enterpriseJson({company,member,drivers:drivers.data||[],reviews:reviews.data||[],closures:closures.data||[]});
 }
 if(role==='traffic'){
  const members=await db.from('tp_company_members').select('user_id,username').eq('company_id',companyId).eq('active',true).eq('role','driver');
  if(members.error)throw members.error;
  const ids=(members.data||[]).map(x=>x.user_id);
  const [jornadas,reviews]=await Promise.all([
   ids.length?db.from('jornadas').select('id,user_id,fecha_inicio,fecha_fin,hora_inicio,hora_fin,lugar_inicio,lugar_fin,tipo_ruta,dieta_manual_tipo,dieta_importe_eur,plus_items,conduccion_min').in('user_id',ids).order('created_at',{ascending:false}).limit(1500):Promise.resolve({data:[],error:null}),
   db.from('tp_diet_reviews').select('id,jornada_id,jornada_date,driver_id,status,original_diet_type,original_amount,original_pluses,proposed_diet_type,proposed_amount,proposed_pluses,traffic_observation,change_reason,driver_observation,created_at').eq('company_id',companyId).order('created_at',{ascending:false}).limit(1000)
  ]);
  if(jornadas.error||reviews.error)throw jornadas.error||reviews.error;
  return enterpriseJson({company,member,drivers:members.data||[],jornadas:jornadas.data||[],reviews:reviews.data||[]});
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
   db.from('tp_company_members').select('user_id,username,role,active,joined_at').eq('company_id',companyId).order('joined_at',{ascending:false}),
   db.from('tp_driver_settings').select('driver_id,base_name,workplace,agreement,effective_from,diet_rates,plus_rates,payroll_terms,updated_at').eq('company_id',companyId),
   db.from('tp_company_invites').select('id,email,username,role,created_at,expires_at,accepted_at,revoked_at').eq('company_id',companyId).order('created_at',{ascending:false}).limit(100)
  ]);
  for(const response of [team,settings,invites])if(response.error)throw response.error;
  return enterpriseJson({company,member,team:team.data||[],settings:settings.data||[],invites:invites.data||[]});
 }
 return enterpriseJson({error:'Rol sin acceso'},403);
 }catch(error){console.error('tp enterprise dashboard',error);return enterpriseJson({error:'No se pudo consultar el panel'},500);}
}
