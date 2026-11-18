import { NextRequest,NextResponse } from 'next/server';
import { adminDatabase,sameOrigin } from '@/lib/admin-users';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private,no-store'}});
async function stripe(path:string,params:URLSearchParams){
 const key=process.env.STRIPE_SECRET_KEY;
 if(!key)throw Error('Stripe no está configurado');
 const r=await fetch('https://api.stripe.com/v1/'+path,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/x-www-form-urlencoded'},body:params.toString(),cache:'no-store'});
 const j=await r.json();
 if(!r.ok)throw Error('Stripe rechazó la solicitud');
 return j as {url?:string;id:string};
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
 const [runtime,catalog,assignment,subscription,pilot]=await Promise.all([
  ctx.db.from('tp_subscription_runtime').select('billing_enabled').eq('id',1).single(),
  ctx.db.from('tp_subscription_price_catalog').select('slug,plan,audience,monthly_cents,annual_cents,trial_days'),
  ctx.db.from('tp_driver_price_entitlements').select('audience').eq('user_id',ctx.user.id).maybeSingle(),
  ctx.db.from('tp_driver_subscriptions').select('price_slug,status,trial_ends_at,current_period_end,trial_used').eq('user_id',ctx.user.id).maybeSingle(),
  ctx.db.from('tp_driver_pilot_access').select('enabled,pro_access,checkout_enabled').eq('user_id',ctx.user.id).maybeSingle()
 ]);
 if(runtime.error||catalog.error||assignment.error||subscription.error||pilot.error)return reply({error:'Catálogo no disponible'},503);
 const isPilot=pilot.data?.enabled===true;
 const status=subscription.data?.status;
 const paidTier=(status==='active'||status==='trialing')
   ? subscription.data?.price_slug?.startsWith('pro')?'pro':subscription.data?.price_slug?.startsWith('plus')?'plus':'free'
   : 'free';
 const effectivePlan=isPilot?(pilot.data?.pro_access===true?'pro':paidTier):'free';
 return reply({billing_enabled:isPilot && pilot.data?.checkout_enabled===true,can_manage_subscription:!!subscription.data?.status && !['inactive','canceled','incomplete_expired'].includes(subscription.data.status),pilot_access:isPilot,effective_plan:effectivePlan,pro_access:effectivePlan==='pro',audience:assignment.data?.audience||'standard',plans:catalog.data,subscription:subscription.data});
}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return reply({error:'Origen no autorizado'},403);
 const ctx=await identify(req);if(!ctx)return reply({error:'Inicia sesión'},401);
 let body:{action?:string;plan?:string;interval?:string;skip_trial?:boolean};
 try{body=await req.json();}catch{return reply({error:'Solicitud inválida'},400);}
 const db=ctx.db,userId=ctx.user.id;
 const [runtime,assignment,sub,pilot]=await Promise.all([
  db.from('tp_subscription_runtime').select('billing_enabled').eq('id',1).single(),
  db.from('tp_driver_price_entitlements').select('audience').eq('user_id',userId).maybeSingle(),
  db.from('tp_driver_subscriptions').select('*').eq('user_id',userId).maybeSingle(),
  db.from('tp_driver_pilot_access').select('enabled,checkout_enabled').eq('user_id',userId).maybeSingle()
 ]);
 if(runtime.error||assignment.error||sub.error||pilot.error)return reply({error:'No se pudo comprobar la cuenta'},503);
 // A paying user must always be able to manage or cancel their existing subscription,
 // even if new checkout is disabled or their pilot eligibility changes.
 if(body.action==='portal'){
  if(!sub.data?.stripe_customer_id)return reply({error:'No tienes suscripción que gestionar'},409);
  const params=new URLSearchParams({customer:sub.data.stripe_customer_id,return_url:req.nextUrl.origin+'/planes?subscription=return'});
  try{const session=await stripe('billing_portal/sessions',params);return reply({url:session.url});}catch{return reply({error:'Portal no disponible'},503);}
 }
 if(body.action!=='checkout'||!['plus','pro'].includes(body.plan||'')||!['month','year'].includes(body.interval||''))return reply({error:'Plan o periodo inválido'},400);
 if(!(pilot.data?.enabled===true && pilot.data?.checkout_enabled===true))return reply({error:'Contratación en preparación, sin cobros activados'},503);
 if(body.skip_trial!==undefined && typeof body.skip_trial!=='boolean')return reply({error:'Opción de prueba inválida'},400);
 if(['active','trialing','past_due','unpaid','incomplete'].includes(sub.data?.status||''))return reply({error:'Gestiona tu suscripción existente desde el portal'},409);
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
 form.set('line_items[0][price_data][recurring][interval]',body.interval!);
 form.set('line_items[0][quantity]','1');
 form.set('payment_method_collection','always');form.set('billing_address_collection','required');
 form.set('automatic_tax[enabled]',taxMode==='automatic'?'true':'false');
 form.set('client_reference_id',userId);
 form.set('metadata[tp_driver_id]',userId);form.set('metadata[tp_price_slug]',slug);
 form.set('subscription_data[metadata][tp_driver_id]',userId);
 form.set('subscription_data[metadata][tp_price_slug]',slug);
 if(!body.skip_trial && !sub.data?.trial_used&&price.trial_days>0)form.set('subscription_data[trial_period_days]',String(price.trial_days));
 form.set('success_url',req.nextUrl.origin+'/planes?subscription=success');
 form.set('cancel_url',req.nextUrl.origin+'/planes?subscription=cancel');
 if(sub.data?.stripe_customer_id)form.set('customer',sub.data.stripe_customer_id);
 else if(ctx.user.email)form.set('customer_email',ctx.user.email);
 try{const session=await stripe('checkout/sessions',form);if(!session.url)throw Error('No URL');return reply({url:session.url});}
 catch{return reply({error:'No se pudo iniciar el pago'},503);}
}
