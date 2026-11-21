/** Stripe is the source of payment evidence; subscription.status alone never proves payment. */
export type StripeDriverSubscription={
 id:string;customer:string;status:string;latest_invoice?:string|null;
 current_period_end?:number|null;trial_end?:number|null;metadata?:{tp_driver_id?:string};
};
export type PaidInvoiceEvidence={id:string;paid_at:string};
async function getStripeJson(path:string):Promise<any>{
 const key=process.env.STRIPE_SECRET_KEY;
 if(!key)throw Error('Stripe API not configured');
 const r=await fetch('https://api.stripe.com/v1/'+path,{headers:{Authorization:'Bearer '+key},cache:'no-store'});
 if(!r.ok)throw Error('Stripe verification HTTP '+r.status);
 return await r.json();
}
export async function getDriverStripeSubscription(id:string):Promise<StripeDriverSubscription>{
 return await getStripeJson('subscriptions/'+encodeURIComponent(id));
}
/** Require the exact real, positive-value paid invoice for the same customer and subscription. */
export async function verifyPaidInvoice(invoiceId:string,subscriptionId:string,customerId:string):Promise<PaidInvoiceEvidence|null>{
 const inv=await getStripeJson('invoices/'+encodeURIComponent(invoiceId));
 const linkedSub=inv.parent?.subscription_details?.subscription||inv.subscription;
 if(inv.id!==invoiceId||inv.customer!==customerId||linkedSub!==subscriptionId||
    inv.status!=='paid'||inv.paid!==true||!(Number(inv.amount_paid)>0)||Number(inv.amount_remaining)!==0)
   return null;
 return {id:inv.id,paid_at:new Date(((inv.status_transitions?.paid_at as number|undefined)||Math.floor(Date.now()/1000))*1000).toISOString()};
}
export async function verifiedLatestPayment(sub:StripeDriverSubscription):Promise<PaidInvoiceEvidence|null>{
 if(typeof sub.latest_invoice!=='string')return null;
 return verifyPaidInvoice(sub.latest_invoice,sub.id,sub.customer);
}
