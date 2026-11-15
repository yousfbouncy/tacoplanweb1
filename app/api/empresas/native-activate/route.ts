import {NextRequest} from 'next/server';
import {identity,enterpriseJson,cleanEmail,audit} from '@/lib/tp-enterprise';
import {sameOrigin} from '@/lib/admin-users';
import {normalizeEmployeeConfig,syncEmployeeConfig} from '@/lib/tp-employee-config';
export const dynamic='force-dynamic';
// A native employee can confirm the company invitation by signing in with
// their verified, invited email. Never trust a client-supplied company or uid.
export async function POST(req:NextRequest){
 if(req.headers.get('origin')&&!sameOrigin(req))return enterpriseJson({error:'Origen no permitido'},403);
 const auth=await identity(req);
 if(!auth)return enterpriseJson({error:'Inicia sesión en Tacoplan'},401);
 const {db,user}=auth;
 if(!user.email||!user.email_confirmed_at)return enterpriseJson({error:'Confirma tu correo primero'},403);
 try{
  const current=await db.from('tp_company_members').select('company_id,role,active').eq('user_id',user.id).maybeSingle();
  if(current.error)throw current.error;
  if(current.data?.active){
   if(current.data.role!=='driver')return enterpriseJson({managed:false});
   const c=await db.from('tp_driver_settings').select('driver_id').eq('company_id',current.data.company_id).eq('driver_id',user.id).maybeSingle();
   if(c.error)throw c.error;
   return enterpriseJson({managed:Boolean(c.data),linked:true});
  }
  if(current.data&&current.data.role!=='driver')return enterpriseJson({managed:false});
  // Match only the exact verified email in Auth. Never infer employer from app settings.
  const candidates=await db.from('tp_company_invites').select('id,company_id,email,username,employee_name,initial_settings,invited_by,expires_at,accepted_at,revoked_at')
   .eq('role','driver').ilike('email',cleanEmail(user.email)).is('accepted_at',null).is('revoked_at',null)
   .gt('expires_at',new Date().toISOString()).limit(3);
  if(candidates.error)throw candidates.error;
  const matches=(candidates.data||[]).filter(x=>cleanEmail(user.email)===cleanEmail((x as any).email??user.email));
  if(matches.length===0)return enterpriseJson({managed:false,pending:false});
  if(matches.length!==1)return enterpriseJson({error:'Tienes más de una invitación pendiente. Completa la invitación correspondiente desde la web.'},409);
  const invite=matches[0];
  if(current.data&&current.data.company_id!==invite.company_id)return enterpriseJson({error:'Ya perteneces a otra empresa'},409);
  let cfg:ReturnType<typeof normalizeEmployeeConfig>;
  try{cfg=normalizeEmployeeConfig(invite.initial_settings);}
  catch{return enterpriseJson({error:'La empresa todavía debe completar la configuración inicial de tu invitación.'},409);}
  const name=(invite.employee_name||invite.username||'').trim();
  if(name.length<2)return enterpriseJson({error:'La empresa debe indicar tu nombre completo'},409);
  if(!current.data){
   const created=await db.from('tp_company_members').insert({company_id:invite.company_id,user_id:user.id,username:invite.username,employee_name:name,role:'driver',active:false});
   if(created.error){
    const retry=await db.from('tp_company_members').select('company_id,role,active').eq('user_id',user.id).maybeSingle();
    if(retry.error||retry.data?.company_id!==invite.company_id||retry.data?.role!=='driver')return enterpriseJson({error:'Esta cuenta está vinculada a otra empresa o usuario'},409);
   }
  }
  const saved=await db.from('tp_driver_settings').upsert({
   company_id:invite.company_id,driver_id:user.id,base_name:cfg.base_name,workplace:cfg.base_city,agreement:cfg.agreement||null,
   diet_rates:cfg.diet_rates,plus_rates:cfg.plus_rates,
   payroll_terms:{...cfg.payroll_terms,payment_mode:cfg.payment_mode,diet_scheme:cfg.diet_scheme},
   initial_config:cfg,updated_by:invite.invited_by,updated_at:new Date().toISOString()
  },{onConflict:'company_id,driver_id'});
  if(saved.error)throw saved.error;
  await syncEmployeeConfig(db,user.id,name,cfg);
  const activation=await db.from('tp_company_members').update({active:true,employee_name:name}).eq('user_id',user.id).eq('company_id',invite.company_id);
  if(activation.error)throw activation.error;
  const accepted=await db.from('tp_company_invites').update({accepted_at:new Date().toISOString()}).eq('id',invite.id).is('accepted_at',null);
  if(accepted.error)throw accepted.error;
  await audit(db,invite.company_id,user.id,'member.accepted.mobile','member',user.id,null,{role:'driver',invite_id:invite.id,settings_synced:true});
  return enterpriseJson({managed:true,linked:true,synced:true});
 }catch(e){console.error('enterprise native invitation activation',e);return enterpriseJson({error:'No se ha podido completar la configuración empresarial. Inténtalo de nuevo.'},500);}
}
