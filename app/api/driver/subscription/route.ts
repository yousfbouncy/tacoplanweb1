import { NextRequest,NextResponse } from 'next/server';
import { adminDatabase,sameOrigin } from '@/lib/admin-users';
import {validatePlanConfig,type PlanSlug} from '@/lib/plan-policy';
import {calculateTimedFreeFeatures,trialEligibility,type LaunchMap} from '@/lib/feature-entitlements';
import {getDriverStripeSubscription,verifiedLatestPayment} from '@/lib/driver-payment-verification';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private,no-store'}});
async function reconcileOverdueSubscription(db:ReturnType<typeof adminDatabase>,userId:string,record:{
 status?:string|null;stripe_subscription_id?:string|null;stripe_customer_id?:string|null;first_paid_at?:string|null;
} | null){
 if(!db||!['past_due','active','incomplete'].includes(record?.status||'')||!record?.stripe_subscription_id||
    !record.stripe_customer_id||!process.env.STRIPE_SECRET_KEY)return null;
 try{
  const remote=await getDriverStripeSubscription(record.stripe_subscription_id);
  if(remote.id!==record.stripe_subscription_id||remote.customer!==record.stripe_customer_id||
    remote.metadata?.tp_driver_id!==userId||remote.status!=='active')return null;
  const evidence=await verifiedLatestPayment(remote);
  if(!evidence)return null; // No real, positive-value paid invoice => no paid activation.
  const updated=await db.from('tp_driver_subscriptions').update({
   status:'active',first_paid_at:record.first_paid_at||evidence.paid_at,
   last_paid_invoice_id:evidence.id,updated_at:new Date().toISOString(),
   current_period_end:typeof remote.current_period_end==='number'?new Date(remote.current_period_end*1000).toISOString():null
  }).eq('user_id',userId).eq('stripe_subscription_id',remote.id);
  if(updated.error){console.error('Payment reconciliation DB failed',updated.error.message);return null;}
  return evidence;
 }catch(err){console.error('Payment reconciliation failed',err instanceof Error?err.message:'unknown');return null;}
}
// A previously stored customer may have been deleted in Stripe. Verify it
// before reusing it in Checkout; never overwrite an active subscription.
async function reusableStripeCustomer(customerId:string):Promise<boolean>{
 const key=process.env.STRIPE_SECRET_KEY;
 if(!key)throw Error('Stripe no está configurado');
 const response=await fetch('https://api.stripe.com/v1/customers/'+encodeURIComponent(customerId),{
  headers:{Authorization:'Bearer '+key},cache:'no-store'
 });
 if(response.status===404)return false;
 if(!response.ok)throw Error('No se ha podido verificar el cliente en Stripe');
 const customer=await response.json();
 return customer?.id===customerId&&customer?.deleted!==true;
}
async function stripe(path:string,params:URLSearchParams){
 const key=process.env.STRIPE_SECRET_KEY;
 if(!key)throw Error('Stripe no está configurado');
 const r=await fetch('https://api.stripe.com/v1/'+path,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/x-www-form-urlencoded'},body:params.toString(),cache:'no-store'});
 const j=await r.json();
 if(!r.ok){
  const e=j?.error;
  console.error('Tacoplan Stripe API failure', {path,status:r.status,code:typeof e?.code==='string'?e.code:'unknown',type:typeof e?.type==='string'?e.type:'unknown',message:typeof e?.message==='string'?e.message:'unknown'});
  throw Error('Stripe rechazó la solicitud');
 }
 return j as {url?:string;id:string};
}
// Resolve the offer from the server-side database. Fail closed on lookup errors.
async function loadOffer(db:NonNullable<ReturnType<typeof adminDatabase>>,userId:string){
 const {data,error}=await db.from('tp_subscription_offer_users').select('tp_subscription_offers!inner(id,enabled,starts_at,ends_at,first_charge_at)').eq('user_id',userId);
 if(error)throw Error('No se pudo verificar la promoción');
 const now=Date.now();
 const offers=(data||[]).flatMap((row:any)=>Array.isArray(row.tp_subscription_offers)?row.tp_subscription_offers:[row.tp_subscription_offers]).filter((o:any)=>o&&o.enabled&&Date.parse(o.starts_at)<=now&&Date.parse(o.first_charge_at)>now);
 const eligible=offers.filter((o:any)=>Date.parse(o.ends_at)>now&&Date.parse(o.first_charge_at)-now>=172800000).sort((a:any,b:any)=>Date.parse(b.first_charge_at)-Date.parse(a.first_charge_at))[0];
 return {eligible:eligible||null,closed:offers.length>0&&!eligible};
}
type TrialActivity={first_jornada_date:string|null;last_jornada_date:string|null;distinct_jornada_days:number;days_last30:number;activity_span_days:number|null};
function assessTrial(activity:TrialActivity|null,mode:string|undefined){
 const activeDays=Number(activity?.distinct_jornada_days||0);
 const span=Number(activity?.activity_span_days||0);
 // At least 30 elapsed days between first and last registered workdays. No calendar-day attendance requirement.
 const experienced=activeDays>=2&&span>=30;
 const disabled=mode==='disabled'||mode!=='allowed'&&experienced;
 const start=activity?.first_jornada_date||null;
 const daysUsing=start?Math.max(0,Math.floor((Date.now()-Date.parse(start+'T00:00:00Z'))/86400000)):0;
 return {disabled,experienced,first_jornada_date:start,last_jornada_date:activity?.last_jornada_date||null,
  distinct_jornada_days:activeDays,days_last30:Number(activity?.days_last30||0),days_using:daysUsing,mode:mode||'automatic',
  reason:mode==='disabled'?'Prueba gratuita desactivada por administración':
   experienced&&mode!=='allowed'?'Tu periodo de prueba gratuita ha terminado: llevas más de 30 días registrando jornadas en Tacoplan.':
   'La prueba puede estar disponible si no la has utilizado antes.'};
}
async function loadTrialAssessment(db:NonNullable<ReturnType<typeof adminDatabase>>,userId:string){
 const [activity,overrides]=await Promise.all([
  db.rpc('tp_driver_trial_activity',{p_user_id:userId}),
  db.from('tp_driver_trial_overrides').select('trial_mode').eq('user_id',userId).maybeSingle()
 ]);
 if(activity.error||overrides.error)throw Error('No se pudo verificar la antigüedad de las jornadas');
 return assessTrial((activity.data?.[0]||null) as TrialActivity|null,overrides.data?.trial_mode);
}
async function identify(req:NextRequest){
 const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 const db=adminDatabase();
 if(!db||!token)return null;
 const {data,error}=await db.auth.getUser(token);
 return error||!data.user?null:{db,user:data.user};
}
export async function GET(req:NextRequest){
 const ctx=await identify(req);if(!ctx)return reply({error:'Inicia sesión'},401);
 const [runtime,catalog,assignment,subscription,pilot,grant,policies,launches,trialHistory]=await Promise.all([
  ctx.db.from('tp_subscription_runtime').select('billing_enabled,restrictions_enabled').eq('id',1).single(),
  ctx.db.from('tp_subscription_price_catalog').select('slug,plan,audience,monthly_cents,annual_cents,trial_days').neq('plan','plus'),
  ctx.db.from('tp_driver_price_entitlements').select('audience').eq('user_id',ctx.user.id).maybeSingle(),
  ctx.db.from('tp_driver_subscriptions').select('price_slug,status,trial_ends_at,current_period_end,trial_used,payment_failed_at,stripe_subscription_id,stripe_customer_id,first_paid_at,last_paid_invoice_id').eq('user_id',ctx.user.id).maybeSingle(),
  ctx.db.from('tp_driver_pilot_access').select('enabled,pro_access,checkout_enabled').eq('user_id',ctx.user.id).maybeSingle(),
  ctx.db.from('tp_subscription_grants').select('plan,enabled').eq('user_id',ctx.user.id).maybeSingle(),
  ctx.db.from('tp_plan_policies').select('slug,published_config'),
  ctx.db.from('tp_free_feature_launches').select('feature_key,first_started_at'),
  ctx.db.from('tp_driver_trial_history').select('first_trial_at,plan').eq('user_id',ctx.user.id).maybeSingle()
 ]);
 if(runtime.error||catalog.error||assignment.error||subscription.error||pilot.error||grant.error||policies.error||launches.error||trialHistory.error)return reply({error:'Catálogo no disponible'},503);
 let trialCheck:ReturnType<typeof assessTrial>;
 try{trialCheck=await loadTrialAssessment(ctx.db,ctx.user.id);}catch{return reply({error:'No se pudo verificar la elegibilidad de la prueba'},503);}
 const verifiedPayment=await reconcileOverdueSubscription(ctx.db,ctx.user.id,subscription.data);
 const isPilot=pilot.data?.enabled===true;
 const status=verifiedPayment?'active':subscription.data?.status;
 const previouslyPaid=Boolean(verifiedPayment||subscription.data?.first_paid_at);
 const pastDueSince=Date.parse(subscription.data?.payment_failed_at||'');
 const gracePeriodActive=status==='past_due'&&previouslyPaid&&Number.isFinite(pastDueSince)&&Date.now()<pastDueSince+72*3600000;
 const paidTier=(status==='active'&&previouslyPaid||status==='trialing'||gracePeriodActive)
   ? subscription.data?.price_slug?.startsWith('pro')?'pro':subscription.data?.price_slug?.startsWith('plus')?'plus':'free'
   : 'free';
 const gifted=grant.data?.enabled===true?grant.data.plan:null;
 const effectivePlan=gifted==='pro'||isPilot&&pilot.data?.pro_access===true?'pro':gifted==='plus'&&paidTier!=='pro'?'plus':paidTier;
 const restrictionsEnabled=runtime.data?.restrictions_enabled===true;
 const published=policies.error?[]:(policies.data||[]);
 const tier=effectivePlan as PlanSlug;
 const policy=published.find(p=>p.slug===tier);
 const policyConfig=validatePlanConfig(tier,policy?.published_config);
 const freePolicy=published.find(p=>p.slug==='free');
 const freeConfig=validatePlanConfig('free',freePolicy?.published_config);
 // A finite Free plan is calculated from the authenticated account creation
 // date. Never delete its historical activity when time expires.
 const freeExpiry=restrictionsEnabled&&tier==='free'&&freeConfig?.duration_days!==null&&freeConfig?.duration_days!==undefined
   ? new Date(Date.parse(ctx.user.created_at)+freeConfig.duration_days*86400000).toISOString():null;
 const freeExpired=freeExpiry!==null&&Date.parse(freeExpiry)<=Date.now();
 const immutableLaunches:LaunchMap=Object.fromEntries((launches.data||[]).map(row=>[row.feature_key,row.first_started_at]));
 const limitedFree=freeConfig?calculateTimedFreeFeatures(freeConfig,immutableLaunches,ctx.user.created_at):null;
 const featureAccess=tier==='free'?limitedFree?.features||null:policyConfig?.features||null;
 const featureStatus=tier==='free'?limitedFree?.feature_status||null:null;
 const trialAlreadyUsed=!!trialHistory.data||subscription.data?.trial_used===true||subscription.data?.status==='trialing'||!!subscription.data?.trial_ends_at;
 const availableTrial=!trialCheck.disabled&&trialEligibility(subscription.data,!!trialHistory.data,Math.max(0,...(catalog.data||[]).map(x=>x.trial_days||0)));
 let offer:Awaited<ReturnType<typeof loadOffer>>;try{offer=await loadOffer(ctx.db,ctx.user.id);}catch{return reply({error:'No se pudo verificar la promoción'},503);}
 const canCheckout=runtime.data?.billing_enabled===true;
 return reply({billing_enabled:canCheckout,restrictions_enabled:restrictionsEnabled,all_features_unlocked:!restrictionsEnabled,
  complimentary_plan:gifted,can_manage_subscription:!!subscription.data?.status && !['inactive','canceled','incomplete_expired'].includes(subscription.data.status),
  pilot_access:isPilot,effective_plan:effectivePlan,pro_access:!restrictionsEnabled||effectivePlan==='pro',
  plus_access:!restrictionsEnabled||['plus','pro'].includes(effectivePlan),
  audience:assignment.data?.audience||'standard',plans:catalog.data,subscription:subscription.data?{...subscription.data,status,first_paid_at:subscription.data.first_paid_at||verifiedPayment?.paid_at||null}:null, payment_grace_until:gracePeriodActive?new Date(pastDueSince+72*3600000).toISOString():null,
  trial_used:trialAlreadyUsed,trial_available:availableTrial, december_offer_until:offer.eligible&&!['active','trialing','past_due','unpaid','incomplete','paused'].includes(status||'')?offer.eligible.first_charge_at:null,trial_activity:trialCheck,trial_used_at:trialHistory.data?.first_trial_at||null,
  feature_status:restrictionsEnabled?featureStatus:null,
  policy:policyConfig,features:restrictionsEnabled?featureAccess:null,
  free_plan_expires_at:freeExpiry,free_plan_expired:freeExpired,
  policy_version:1});
}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return reply({error:'Origen no autorizado'},403);
 const ctx=await identify(req);if(!ctx)return reply({error:'Inicia sesión'},401);
 let body:{action?:string;plan?:string;interval?:string;skip_trial?:boolean};
 try{body=await req.json();}catch{return reply({error:'Solicitud inválida'},400);}
 const db=ctx.db,userId=ctx.user.id;
 const [runtime,assignment,sub,pilot,trialHistory]=await Promise.all([
  db.from('tp_subscription_runtime').select('billing_enabled').eq('id',1).single(),
  db.from('tp_driver_price_entitlements').select('audience').eq('user_id',userId).maybeSingle(),
  db.from('tp_driver_subscriptions').select('*').eq('user_id',userId).maybeSingle(),
  db.from('tp_driver_pilot_access').select('enabled,checkout_enabled').eq('user_id',userId).maybeSingle(),
  db.from('tp_driver_trial_history').select('first_trial_at').eq('user_id',userId).maybeSingle()
 ]);
 if(runtime.error||assignment.error||sub.error||pilot.error||trialHistory.error)return reply({error:'No se pudo comprobar la cuenta'},503);
 // A paying user must always be able to manage or cancel their existing subscription,
 // even if new checkout is disabled or their pilot eligibility changes.
 if(body.action==='portal'){
  if(!sub.data?.stripe_customer_id)return reply({error:'No tienes suscripción que gestionar'},409);
  const params=new URLSearchParams({customer:sub.data.stripe_customer_id,return_url:req.nextUrl.origin+'/planes?subscription=return'});
  try{const session=await stripe('billing_portal/sessions',params);return reply({url:session.url});}catch{return reply({error:'Portal no disponible'},503);}
 }
 if(body.action!=='checkout'||!['plus','pro'].includes(body.plan||'')||!['month','year'].includes(body.interval||''))return reply({error:'Plan o periodo inválido'},400);
 if(body.plan==='plus')return reply({error:'Este plan ya no está disponible para nuevas contrataciones. Elige Pro en tacoplan.es/planes.'},409);
 if(runtime.data?.billing_enabled!==true)return reply({error:'Contratación en preparación, sin cobros activados'},503);
 if(body.skip_trial!==undefined && typeof body.skip_trial!=='boolean')return reply({error:'Opción de prueba inválida'},400);
 if(['active','trialing','past_due','unpaid','incomplete'].includes(sub.data?.status||''))return reply({error:'Gestiona tu suscripción existente desde el portal'},409);
 let trialCheck:ReturnType<typeof assessTrial>;
 try{trialCheck=await loadTrialAssessment(db,userId);}catch{return reply({error:'No se pudo verificar la elegibilidad de la prueba'},503);}
 const audience=assignment.data?.audience||'standard';
 const slug=audience==='founder'?(body.plan==='plus'?'plus_existing':'pro_founder'):audience==='existing'?body.plan+'_existing':body.plan!;
 const {data:price,error}=await db.from('tp_subscription_price_catalog').select('*').eq('slug',slug).single();
 if(error||!price)return reply({error:'Tarifa no disponible'},404);
 const amount=body.interval==='year'?price.annual_cents:price.monthly_cents;
 if(typeof amount!=='number'||amount<=0)return reply({error:'Este periodo no está disponible para tu tarifa'},400);
 const taxMode=process.env.TP_STRIPE_TAX_MODE;
 if(!['automatic','off'].includes(taxMode||''))return reply({error:'Falta revisar el IVA antes de activar pagos'},503);
 const form=new URLSearchParams();
 form.set('mode','subscription');
 form.set('line_items[0][price_data][currency]','eur');
 // Consumer-facing catalog prices are final amounts; keep any applicable tax inside the quoted total.
 form.set('line_items[0][price_data][tax_behavior]','inclusive');
 form.set('line_items[0][price_data][unit_amount]',String(amount));
 form.set('line_items[0][price_data][product_data][name]','Tacoplan '+body.plan+' ('+audience+')');
 // Professional drivers use the downloadable Tacoplan SaaS app; specify per-item tax category for Stripe Tax.
 form.set('line_items[0][price_data][product_data][tax_code]','txcd_10103101');
 form.set('line_items[0][price_data][recurring][interval]',body.interval!);
 form.set('line_items[0][quantity]','1');
 form.set('payment_method_collection','always');form.set('billing_address_collection','required');
 form.set('automatic_tax[enabled]',taxMode==='automatic'?'true':'false');
 form.set('client_reference_id',userId);
 form.set('metadata[tp_driver_id]',userId);form.set('metadata[tp_price_slug]',slug);
 form.set('subscription_data[metadata][tp_driver_id]',userId);
 form.set('subscription_data[metadata][tp_price_slug]',slug);
 const trialAvailable=!trialCheck.disabled&&trialEligibility(sub.data,!!trialHistory.data,price.trial_days);
 let offer:Awaited<ReturnType<typeof loadOffer>>;try{offer=await loadOffer(db,userId);}catch{return reply({error:'No se pudo verificar la promoción'},503);}
 if(offer.eligible){
  form.set('subscription_data[trial_end]',String(Math.floor(Date.parse(offer.eligible.first_charge_at)/1000)));
  form.set('metadata[tp_offer_id]',offer.eligible.id);form.set('subscription_data[metadata][tp_offer_id]',offer.eligible.id);
 }else if(offer.closed)return reply({error:'La oferta ha cerrado. Consulta las condiciones antes de contratar.'},409);
 else if(!body.skip_trial && trialAvailable)form.set('subscription_data[trial_period_days]',String(price.trial_days));
 form.set('success_url',req.nextUrl.origin+'/planes?subscription=success');
 form.set('cancel_url',req.nextUrl.origin+'/planes?subscription=cancel');
 if(sub.data?.stripe_customer_id){
  try{
   if(await reusableStripeCustomer(sub.data.stripe_customer_id)){
    form.set('customer',sub.data.stripe_customer_id);
   }else{
    // Clear ONLY the stale reference for an inactive/cancelled subscription:
    // payment webhooks reject replacement customers if the old ID remains.
    if(!['canceled','inactive','incomplete_expired'].includes(sub.data.status||'')){
     return reply({error:'La referencia de pago necesita revisión antes de contratar.'},409);
    }
    const cleared=await db.from('tp_driver_subscriptions').update({
     stripe_customer_id:null,stripe_subscription_id:null,updated_at:new Date().toISOString()
    }).eq('user_id',userId).eq('stripe_customer_id',sub.data.stripe_customer_id)
      .eq('status',sub.data.status).select('user_id');
    if(cleared.error||!cleared.data?.length){
     return reply({error:'No se ha podido actualizar la referencia antigua de pago.'},503);
    }
    // Preserve trial_used/history and account access. Stripe assigns a new
    // customer ID on Checkout, safely recorded by the subscription webhook.
    if(ctx.user.email)form.set('customer_email',ctx.user.email);
   }
  }catch{
   return reply({error:'No se ha podido verificar la cuenta de pago. Inténtalo más tarde.'},503);
  }
 }else if(ctx.user.email)form.set('customer_email',ctx.user.email);
 try{const session=await stripe('checkout/sessions',form);if(!session.url)throw Error('No URL');if(session.id){try{const log=await db.from('tp_email_checkout_attempts').upsert({session_id:session.id,user_id:userId},{onConflict:'session_id',ignoreDuplicates:true});if(log.error)console.warn('Checkout analytics unavailable');}catch{console.warn('Checkout analytics unavailable');}}return reply({url:session.url});}
 catch(err){console.error('Tacoplan checkout failed',err instanceof Error?err.message:'unknown');return reply({error:'No se pudo iniciar el pago'},503);}
}
