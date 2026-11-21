import {NextRequest,NextResponse} from 'next/server';
import {adminDatabase} from '@/lib/admin-users';
import {getDriverStripeSubscription,verifiedLatestPayment} from '@/lib/driver-payment-verification';
export const dynamic='force-dynamic';
export const maxDuration=60;
const HOUR=3600000;
const GRACE_MS=72*HOUR;
type StripeSubscription={id:string;status:string;customer:string;trial_end?:number|null;current_period_end?:number|null;metadata?:{tp_driver_id?:string};error?:{message?:string}};
async function stripe(method:'GET'|'DELETE',id:string,key:string):Promise<StripeSubscription>{
 const res=await fetch('https://api.stripe.com/v1/subscriptions/'+encodeURIComponent(id),{
  method,headers:{Authorization:'Bearer '+key},cache:'no-store'});
 if(!res.ok)throw new Error('Stripe subscription '+method+' HTTP '+res.status);
 return await res.json();
}
export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get('authorization')!=='Bearer '+secret)
  return NextResponse.json({error:'No autorizado'},{status:401});
 const key=process.env.STRIPE_SECRET_KEY;
 const db=adminDatabase();
 if(!db||!key)return NextResponse.json({error:'Configuración de facturación no disponible'},{status:503});
 const now=Date.now();
 const {data,error}=await db.from('tp_driver_subscriptions')
  .select('user_id,status,stripe_customer_id,stripe_subscription_id,payment_failed_at,first_paid_at')
  .eq('status','past_due').not('payment_failed_at','is',null).range(0,999);
 if(error)return NextResponse.json({error:'No se pueden consultar suscripciones'},{status:503});
 let grace=0,recovered=0,canceled=0,failed=0;
 for(const sub of data||[]){
  const failedAt=Date.parse(sub.payment_failed_at||'');
  if(!sub.first_paid_at){continue;} // First payment failed: no access, and no renewal grace applies.
  if(!Number.isFinite(failedAt)||!sub.stripe_subscription_id){failed++;continue;}
  if(now<failedAt+GRACE_MS){grace++;continue;}
  try{
   const current=await stripe('GET',sub.stripe_subscription_id,key);
   if(current.metadata?.tp_driver_id!==sub.user_id||current.customer!==sub.stripe_customer_id){
    failed++;console.error('Driver subscription ownership mismatch');continue;
   }
   if(current.status==='active'){
    const evidence=await verifiedLatestPayment(current);
    if(!evidence){failed++;continue;}
    const change=await db.from('tp_driver_subscriptions').update({
     status:'active',last_paid_invoice_id:evidence.id,trial_ends_at:current.trial_end?new Date(current.trial_end*1000).toISOString():null,
     current_period_end:current.current_period_end?new Date(current.current_period_end*1000).toISOString():null,
     updated_at:new Date().toISOString()
    }).eq('user_id',sub.user_id).eq('status','past_due').eq('stripe_subscription_id',sub.stripe_subscription_id);
    if(change.error)throw change.error;
    recovered++;continue;
   }
   if(current.status==='canceled'||current.status==='unpaid'){
    const change=await db.from('tp_driver_subscriptions').update({status:current.status,updated_at:new Date().toISOString()})
     .eq('user_id',sub.user_id).eq('stripe_subscription_id',sub.stripe_subscription_id);
    if(change.error)throw change.error;
    canceled++;continue;
   }
   if(current.status!=='past_due'){failed++;continue;}
   // Recheck local state before an irreversible Stripe action.
   const {data:fresh,error:readError}=await db.from('tp_driver_subscriptions')
    .select('status,payment_failed_at,stripe_subscription_id')
    .eq('user_id',sub.user_id).single();
   if(readError||fresh?.status!=='past_due'||fresh.stripe_subscription_id!==sub.stripe_subscription_id||
     Date.parse(fresh.payment_failed_at||'')+GRACE_MS>Date.now())continue;
   await stripe('DELETE',sub.stripe_subscription_id,key);
   const change=await db.from('tp_driver_subscriptions')
    .update({status:'canceled',updated_at:new Date().toISOString()})
    .eq('user_id',sub.user_id).eq('stripe_subscription_id',sub.stripe_subscription_id);
   if(change.error)throw change.error;
   canceled++;
  }catch(error){failed++;console.error('Driver overdue subscription processing failed',error instanceof Error?error.message:'unknown');}
 }
 return NextResponse.json({ok:failed===0,grace,recovered,canceled,failed},{status:failed?503:200});
}
