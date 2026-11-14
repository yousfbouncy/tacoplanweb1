import {NextRequest} from 'next/server';
import {membership,enterpriseJson,originAllowed,permitted,PLAN_PRICES} from '@/lib/tp-enterprise';
export const dynamic='force-dynamic';
const stripe=async(path:string,params:URLSearchParams)=>{
 const secret=process.env.STRIPE_SECRET_KEY;
 if(!secret)throw Error('El servidor necesita STRIPE_SECRET_KEY');
 const r=await fetch('https://api.stripe.com/v1/'+path,{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/x-www-form-urlencoded'},body:params.toString(),cache:'no-store'});
 const data=await r.json();
 if(!r.ok)throw Error(typeof data.error?.message==='string'?data.error.message:'Stripe ha rechazado la operación');
 return data as {url?:string;id:string};
};
export async function POST(req:NextRequest){
 if(!originAllowed(req))return enterpriseJson({error:'Origen no permitido'},403);
 const auth=await membership(req);
 if(!auth?.member||!permitted(auth.member.role,'owner'))return enterpriseJson({error:'Solo el administrador de empresa gestiona la suscripción'},403);
 let body:{action?:string};try{body=await req.json();}catch{return enterpriseJson({error:'Solicitud incorrecta'},400);}
 const {db,member,user}=auth;
 const {data:company,error}=await db.from('tp_companies').select('id,plan_price_id,subscription_status,stripe_customer_id,trial_ends_at').eq('id',member.company_id).single();
 if(error||!company)return enterpriseJson({error:'Empresa no encontrada'},404);
 try{
  if(body.action==='checkout'){
   if(['active','trialing'].includes(company.subscription_status))return enterpriseJson({error:'Ya tienes una suscripción activa'},409);
   if(company.trial_ends_at)return enterpriseJson({error:'La empresa ya disfrutó la prueba gratuita. Contacta para cambiar de plan o reactivar.'},409);
   const taxMode=process.env.TP_STRIPE_TAX_MODE;
   if(taxMode!=='automatic'&&taxMode!=='off')return enterpriseJson({error:'Falta confirmar y configurar el tratamiento del IVA en Stripe antes de activar las suscripciones reales'},503);
   const plan=PLAN_PRICES.find(p=>p.priceId===company.plan_price_id);
   if(!plan)return enterpriseJson({error:'Precio empresarial inválido'},400);
   const form=new URLSearchParams();
   form.set('mode','subscription');
   form.set('line_items[0][price]',plan.priceId);form.set('line_items[0][quantity]','1');
   form.set('payment_method_collection','always');
   form.set('billing_address_collection','required');
   form.set('subscription_data[trial_period_days]','7');
   form.set('subscription_data[metadata][tp_company_id]',company.id);
   form.set('metadata[tp_company_id]',company.id);
   form.set('client_reference_id',company.id);
   form.set('automatic_tax[enabled]',taxMode==='automatic'?'true':'false');
   form.set('success_url',req.nextUrl.origin+'/empresas?payment=success');
   form.set('cancel_url',req.nextUrl.origin+'/empresas?payment=cancel');
   if(company.stripe_customer_id)form.set('customer',company.stripe_customer_id);
   else if(user.email)form.set('customer_email',user.email);
   const result=await stripe('checkout/sessions',form);
   if(!result.url)throw Error('Stripe no devolvió la URL de pago');
   return enterpriseJson({url:result.url,trialDays:7,priceCents:plan.cents,currency:'EUR'});
  }
  if(body.action==='portal'){
   if(!company.stripe_customer_id)return enterpriseJson({error:'Aún no hay cliente de Stripe'},409);
   const form=new URLSearchParams();
   form.set('customer',company.stripe_customer_id);
   form.set('return_url',req.nextUrl.origin+'/empresas');
   const result=await stripe('billing_portal/sessions',form);
   if(!result.url)throw Error('No se pudo abrir el portal de facturación');
   return enterpriseJson({url:result.url});
  }
  return enterpriseJson({error:'Acción no permitida'},400);
 }catch(error){console.error('Enterprise billing',error);return enterpriseJson({error:error instanceof Error?error.message:'Error en Stripe'},503);}
}
