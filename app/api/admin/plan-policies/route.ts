import {NextRequest,NextResponse} from 'next/server';
import {adminDatabase,authorizedAdmin,sameOrigin} from '@/lib/admin-users';
import {changed,validatePlanConfig,type PlanSlug} from '@/lib/plan-policy';

export const dynamic='force-dynamic';
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
const slugOk=(s:unknown):s is PlanSlug=>s==='free'||s==='plus'||s==='pro';
function auth(req:NextRequest) {
 if(!authorizedAdmin(req))return {error:reply({error:'Acceso de administrador obligatorio'},401)};
 const db=adminDatabase();
 if(!db)return {error:reply({error:'Servicio de administración no configurado'},503)};
 return {db};
}
export async function GET(req:NextRequest) {
 const ctx=auth(req);if(ctx.error)return ctx.error;
 const [policies,runtime,catalog,subscribers]=await Promise.all([
  ctx.db!.from('tp_plan_policies').select('*').order('slug'),
  ctx.db!.from('tp_subscription_runtime').select('billing_enabled,restrictions_enabled').eq('id',1).single(),
  ctx.db!.from('tp_subscription_price_catalog').select('slug,plan,trial_days'),
  ctx.db!.from('tp_driver_subscriptions').select('status', {count:'exact',head:true}).in('status',['active','trialing']),
 ]);
 if(policies.error||runtime.error||catalog.error||subscribers.error)
  return reply({error:'No se pudo consultar la configuración de los planes. Comprueba la migración.'},503);
 return reply({policies:policies.data,runtime:runtime.data,catalog:catalog.data,activeSubscriptions:subscribers.count||0});
}
export async function PATCH(req:NextRequest) {
 if(!sameOrigin(req))return reply({error:'Origen no autorizado'},403);
 const ctx=auth(req);if(ctx.error)return ctx.error;
 let body:unknown;try{body=await req.json()}catch{return reply({error:'JSON inválido'},400)}
 if(!body||typeof body!=='object')return reply({error:'Solicitud incorrecta'},400);
 const {slug,config,version}=body as Record<string,unknown>;
 if(!slugOk(slug)||typeof version!=='number'||!Number.isInteger(version))
  return reply({error:'Plan o versión inválidos'},400);
 const valid=validatePlanConfig(slug,config);
 if(!valid)return reply({error:'Configuración inválida. Verifica duración, prueba y funciones.'},400);
 const {data:current,error:readError}=await ctx.db!.from('tp_plan_policies').select('*').eq('slug',slug).single();
 if(readError)return reply({error:'No se pudo recuperar el plan'},503);
 if(current.version!==version)return reply({error:'El plan ha cambiado. Recarga antes de guardar.'},409);
 if(!changed(current.draft_config,valid))return reply({ok:true,policy:current});
 const {data,error}=await ctx.db!.from('tp_plan_policies')
 .update({draft_config:valid,draft_updated_at:new Date().toISOString(),updated_at:new Date().toISOString(),version:version+1})
 .eq('slug',slug).eq('version',version).select('*').maybeSingle();
 if(error)return reply({error:'No se pudo guardar el borrador'},503);
 if(!data)return reply({error:'Otro administrador modificó el plan. Recarga.'},409);
 await ctx.db!.from('tp_plan_policy_audit').insert({plan_slug:slug,action:'draft',before_config:current.draft_config,after_config:valid});
 return reply({ok:true,policy:data});
}
export async function POST(req:NextRequest) {
 if(!sameOrigin(req))return reply({error:'Origen no autorizado'},403);
 const ctx=auth(req);if(ctx.error)return ctx.error;
 let body:unknown;try{body=await req.json()}catch{return reply({error:'JSON inválido'},400)}
 if(!body||typeof body!=='object')return reply({error:'Solicitud incorrecta'},400);
 const {slug,version,confirmed}=body as Record<string,unknown>;
 if(!slugOk(slug)||typeof version!=='number'||!Number.isInteger(version)||confirmed!==true)
  return reply({error:'Confirmación explícita y versión obligatorias'},400);
 const {data:policy,error:readError}=await ctx.db!.from('tp_plan_policies').select('*').eq('slug',slug).single();
 if(readError)return reply({error:'Plan no encontrado'},404);
 if(policy.version!==version)return reply({error:'El plan ha cambiado. Recarga.'},409);
 if(!validatePlanConfig(slug,policy.draft_config))
  return reply({error:'No se puede publicar una política inválida'},400);
 const {data,error}=await ctx.db!.rpc('tp_publish_plan_policy',{p_slug:slug,p_version:version});
 if(error){console.error('plan publish',error.message);return reply({error:'No se ha publicado. Recarga e inténtalo de nuevo.'},409);}
 return reply({ok:true,policy:data,billingActivated:false,existingTrialsChanged:false});
}
