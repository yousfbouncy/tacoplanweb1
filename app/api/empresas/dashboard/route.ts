import {NextRequest} from 'next/server';
import {membership,enterpriseJson,isPaidAccess} from '@/lib/tp-enterprise';
import {calculateTrafficDutyLimit,type TrafficDutyJornada} from '@/lib/tp-traffic-duty-limit';
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
   db.from('tp_traffic_driver_assignments').select('driver_id,traffic_user_id,assigned_at').eq('company_id',companyId),
   db.from('tp_diet_adjustments').select('id,driver_id,diet_date,operation,original_diet_type,proposed_diet_type,proposed_percentage,reason,status,driver_observation,created_at').eq('company_id',companyId).order('created_at',{ascending:false}).limit(500)
  ]);
  for(const result of [drivers,trafficMembers,assignments])if(result.error)throw result.error;
  return enterpriseJson({company,member,blocked:true,reason:'Prueba gratuita o suscripción no activa',drivers:drivers.data||[],trafficMembers:trafficMembers.data||[],assignments:assignments.data||[],reviews:[],closures:[]});
 }
 if(role!=='owner'&&!subscriptionActive)return enterpriseJson({company,member,blocked:true,reason:'Prueba gratuita o suscripción no activa'});
 // HR does not receive route, location, individual jornada or traffic data.
 if(role==='hr'){
  const [reviews,closures,drivers,trafficMembers,assignments,adjustments]=await Promise.all([
   db.from('tp_diet_reviews').select('id,driver_id,jornada_id,jornada_date,status,original_diet_type,original_amount,original_pluses,proposed_diet_type,proposed_amount,proposed_pluses,driver_observation,traffic_observation,change_reason,confirmed_at,created_at')
    .eq('company_id',companyId).order('created_at',{ascending:false}).limit(500),
   db.from('tp_payroll_closures').select('id,month,driver_id,total_diets,total_pluses,confirmed_count,pending_count,disputed_count,closed_at')
    .eq('company_id',companyId).order('closed_at',{ascending:false}).limit(200),
   db.from('tp_company_members').select('user_id,username,employee_name,role').eq('company_id',companyId).eq('active',true).eq('role','driver'),
   db.from('tp_company_members').select('user_id,username,employee_name,role').eq('company_id',companyId).eq('active',true).eq('role','traffic'),
   db.from('tp_traffic_driver_assignments').select('driver_id,traffic_user_id,assigned_at').eq('company_id',companyId)
  ]);
  for(const response of [reviews,closures,drivers,trafficMembers,assignments,adjustments])if(response.error)throw response.error;
  // Payroll-only split of automatically registered Sunday/holiday amounts.
  // The original jornada total already includes the automatic extra, so never
  // double-count it as a second payment.
  const reviewRows=reviews.data||[];
  const jornadaIds=Array.from(new Set(reviewRows.map(r=>r.jornada_id).filter((id):id is string=>typeof id==='string')));
  const linked=jornadaIds.length?await db.from('jornadas').select('id,day_extra_eur,day_flag,diet_base_eur').in('id',jornadaIds):{data:[],error:null};
  if(linked.error)throw linked.error;
  const extras=new Map((linked.data||[]).map(j=>[j.id,{amount:Math.max(0,Number(String(j.day_extra_eur||0).replace(',','.'))||0),concept:String(j.day_flag||'Plus automático')}]));
  const financialReviews=reviewRows.map(r=>{const entry=extras.get(r.jornada_id);const extra=entry?.amount||0;const original=Number(r.original_amount)||0;const base=Number((linked.data||[]).find(j=>j.id===r.jornada_id)?.diet_base_eur)||0;return {...r,automatic_plus:extra>0&&original+0.01>=base+extra?extra:0,automatic_plus_concept:entry?.concept||null};});
  return enterpriseJson({company,member,drivers:drivers.data||[],trafficMembers:trafficMembers.data||[],assignments:assignments.data||[],reviews:financialReviews,closures:closures.data||[],dietAdjustments:adjustments.data||[]});
 }
 if(role==='traffic'){
  const [members,allocation]=await Promise.all([
   db.from('tp_company_members').select('user_id,username,employee_name,joined_at,history_shared_from').eq('company_id',companyId).eq('active',true).eq('role','driver'),
   db.from('tp_traffic_driver_assignments').select('driver_id').eq('company_id',companyId).eq('traffic_user_id',user.id)
  ]);
  if(members.error||allocation.error)throw members.error||allocation.error;
  const assigned=new Set((allocation.data||[]).map(x=>x.driver_id));
  const myDrivers=(members.data||[]).filter(x=>assigned.has(x.user_id));
  const ids=myDrivers.map(x=>x.user_id);
  // Joining an employer never shares a conductor's prior personal history.
  const joinedAt=new Map(myDrivers.map(m=>[m.user_id,m.history_shared_from?Math.min(new Date(m.joined_at).getTime(),new Date(m.history_shared_from).getTime()):new Date(m.joined_at).getTime()]));
  const [jornadas,reviews,plusSettings,activityRows,trips,naturalDiets,adjustments]=await Promise.all([
   ids.length?db.from('jornadas').select('id,user_id,created_at,fecha_inicio,fecha_fin,hora_inicio,hora_fin,lugar_inicio,lugar_fin,tipo_ruta,dieta_manual_tipo,dieta_percent,plus_items,day_flag,conduccion_min,tacho_driving_min,tacho_work_min,tacho_available_min,tacho_rest_min,start_at,end_at,planned_rest_min,planned_rest_type,legal_summary,descanso_anterior_min,tipo_descanso_anterior,previous_rest_start_at,previous_rest_end_at,previous_rest_legal_type,previous_rest_valid,split_rest_detected,split_rest_first_part_min,split_rest_second_part_min,counts_as_reduced_rest,is_double_driving').in('user_id',ids).order('created_at',{ascending:false}).limit(1500):Promise.resolve({data:[],error:null}),
   db.from('tp_diet_reviews').select('id,jornada_id,jornada_date,driver_id,status,original_diet_type,proposed_diet_type,traffic_observation,change_reason,driver_observation,created_at').eq('company_id',companyId).in('driver_id',ids.length?ids:['00000000-0000-0000-0000-000000000000']).order('created_at',{ascending:false}).limit(1000),
   ids.length?db.from('tp_driver_settings').select('driver_id,plus_rates').eq('company_id',companyId).in('driver_id',ids):Promise.resolve({data:[],error:null}),
   ids.length?db.from('tacho_activities').select('user_id,shift_id,source,tipo,inicio,fin,updated_at').in('user_id',ids).order('inicio',{ascending:false}).limit(750):Promise.resolve({data:[],error:null}),
   ids.length?db.from('viajes').select('id,user_id,cliente,modo_viaje,fin_lugar,fin_hora,estado,paradas,notas,created_at,updated_at').in('user_id',ids).order('created_at',{ascending:false}).limit(500):Promise.resolve({data:[],error:null}),
   ids.length?db.from('user_natural_day_diets').select('id,user_id,date,type,percentage,source,confirmed_by_user,created_at,dismissed_at').in('user_id',ids).order('date',{ascending:false}).limit(2000):Promise.resolve({data:[],error:null}),
   db.from('tp_diet_adjustments').select('id,driver_id,diet_date,target_kind,target_id,operation,original_diet_type,proposed_diet_type,proposed_percentage,reason,status,driver_observation,created_at').eq('company_id',companyId).in('driver_id',ids.length?ids:['00000000-0000-0000-0000-000000000000']).order('created_at',{ascending:false}).limit(1200)
  ]);
  if(jornadas.error||reviews.error||plusSettings.error||activityRows.error||trips.error||naturalDiets.error||adjustments.error)throw jornadas.error||reviews.error||plusSettings.error||activityRows.error||trips.error||naturalDiets.error||adjustments.error;
  // Calculate from the same history already authorized for this traffic user.
  // Do not use undisclosed pre-employment jornadas, or send old personal history.
  const visibleJornadas=(jornadas.data||[]).filter(j=>{
   const joined=joinedAt.get(j.user_id);
   return joined!==undefined&&new Date(j.created_at).getTime()>=joined;
  });
  // Diets are read from actual jornada and natural-day records, NOT only reviews.
  // This is intentionally independent of tp_diet_reviews, which has no row until traffic acts.
  const dietEntries=[
   ...visibleJornadas.map(j=>({
    id:j.id,source:'jornada',driver_id:j.user_id,date:String(j.fecha_inicio||'').slice(0,10),
    type:j.dieta_manual_tipo||j.tipo_ruta||null,percentage:j.dieta_percent||null,
    pluses:Array.isArray((j as any).plus_items)?(j as any).plus_items.map((p:any)=>String(p.concepto||'')).filter(Boolean):[],
    day_flag:(j as any).day_flag||null,
   })),
   ...(naturalDiets.data||[]).filter(d=>!d.dismissed_at && (joinedAt.get(d.user_id)!==undefined && new Date(d.created_at).getTime()>=joinedAt.get(d.user_id)!)).map(d=>({
    id:d.id,source:'natural_day',driver_id:d.user_id,date:d.date,type:d.type,percentage:d.percentage,
    pluses:[],day_flag:null,
   })),
  ].filter(d=>Boolean(d.date));
  // Manual activity controls are stored as ongoing segments (fin=NULL while active).
  // Count each segment once for its jornada; never substitute a default zero from tacho summaries.
  const segmentsByShift = new Map<string,{ driving:number; available:number; rest:number; work:number }>();
  const allowedShifts = new Set(visibleJornadas.map(j=>j.id));
  for (const activity of activityRows.data || []) {
    if (activity.source !== 'manual' || !activity.shift_id || !allowedShifts.has(activity.shift_id)) continue;
    const start = new Date(activity.inicio).getTime();
    const end = activity.fin ? new Date(activity.fin).getTime() : Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
    const minutes = Math.max(0, (end - start) / 60000);
    const totals = segmentsByShift.get(activity.shift_id) || {driving:0,available:0,rest:0,work:0};
    const kind = String(activity.tipo || '').toUpperCase();
    if (kind === 'CONDUCCION') totals.driving += minutes;
    else if (kind === 'DISPONIBILIDAD') totals.available += minutes;
    else if (kind === 'DESCANSO') totals.rest += minutes;
    else if (kind === 'OTROS_TRABAJOS') totals.work += minutes;
    segmentsByShift.set(activity.shift_id, totals);
  }
  const journeysWithActivities = visibleJornadas.map(j=>{
    const totals = segmentsByShift.get(j.id);
    return totals ? {
      ...j,
      activity_driving_min: Math.floor(totals.driving),
      activity_available_min: Math.floor(totals.available),
      activity_rest_min: Math.floor(totals.rest),
      activity_work_min: Math.floor(totals.work),
    } : j;
  });
  const dutyLimits=Object.fromEntries(ids.map(id=>[id,calculateTrafficDutyLimit(
   visibleJornadas.filter(j=>j.user_id===id) as TrafficDutyJornada[]
  )]));
  return enterpriseJson({company,member,dutyLimits,drivers:myDrivers,trips:(trips.data||[]).filter(t=>{const joined=joinedAt.get(t.user_id);return joined!==undefined&&new Date(t.created_at).getTime()>=joined;}),activities:(activityRows.data||[]).filter(a=>{const joined=joinedAt.get(a.user_id);return joined!==undefined&&new Date(a.inicio).getTime()>=joined;}),plusOptions:Object.fromEntries((plusSettings.data||[]).map(s=>[s.driver_id,Object.keys(s.plus_rates||{})])),jornadas:journeysWithActivities,reviews:reviews.data||[],dietEntries,dietAdjustments:adjustments.data||[]});
 }
 if(role==='driver'){
  const [settings,sharing,reviews,adjustments]=await Promise.all([
   db.from('tp_driver_settings').select('base_name,workplace,agreement,diet_rates,plus_rates,payroll_terms,effective_from').eq('company_id',companyId).eq('driver_id',user.id).maybeSingle(),
   db.from('tp_company_members').select('history_shared_from,joined_at').eq('company_id',companyId).eq('user_id',user.id).eq('role','driver').single(),
   db.from('tp_diet_reviews').select('id,status,original_diet_type,original_amount,original_pluses,proposed_diet_type,proposed_amount,proposed_pluses,change_reason,traffic_observation,driver_observation,created_at')
    .eq('company_id',companyId).eq('driver_id',user.id).order('created_at',{ascending:false}).limit(250),
   db.from('tp_diet_adjustments').select('id,diet_date,operation,original_diet_type,original_percentage,proposed_diet_type,proposed_percentage,reason,status,driver_observation,created_at').eq('company_id',companyId).eq('driver_id',user.id).order('created_at',{ascending:false}).limit(250)
  ]);
  if(settings.error||reviews.error||sharing.error||adjustments.error)throw settings.error||reviews.error||sharing.error||adjustments.error;
  return enterpriseJson({company,member,driverSettings:settings.data,historySharing:{enabled:sharing.data?.history_shared_from!=null,joinedAt:sharing.data?.joined_at||null},reviews:reviews.data||[],dietAdjustments:adjustments.data||[]});
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
