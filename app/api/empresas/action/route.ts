import {NextRequest} from 'next/server';
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
 if(/^\\d{4}-\\d{2}-\\d{2}/.test(v))iso=v.slice(0,10);
 else if(/^\\d{2}\/\\d{2}\/\\d{4}$/.test(v)){
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
  const company=await db.from('tp_companies').insert({name,owner_user_id:user.id,plan_price_id:plan.priceId}).select('id').single();
  if(company.error)throw company.error;
  const created=await db.from('tp_company_members').insert({company_id:company.data.id,user_id:user.id,username,role:'owner'});
  if(created.error){await db.from('tp_companies').delete().eq('id',company.data.id).eq('owner_user_id',user.id);return json({error:'El usuario ya existe o está vinculado a otra empresa'},409);}
  await audit(db,company.data.id,user.id,'company.created','company',company.data.id,null,{name,plan:plan.title});
  return json({ok:true,companyId:company.data.id,subscription:'pending'},201);
 }
 if(action==='accept_invite'){
  if(member)return json({error:'Ya estás vinculado a una empresa'},409);
  const token=plain(body.token,128);
  if(!/^[0-9a-f]{64}$/.test(token))return json({error:'Invitación inválida'},400);
  const hash=createHash('sha256').update(token).digest('hex');
  const i=await db.from('tp_company_invites').select('*').eq('token_hash',hash).maybeSingle();
  if(i.error)throw i.error;
  const invite=i.data;
  if(!invite||invite.accepted_at||invite.revoked_at||new Date(invite.expires_at).getTime()<Date.now())return json({error:'Invitación caducada o no disponible'},410);
  if(cleanEmail(user.email)!==cleanEmail(invite.email))return json({error:'Inicia sesión con el correo invitado'},403);
  const {error:memberError}=await db.from('tp_company_members').insert({company_id:invite.company_id,user_id:user.id,username:invite.username,role:invite.role});
  if(memberError)return json({error:'El usuario ya existe o pertenece a otra empresa'},409);
  await db.from('tp_company_invites').update({accepted_at:new Date().toISOString()}).eq('id',invite.id).is('accepted_at',null);
  if(invite.role==='driver'){
   const insert=await db.from('tp_driver_settings').insert({company_id:invite.company_id,driver_id:user.id,updated_by:invite.invited_by});
   if(insert.error)console.error('tp config pending',insert.error.message);
  }
  await audit(db,invite.company_id,user.id,'member.accepted','member',user.id,null,{role:invite.role,username:invite.username});
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
    company_id:companyId,username,email,role:inviteRole,token_hash:createHash('sha256').update(token).digest('hex'),
    invited_by:user.id,expires_at:new Date(Date.now()+7*DAY).toISOString()
  }).select('id').single();
  if(insert.error)throw insert.error;
  await audit(db,companyId,user.id,'member.invited','invite',insert.data.id,null,{username,email,role:inviteRole});
  return json({ok:true,url:req.nextUrl.origin+'/empresas?invite='+token},201);
 }
 if(action==='update_settings'){
  if(!permitted(role,'owner'))return json({error:'Sin permiso para configurar'},403);
  if(!uuid(body.driverId))return json({error:'Conductor inválido'},400);
  const {data:driver}=await db.from('tp_company_members').select('id').eq('company_id',companyId).eq('user_id',body.driverId).eq('role','driver').eq('active',true).maybeSingle();
  if(!driver)return json({error:'El conductor no pertenece a la empresa'},404);
  const settings=validSettings(body.settings);
  if(!settings)return json({error:'Configuración inválida'},400);
  const prev=await db.from('tp_driver_settings').select('*').eq('company_id',companyId).eq('driver_id',body.driverId).maybeSingle();
  const save=await db.from('tp_driver_settings').upsert({company_id:companyId,driver_id:body.driverId,...settings,updated_by:user.id,updated_at:new Date().toISOString()});
  if(save.error)throw save.error;
  await audit(db,companyId,user.id,'driver.settings.updated','driver',body.driverId,prev.data,settings,plain(body.reason,500));
  return json({ok:true});
 }
 if(action==='review'){
  if(!permitted(role,'traffic'))return json({error:'Solo Tráfico revisa dietas'},403);
  if(typeof body.jornadaId!=='string'||body.jornadaId.length<1||body.jornadaId.length>160||!uuid(body.driverId)||!['confirm','propose'].includes(body.mode))return json({error:'Datos inválidos'},400);
  const {data:driver}=await db.from('tp_company_members').select('id').eq('company_id',companyId).eq('user_id',body.driverId).eq('role','driver').eq('active',true).maybeSingle();
  if(!driver)return json({error:'Conductor no autorizado'},403);
  const journey=await db.from('jornadas').select('id,user_id,fecha_inicio,dieta_manual_tipo,dieta_importe_eur,plus_items').eq('id',body.jornadaId).eq('user_id',body.driverId).maybeSingle();
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
