import {NextRequest} from 'next/server';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {adminDatabase} from '@/lib/admin-users';
import {enterpriseJson} from '@/lib/tp-enterprise';
export const dynamic='force-dynamic';
const valid=(body:string,header:string,secret:string)=>{
 const items=Object.fromEntries(header.split(',').map(x=>x.split('=',2)));
 const timestamp=Number(items.t);
 if(!Number.isSafeInteger(timestamp)||Math.abs(Date.now()/1000-timestamp)>300)return false;
 const expected=createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex');
 const provided=header.split(',').filter(x=>x.startsWith('v1=')).map(x=>x.slice(3));
 return provided.some(sig=>/^[0-9a-f]{64}$/.test(sig)&&timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(expected,'hex')));
};
export async function POST(req:NextRequest){
 const secret=process.env.STRIPE_WEBHOOK_SECRET;
 if(!secret)return enterpriseJson({error:'Webhook sin configurar'},503);
 const raw=await req.text();
 const signature=req.headers.get('stripe-signature')||'';
 if(!valid(raw,signature,secret))return enterpriseJson({error:'Firma de Stripe inválida'},400);
 const db=adminDatabase();
 if(!db)return enterpriseJson({error:'Base de datos no disponible'},503);
 let event:any;
 try{event=JSON.parse(raw);}catch{return enterpriseJson({error:'Evento inválido'},400);}
 if(typeof event.id!=='string'||typeof event.type!=='string')return enterpriseJson({error:'Evento inválido'},400);
 const eventRow=await db.from('tp_stripe_events').select('processed_at').eq('event_id',event.id).maybeSingle();
 if(eventRow.error)return enterpriseJson({error:'No se pudo verificar el evento'},500);
 if(eventRow.data?.processed_at)return enterpriseJson({ok:true,repeated:true});
 if(!eventRow.data){
  const insert=await db.from('tp_stripe_events').insert({event_id:event.id,event_type:event.type});
  if(insert.error)return enterpriseJson({error:'No se pudo registrar el evento'},500);
 }
 try{
  const o=event.data?.object||{};
  if(event.type==='checkout.session.completed'&&o.mode==='subscription'){
   const companyId=o.metadata?.tp_company_id||o.client_reference_id;
   if(typeof companyId==='string'&&typeof o.subscription==='string'&&typeof o.customer==='string'){
    const existing=await db.from('tp_companies').select('id,stripe_customer_id,stripe_subscription_id').eq('id',companyId).maybeSingle();
    if(!existing.error&&existing.data&&(!existing.data.stripe_customer_id||existing.data.stripe_customer_id===o.customer)){
     const updated=await db.from('tp_companies').update({stripe_customer_id:o.customer,stripe_subscription_id:o.subscription}).eq('id',companyId);
     if(updated.error)throw updated.error;
    }
   }
  }
  if(['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type)){
   const companyId=o.metadata?.tp_company_id;
   if(typeof companyId==='string'&&typeof o.id==='string'&&typeof o.customer==='string'){
    const existing=await db.from('tp_companies').select('id,stripe_customer_id,stripe_subscription_id').eq('id',companyId).maybeSingle();
    if(existing.error)throw existing.error;
    if(existing.data&&(!existing.data.stripe_customer_id||existing.data.stripe_customer_id===o.customer)
      &&(!existing.data.stripe_subscription_id||existing.data.stripe_subscription_id===o.id)){
     const statuses=['trialing','active','past_due','canceled','unpaid','incomplete'];
     const status=event.type==='customer.subscription.deleted'?'canceled':(statuses.includes(o.status)?o.status:'incomplete');
     const updated=await db.from('tp_companies').update({
      stripe_customer_id:o.customer,stripe_subscription_id:o.id,
      subscription_status:status,trial_ends_at:typeof o.trial_end==='number'?new Date(o.trial_end*1000).toISOString():existing.data.trial_ends_at||null,
      subscription_ends_at:typeof o.current_period_end==='number'?new Date(o.current_period_end*1000).toISOString():null
     }).eq('id',companyId);
     if(updated.error)throw updated.error;
    }
   }
  }
  const done=await db.from('tp_stripe_events').update({processed_at:new Date().toISOString(),error:null}).eq('event_id',event.id);
  if(done.error)throw done.error;
  return enterpriseJson({received:true});
 }catch(error){
  await db.from('tp_stripe_events').update({error:String(error)}).eq('event_id',event.id);
  console.error('Stripe webhook enterprise',error);
  return enterpriseJson({error:'No se pudo procesar el evento'},500);
 }
}
