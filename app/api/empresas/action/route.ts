import {NextRequest} from 'next/server';
import {normalizeEmployeeConfig,syncEmployeeConfig} from '@/lib/tp-employee-config';
import {createHash,randomBytes} from 'node:crypto';
import {membership,identity,enterpriseJson,originAllowed,permitted,cleanEmail,validEmail,cleanUsername,validUsername,uuid,PLAN_PRICES,audit,isPaidAccess} from '@/lib/tp-enterprise';
export const dynamic='force-dynamic';
const DAY=86_400_000;
const json=enterpriseJson;
const amount=(v:unknown):number|null=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100000?Math.round(v*100)/100:null;
const plain=(value:unknown,max=250)=>typeof value==='string'?value.trim().slice(0,max):'';
const normalizeJornadaDate=(value:unknown):string|null=>{
 if(typeof value!=='string')return null;
 const v=value.trim();
 let iso:string;
 if(/^\d{4}-\d{2}-\d{2}/.test(v))iso=v.slice(0,10);
 else if(/^\d{2}\/\d{2}\/\d{4}$/.test(v)){
  const [d,m,y]=v.split('/');iso=y+'-'+m+'-'+d;
 }else return null;
 const parsed=new Date(iso+'T12:00:00Z');
 return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===iso?iso:null;
};

function validSettings(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const raw=value as Record<string,unknown>;
 const base_name=plain(raw.base_name,120),workplace=plain(raw.workplace,120),agreement=plain(raw.agreement,120);
 const object=(value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)&&JSON.stringify(value).length<8000?value:{};
 return {base_name,workplace,agreement,diet_rates:object(raw.diet_rates),plus_rates:object(raw.plus_rates),payroll_terms:object(raw.payroll_terms)};
}
export async function POST(req:NextRequest){
 if(!originAllowed(req))return json({error:'Origen no permitido'},403);
 const auth=await membership(req);
 if(!auth)return json({error:'Inicia sesión primero'},401);
 let body:Record<string,any>;
 try{body=await req.json();if(!body||typeof body!=='object')throw Error('body');}
 catch{return json({error:'Solicitud no válida'},400);}
 const {db,user,member}=auth,action=body.action;
 try{
 if(action==='create_company'){
  if(member)return json({error:'Ya perteneces a una empresa'},409);
  const name=plain(body.name,120),username=cleanUsername(body.username);
  if(name.length<2||!validUsername(username))return json({error:'Nombre de empresa o usuario inválido'},400);
  const plan=PLAN_PRICES.find(p=>p.priceId===body.priceId);
  if(!plan)return json({error:'Elige una tarifa disponible'},400);
  // Launch trial without card capture or automatic charges. Once it expires,
  // access is suspended until an explicitly purchased Stripe plan is active.
  const trialEndsAt=new Date(Date.now()+7*DAY).toISOString();
  const company=await db.from('tp_companies').insert({
   name,owner_user_id:user.id,plan_price_id:plan.priceId,
   subscription_status:'trialing',trial_ends_at:trialEndsAt
  }).select('id').single();
  if(company.error)throw company.error;
  const created=await db.from('tp_company_members').insert({company_id:company.data.id,user_id:user.id,username,role:'owner'});
  if(created.error){await db.from('tp_companies').delete().eq('id',company.data.id).eq('owner_user_id',user.id);return json({error:'El usuario ya existe o está vinculado a otra empresa'},409);}
  await audit(db,company.data.id,user.id,'company.created','company',company.data.id,null,{name,plan:plan.title});
  return json({ok:true,companyId:company.data.id,subscription:'trialing',trialEndsAt},201);
 }
 if(action==='accept_invite'){
  const token=plain(body.token,128);
  if(!/^[0-9a-f]{64}$/.test(token))return json({error:'Invitación inválida'},400);
  const hash=createHash('sha256').update(token).digest('hex');
  const lookup=await db.from('tp_company_invites').select('*').eq('token_hash',hash).maybeSingle();
  if(lookup.error)throw lookup.error;
  const invite=lookup.data;
  if(!invite||invite.revoked_at||new Date(invite.expires_at).getTime()<Date.now())
   return json({error:'Invitación caducada o revocada. Solicita una nueva'},410);
  if(cleanEmail(user.email)!==cleanEmail(invite.email))return json({error:'Inicia sesión con el correo electrónico al que se envió la invitación'},403);
  if(!user.email_confirmed_at)return json({error:'Confirma tu dirección de correo electrónico antes de aceptar la invitación'},403);
  if(member&&member.company_id!==invite.company_id)return json({error:'Ya perteneces a otra empresa'},409);
  if(member&&member.role!==invite.role)return json({error:'Ya tienes un perfil distinto en esta empresa'},409);
  if(invite.accepted_at&&member)return json({ok:true,role:member.role,alreadyAccepted:true});
  if(invite.accepted_at)return json({error:'Invitación ya utilizada'},409);
  const name=plain(invite.employee_name||invite.username,120);
  if(!name)return json({error:'El nombre del empleado no está configurado'},400);
  let cfg:ReturnType<typeof normalizeEmployeeConfig>|null=null;
  if(invite.role==='driver'){
   try{cfg=normalizeEmployeeConfig(invite.initial_settings);}catch(e){
    return json({error:e instanceof Error?e.message:'La empresa debe configurar el conductor antes de activar su cuenta'},409);
   }
  }
  if(!member){
   const inserted=await db.from('tp_company_members').insert({company_id:invite.company_id,user_id:user.id,username:invite.username,employee_name:name,role:invite.role,active:false});
   if(inserted.error){
    const existing=await db.from('tp_company_members').select('company_id,role').eq('user_id',user.id).maybeSingle();
    if(existing.data?.company_id!==invite.company_id||existing.data?.role!==invite.role)return json({error:'Esta cuenta ya pertenece a otra empresa o el nombre de usuario está ocupado'},409);
   }
  }
  if(cfg){
   const stored=await db.from('tp_driver_settings').upsert({
    company_id:invite.company_id,driver_id:user.id,base_name:cfg.base_name,workplace:cfg.base_city,
    agreement:cfg.agreement||null,
    diet_rates:cfg.diet_rates,plus_rates:cfg.plus_rates,
    payroll_terms:{...cfg.payroll_terms,payment_mode:cfg.payment_mode,diet_scheme:cfg.diet_scheme},
    initial_config:cfg,updated_by:invite.invited_by,updated_at:new Date().toISOString()
   },{onConflict:'company_id,driver_id'});
   if(stored.error)throw stored.error;
   // Ensure standard mobile Tacoplan reads the exact company configuration.
   await syncEmployeeConfig(db,user.id,name,cfg);
  }else{
   // Keep the employee display name in Supabase for HR and Traffic too.
   const profile=await db.from('profiles').upsert({id:user.id,display_name:name,updated_at:new Date().toISOString()},{onConflict:'id'});
   if(profile.error)throw profile.error;
  }
  // Activate membership only after the company configuration reaches native
  // driver tables, so Traffic cannot see a half-configured employee.
  const activated=await db.from('tp_company_members').update({employee_name:name,active:true}).eq('company_id',invite.company_id).eq('user_id',user.id);
  if(activated.error)throw activated.error;
  const updated=await db.from('tp_company_invites').update({accepted_at:new Date().toISOString()}).eq('id',invite.id).is('accepted_at',null);
  if(updated.error)throw updated.error;
  await audit(db,invite.company_id,user.id,'member.accepted','member',user.id,null,{role:invite.role,username:invite.username,employee_name:name});
  return json({ok:true,role:invite.role});
 }
 if(!member)return json({error:'No tienes empresa asignada'},403);
 const companyId=member.company_id,role=member.role;
 if(['review','respond'].includes(action)){
  const state=await db.from('tp_companies').select('subscription_status,trial_ends_at').eq('id',companyId).single();
  if(state.error||!isPaidAccess(state.data))return json({error:'La prueba gratuita o la suscripción de la empresa no está activa'},402);
 }

 if(action==='invite'){
  if(!permitted(role,'owner'))return json({error:'Solo el administrador crea usuarios'},403);
  const username=cleanUsername(body.username),email=cleanEmail(body.email),inviteRole=body.role;
  const employeeName=plain(body.employeeName,120);
  if(employeeName.length<2)return json({error:'Indica el nombre y apellidos del empleado'},400);
  let initialSettings:ReturnType<typeof normalizeEmployeeConfig>|null=null;
  if(inviteRole==='driver'){
   try{initialSettings=normalizeEmployeeConfig(body.initialSettings);}
   catch(e){return json({error:e instanceof Error?e.message:'Completa la configuración inicial del conductor'},400);}
  }
  if(!validUsername(username)||!validEmail(email)||!['traffic','hr','driver'].includes(inviteRole))return json({error:'Usuario, correo o rol incorrectos'},400);
  const {data:company,error:ce}=await db.from('tp_companies').select('plan_price_id').eq('id',companyId).single();
  if(ce)throw ce;
  const max=PLAN_PRICES.find(p=>p.priceId===company.plan_price_id)?.seats||0;
  if(inviteRole==='driver'){
   const [existing,pending]=await Promise.all([
    db.from('tp_company_members').select('id',{count:'exact',head:true}).eq('company_id',companyId).eq('role','driver').eq('active',true),
    db.from('tp_company_invites').select('id',{count:'exact',head:true}).eq('company_id',companyId).eq('role','driver').is('accepted_at',null).is('revoked_at',null).gt('expires_at',new Date().toISOString())
   ]);
   if(existing.error||pending.error)throw existing.error||pending.error;
   if((existing.count||0)+(pending.count||0)>=max)return json({error:'Has alcanzado el máximo de conductores del plan'},409);
  }
  const existing=await db.from('tp_company_members').select('id').eq('username',username).maybeSingle();
  const pending=await db.from('tp_company_invites').select('id').eq('username',username).is('accepted_at',null).is('revoked_at',null).gt('expires_at',new Date().toISOString()).limit(1);
  if(existing.data||(pending.data||[]).length)return json({error:'Nombre de usuario ya reservado'},409);
  const token=randomBytes(32).toString('hex');
  const insert=await db.from('tp_company_invites').insert({
    company_id:companyId,username,email,employee_name:employeeName,initial_settings:initialSettings||{},role:inviteRole,token_hash:createHash('sha256').update(token).digest('hex'),
    invited_by:user.id,expires_at:new Date(Date.now()+7*DAY).toISOString()
  }).select('id').single();
  if(insert.error)throw insert.error;
  await audit(db,companyId,user.id,'member.invited','invite',insert.data.id,null,{username,email,employee_name:employeeName,role:inviteRole,has_initial_config:Boolean(initialSettings)});
  return json({ok:true,url:'https://tacoplan.es/empresas?invite='+token},201);
 }
 if(action==='renew_invite'){
  if(!permitted(role,'owner'))return json({error:'Solo el administrador puede renovar invitaciones'},403);
  if(!uuid(body.inviteId))return json({error:'Invitación inválida'},400);
  const found=await db.from('tp_company_invites').select('*').eq('company_id',companyId).eq('id',body.inviteId).is('accepted_at',null).is('revoked_at',null).maybeSingle();
  if(found.error)throw found.error;
  if(!found.data)return json({error:'La invitación ya no está pendiente'},404);
  if(!found.data.employee_name||found.data.employee_name.trim().length<2)return json({error:'Primero guarda el nombre del empleado'},400);
  if(found.data.role==='driver'){
   try{normalizeEmployeeConfig(found.data.initial_settings);}
   catch{return json({error:'Primero guarda toda la configuración inicial del conductor'},400);}
  }
  const fresh=randomBytes(32).toString('hex');
  const updated=await db.from('tp_company_invites').update({
   token_hash:createHash('sha256').update(fresh).digest('hex'),
   expires_at:new Date(Date.now()+7*DAY).toISOString(),
  }).eq('company_id',companyId).eq('id',body.inviteId).is('accepted_at',null);
  if(updated.error)throw updated.error;
  await audit(db,companyId,user.id,'invite.renewed','invite',body.inviteId,null,{employee_name:found.data.employee_name,role:found.data.role});
  return json({ok:true,url:'https://tacoplan.es/empresas?invite='+fresh});
 }
 if(action==='update_pending_invite'){
  if(!permitted(role,'owner'))return json({error:'Solo el administrador puede actualizar invitaciones'},403);
  if(!uuid(body.inviteId))return json({error:'Invitación inválida'},400);
  const old=await db.from('tp_company_invites').select('*').eq('id',body.inviteId).eq('company_id',companyId).is('accepted_at',null).is('revoked_at',null).maybeSingle();
  if(old.error)throw old.error;
  if(!old.data)return json({error:'Invitación ya aceptada o no disponible'},404);
  const name=plain(body.employeeName,120);
  if(name.length<2)return json({error:'Introduce el nombre y apellidos del empleado'},400);
  let cfg=null;
  if(old.data.role==='driver'){
   try{cfg=normalizeEmployeeConfig(body.initialSettings);}catch(e){return json({error:e instanceof Error?e.message:'Completa la configuración inicial'},400);}
  }
  const changed=await db.from('tp_company_invites').update({employee_name:name,initial_settings:cfg||{}}).eq('id',old.data.id).eq('company_id',companyId);
  if(changed.error)throw changed.error;
  await audit(db,companyId,user.id,'invite.updated','invite',old.data.id,
   {employee_name:old.data.employee_name,initial_settings:old.data.initial_settings},
   {employee_name:name,initial_settings:cfg});
  return json({ok:true});
 }
 if(action==='update_settings'){
  if(!permitted(role,'owner'))return json({error:'Sin permiso para configurar'},403);
  if(!uuid(body.driverId))return json({error:'Conductor inválido'},400);
  const driver=await db.from('tp_company_members').select('id,employee_name,username').eq('company_id',companyId).eq('user_id',body.driverId).eq('role','driver').eq('active',true).maybeSingle();
  if(driver.error)throw driver.error;
  if(!driver.data)return json({error:'El conductor no pertenece a la empresa'},404);
  let cfg:ReturnType<typeof normalizeEmployeeConfig>;
  try{cfg=normalizeEmployeeConfig(body.initialSettings);}catch(e){return json({error:e instanceof Error?e.message:'Configuración inválida'},400);}
  const prev=await db.from('tp_driver_settings').select('*').eq('company_id',companyId).eq('driver_id',body.driverId).maybeSingle();
  if(prev.error)throw prev.error;
  const save=await db.from('tp_driver_settings').upsert({
   company_id:companyId,driver_id:body.driverId,base_name:cfg.base_name,workplace:cfg.base_city,
   agreement:cfg.agreement||prev.data?.agreement||null,
   diet_rates:cfg.diet_rates,plus_rates:cfg.plus_rates,
   payroll_terms:{...cfg.payroll_terms,payment_mode:cfg.payment_mode,diet_scheme:cfg.diet_scheme},
   initial_config:cfg,updated_by:user.id,updated_at:new Date().toISOString()
  },{onConflict:'company_id,driver_id'});
  if(save.error)throw save.error;
  await syncEmployeeConfig(db,body.driverId,driver.data.employee_name||driver.data.username,cfg);
  await audit(db,companyId,user.id,'driver.settings.updated','driver',body.driverId,prev.data,cfg,plain(body.reason,500));
  return json({ok:true});
 }
 if(action==='assign_driver'){
  if(!permitted(role,'hr'))return json({error:'Solo Recursos Humanos puede asignar conductores a Tráfico'},403);
  const driverId=body.driverId,trafficId=body.trafficUserId;
  if(!uuid(driverId)||(trafficId!==null&&!uuid(trafficId)))return json({error:'Selecciona un conductor y un usuario de Tráfico válido'},400);
  const driver=await db.from('tp_company_members').select('user_id').eq('company_id',companyId).eq('user_id',driverId).eq('role','driver').eq('active',true).maybeSingle();
  if(driver.error)throw driver.error;
  if(!driver.data)return json({error:'El conductor no pertenece a la empresa'},403);
  if(trafficId!==null){
   const traffic=await db.from('tp_company_members').select('user_id').eq('company_id',companyId).eq('user_id',trafficId).eq('role','traffic').eq('active',true).maybeSingle();
   if(traffic.error)throw traffic.error;
   if(!traffic.data)return json({error:'El empleado seleccionado no pertenece al departamento de Tráfico'},403);
  }
  const previous=await db.from('tp_traffic_driver_assignments').select('traffic_user_id').eq('company_id',companyId).eq('driver_id',driverId).maybeSingle();
  if(previous.error)throw previous.error;
  if(trafficId===null){
   const removed=await db.from('tp_traffic_driver_assignments').delete().eq('company_id',companyId).eq('driver_id',driverId);
   if(removed.error)throw removed.error;
  }else{
   const saved=await db.from('tp_traffic_driver_assignments').upsert({
    company_id:companyId,driver_id:driverId,traffic_user_id:trafficId,assigned_by:user.id,assigned_at:new Date().toISOString()
   },{onConflict:'company_id,driver_id'});
   if(saved.error)throw saved.error;
  }
  await audit(db,companyId,user.id,'traffic.driver_assignment_changed','assignment',driverId,previous.data,{traffic_user_id:trafficId});
  return json({ok:true});
 }
 if(action==='review'){
  if(!permitted(role,'traffic'))return json({error:'Solo Tráfico revisa dietas'},403);
  if(typeof body.jornadaId!=='string'||body.jornadaId.length<1||body.jornadaId.length>160||!uuid(body.driverId)||!['confirm','propose'].includes(body.mode))return json({error:'Datos inválidos'},400);
  const {data:driver}=await db.from('tp_company_members').select('id,joined_at').eq('company_id',companyId).eq('user_id',body.driverId).eq('role','driver').eq('active',true).maybeSingle();
  if(!driver)return json({error:'Conductor no autorizado'},403);
  const assigned=await db.from('tp_traffic_driver_assignments').select('driver_id').eq('company_id',companyId).eq('driver_id',body.driverId).eq('traffic_user_id',user.id).maybeSingle();
  if(assigned.error)throw assigned.error;
  if(!assigned.data)return json({error:'El conductor no está asignado a tu usuario de Tráfico'},403);
  const journey=await db.from('jornadas').select('id,user_id,created_at,fecha_inicio,dieta_manual_tipo,dieta_importe_eur,plus_items').eq('id',body.jornadaId).eq('user_id',body.driverId).gte('created_at',driver.joined_at).maybeSingle();
  if(journey.error||!journey.data)return json({error:'Jornada no encontrada'},404);
  const existing=await db.from('tp_diet_reviews').select('*').eq('company_id',companyId).eq('jornada_id',body.jornadaId).maybeSingle();
  if(existing.error)throw existing.error;
  if(existing.data&&['confirmed','awaiting_driver','accepted','disputed','closed'].includes(existing.data.status))return json({error:'Ya existe una revisión. No se puede sobrescribir el historial'},409);
  const originalAmount=Number(String(journey.data.dieta_importe_eur||'0').replace(',','.'))||0;
  const mode=body.mode,reason=plain(body.reason,2000),observation=plain(body.observation,2000);
  if(mode==='propose'&&reason.length<10)return json({error:'Explica el motivo del cambio (mínimo 10 caracteres)'},400);
  const originalPluses=Array.isArray(journey.data.plus_items)?journey.data.plus_items:[];
  const proposedPluses=mode==='propose'?body.pluses:null;
  if(mode==='propose'&&(!Array.isArray(proposedPluses)||proposedPluses.length>50))return json({error:'La lista de pluses no es válida'},400);
  if(mode==='propose'&&proposedPluses.some((item:unknown)=>{
   if(!item||typeof item!=='object'||Array.isArray(item))return true;
   const p=item as Record<string,unknown>;
   return typeof p.concepto!=='string'||p.concepto.trim().length===0||p.concepto.length>120||amount(p.importe)===null;
  }))return json({error:'Revisa los conceptos e importes de los pluses'},400);
  const proposed=mode==='propose'?amount(body.amount):null;
  if(mode==='propose'&&proposed===null)return json({error:'Importe de dieta incorrecto'},400);
  const payload={company_id:companyId,driver_id:body.driverId,jornada_id:body.jornadaId,
   original_diet_type:journey.data.dieta_manual_tipo,jornada_date:normalizeJornadaDate(journey.data.fecha_inicio),original_amount:Math.max(0,originalAmount),
   original_pluses:originalPluses,
   proposed_diet_type:mode==='propose'?plain(body.dietType,80)||journey.data.dieta_manual_tipo:null,
   proposed_amount:proposed,proposed_pluses:mode==='propose'?proposedPluses:null,status:mode==='confirm'?'confirmed':'awaiting_driver',
   traffic_observation:observation||null,change_reason:mode==='propose'?reason:null,
   confirmed_at:mode==='confirm'?new Date().toISOString():null,
   confirmed_by:mode==='confirm'?user.id:null,updated_at:new Date().toISOString()};
  const result=await db.from('tp_diet_reviews').upsert(payload,{onConflict:'company_id,jornada_id'}).select('id').single();
  if(result.error)throw result.error;
  await audit(db,companyId,user.id,mode==='confirm'?'diet.confirmed':'diet.change_proposed','review',result.data.id,existing.data,payload,reason||observation);
  await db.from('user_notifications').insert({user_id:body.driverId,type:'admin_message',title:mode==='confirm'?'Dieta confirmada por Tráfico':'Revisión de dieta pendiente de respuesta',body:mode==='confirm'?'Tráfico ha validado tu dieta sin cambios.':('Tráfico ha propuesto un cambio. Motivo: '+reason),data:{kind:'enterprise_diet_review',company_id:companyId,review_id:result.data.id,action:mode}});
  return json({ok:true,status:payload.status});
 }
 if(action==='respond'){
  if(!permitted(role,'driver'))return json({error:'Solo el conductor puede responder'},403);
  if(!uuid(body.reviewId)||!['accept','dispute'].includes(body.response))return json({error:'Respuesta inválida'},400);
  const reason=plain(body.observation,2000);
  if(body.response==='dispute'&&reason.length<5)return json({error:'Explica el motivo de tu discrepancia'},400);
  const old=await db.from('tp_diet_reviews').select('*').eq('id',body.reviewId).eq('company_id',companyId).eq('driver_id',user.id).eq('status','awaiting_driver').maybeSingle();
  if(old.error||!old.data)return json({error:'Esta propuesta ya no está pendiente'},409);
  const status=body.response==='accept'?'accepted':'disputed';
  const upd=await db.from('tp_diet_reviews').update({status,driver_observation:reason,driver_decision_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',body.reviewId).eq('company_id',companyId).eq('status','awaiting_driver').select('id').maybeSingle();
  if(upd.error||!upd.data)return json({error:'La propuesta ya ha sido revisada'},409);
  await audit(db,companyId,user.id,'diet.'+status,'review',body.reviewId,{status:'awaiting_driver'},{status,driver_observation:reason},reason);
  // Notification for Tráfico is surfaced in the company dashboard review list.

  return json({ok:true,status});
 }
 return json({error:'Operación no permitida'},403);
 }catch(error){console.error('tp enterprise action',error);return json({error:'No se pudo completar la operación'},500);}
}
