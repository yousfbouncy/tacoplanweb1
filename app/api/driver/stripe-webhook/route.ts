import {NextRequest,NextResponse} from 'next/server';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {adminDatabase} from '@/lib/admin-users';
export const dynamic='force-dynamic';
const response=(v:unknown,status=200)=>NextResponse.json(v,{status});
function signatureValid(raw:string,header:string,secret:string){
 const ts=Number(header.split(',').find(p=>p.startsWith('t='))?.slice(2));
 if(!Number.isSafeInteger(ts)||Math.abs(Date.now()/1000-ts)>300)return false;
 const calculated=Buffer.from(createHmac('sha256',secret).update(ts+'.'+raw).digest('hex'),'hex');
 return header.split(',').filter(p=>p.startsWith('v1=')).some(p=>{
  const hex=p.slice(3);return /^[a-f0-9]{64}$/.test(hex)&&timingSafeEqual(calculated,Buffer.from(hex,'hex'));
 });
}
export async function POST(req:NextRequest){
 const secret=process.env.TP_DRIVER_STRIPE_WEBHOOK_SECRET;
 if(!secret)return response({error:'Webhook no configurado'},503);
 const raw=await req.text();
 if(!signatureValid(raw,req.headers.get('stripe-signature')||'',secret))return response({error:'Firma inválida'},400);
 let event:any;
 try{event=JSON.parse(raw);}catch{return response({error:'JSON inválido'},400);}
 if(!event||typeof event.id!=='string'||typeof event.type!=='string')return response({error:'Evento inválido'},400);
 const db=adminDatabase();if(!db)return response({error:'Base de datos no disponible'},503);
 const {data:previous,error:readError}=await db.from('tp_driver_billing_events').select('processed_at').eq('event_id',event.id).maybeSingle();
 if(readError)return response({error:'No se pudo comprobar evento'},500);
 if(previous?.processed_at)return response({ok:true,duplicate:true});
 if(!previous){
  const {error}=await db.from('tp_driver_billing_events').insert({event_id:event.id,event_type:event.type});
  if(error)return response({error:'No se pudo registrar evento'},500);
 }
 try{
  const o=event.data?.object||{};
  // Stripe signatures are verified before any writes. Checkout is offered to
  // eligible accounts, not only former pilots; never discard a genuine paid
  // subscription or trial simply because pilot mode has ended.
  if(event.type==='checkout.session.completed'&&o.mode==='subscription'){
   const uid=o.metadata?.tp_driver_id||o.client_reference_id;
   const slug=o.metadata?.tp_price_slug;
   if(typeof uid==='string'&&typeof slug==='string'&&typeof o.subscription==='string'&&typeof o.customer==='string'){
    const {data:existing,error}=await db.from('tp_driver_subscriptions').select('stripe_customer_id,stripe_subscription_id,trial_used').eq('user_id',uid).maybeSingle();
    if(error)throw error;
    if(!existing||((!existing.stripe_customer_id||existing.stripe_customer_id===o.customer)&&(!existing.stripe_subscription_id||existing.stripe_subscription_id===o.subscription))){
     const update=await db.from('tp_driver_subscriptions').upsert({user_id:uid,price_slug:slug,stripe_customer_id:o.customer,stripe_subscription_id:o.subscription,trial_used:existing?.trial_used||false,updated_at:new Date().toISOString()},{onConflict:'user_id'});
     if(update.error)throw update.error;
    }
   }
  }
  if(['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type)){
   const uid=o.metadata?.tp_driver_id,slug=o.metadata?.tp_price_slug;
   if(typeof uid==='string'&&typeof slug==='string'&&typeof o.id==='string'&&typeof o.customer==='string'){
    const {data:existing,error}=await db.from('tp_driver_subscriptions').select('stripe_customer_id,stripe_subscription_id,trial_used').eq('user_id',uid).maybeSingle();
    if(error)throw error;
    if(!existing||((!existing.stripe_customer_id||existing.stripe_customer_id===o.customer)&&(!existing.stripe_subscription_id||existing.stripe_subscription_id===o.id))){
     const statuses=['active','trialing','past_due','unpaid','canceled','incomplete','incomplete_expired','paused'];
     const status=event.type==='customer.subscription.deleted'?'canceled':statuses.includes(o.status)?o.status:'incomplete';
     const update=await db.from('tp_driver_subscriptions').upsert({
      user_id:uid,price_slug:slug,stripe_customer_id:o.customer,stripe_subscription_id:o.id,status,
      trial_used:existing?.trial_used||status==='trialing'||typeof o.trial_end==='number',
      trial_ends_at:typeof o.trial_end==='number'?new Date(o.trial_end*1000).toISOString():null,
      current_period_end:typeof o.current_period_end==='number'?new Date(o.current_period_end*1000).toISOString():null,
      updated_at:new Date().toISOString()
     },{onConflict:'user_id'});
     if(update.error)throw update.error;
     // A permanent, independent history is never cleared by cancellation,
     // temporary plan deactivation, or later Stripe status transitions.
     if(status==='trialing'||typeof o.trial_end==='number'){
      const first=typeof o.trial_start==='number'?new Date(o.trial_start*1000).toISOString():new Date().toISOString();
      const history=await db.from('tp_driver_trial_history').upsert({
       user_id:uid,first_trial_at:first,
       plan:slug.startsWith('pro')?'pro':slug.startsWith('plus')?'plus':'unknown',
       source:'stripe_webhook'
      },{onConflict:'user_id',ignoreDuplicates:true});
      if(history.error)throw history.error;
     }
    }
   }
  }
  const done=await db.from('tp_driver_billing_events').update({processed_at:new Date().toISOString()}).eq('event_id',event.id);
  if(done.error)throw done.error;
  return response({received:true});
 }catch(err){
  console.error('Driver subscription Stripe event',err);
  return response({error:'No se pudo procesar el evento'},500);
 }
}
