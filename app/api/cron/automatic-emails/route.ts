import {NextRequest,NextResponse} from 'next/server';
import {adminDatabase} from '@/lib/admin-users';
import {renderEmail} from '@/lib/email-template';
import {emailReady,unsubscribeToken} from '@/lib/automatic-email';
export const dynamic='force-dynamic';
export const maxDuration=60;
const reply=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:NextRequest){
 if(!process.env.CRON_SECRET||req.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return reply({error:'No autorizado'},401);
 if(!emailReady())return reply({ok:true,skipped:'email_provider_not_enabled'});
 const db=adminDatabase();if(!db)return reply({error:'Database unavailable'},503);
 const candidates=await db.rpc('tp_email_candidates');if(candidates.error)return reply({error:'Candidate query failed'},503);
 let accepted=0,failed=0,skipped=0;
 for(const c of candidates.data||[]){
  const [account,rule]=await Promise.all([db.auth.admin.getUserById(c.user_id),db.from('tp_email_rules').select('*').eq('key',c.rule_key).maybeSingle()]);
  const user=account.data?.user,r=rule.data;
  if(account.error||rule.error||!user?.email||!user.email_confirmed_at||!r?.enabled){skipped++;continue;}
  if(c.rule_key==='checkout_abandoned'){
   const key=process.env.STRIPE_SECRET_KEY;if(!key){skipped++;continue;}
   try{const res=await fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(c.event_key),{headers:{Authorization:'Bearer '+key},cache:'no-store'});const s=await res.json();if(!res.ok||s.client_reference_id!==c.user_id||s.status!=='expired'){skipped++;continue;}}catch{skipped++;continue;}
  }
  if(['checkout_abandoned','offer','trial_ended','payment_failed','trial_ending','subscribed'].includes(c.rule_key)){
   const sub=await db.from('tp_driver_subscriptions').select('status,payment_failed_at,first_paid_at,trial_ends_at').eq('user_id',c.user_id).maybeSingle();
   if(sub.error){skipped++;continue;}
   const status=sub.data?.status||'';
   if(['checkout_abandoned','offer','trial_ended'].includes(c.rule_key)&&['active','trialing','past_due','unpaid','incomplete'].includes(status)){skipped++;continue;}
   if(c.rule_key==='payment_failed'&&(!['past_due','unpaid','incomplete'].includes(status)||!sub.data?.payment_failed_at)){skipped++;continue;}
   if(c.rule_key==='trial_ending'&&status!=='trialing'||c.rule_key==='subscribed'&&status!=='active'){skipped++;continue;}
  }
  const claim=await db.rpc('tp_claim_email',{p_user:c.user_id,p_rule:c.rule_key,p_event:c.event_key});
  if(claim.error||!claim.data){skipped++;continue;}
  const id=String(claim.data);
  try{
   const url='https://www.tacoplan.es/api/email/unsubscribe?token='+encodeURIComponent(unsubscribeToken(c.user_id));
   const message=renderEmail(r,url);
   const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({from:process.env.TP_EMAIL_FROM,to:[user.email],subject:r.subject,...message,...(r.commercial?{headers:{'List-Unsubscribe':'<'+url+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}}:{})})});
   const result=await res.json();
   if(!res.ok||!result.id){await db.from('tp_email_dispatches').update({status:'failed',error_code:'provider_http_'+res.status,updated_at:new Date().toISOString()}).eq('id',id);failed++;continue;}
   const saved=await db.from('tp_email_dispatches').update({status:'accepted',provider_id:result.id,updated_at:new Date().toISOString()}).eq('id',id);
   if(saved.error){failed++;continue;}accepted++;
  }catch{await db.from('tp_email_dispatches').update({status:'failed',error_code:'transport_uncertain_no_retry',updated_at:new Date().toISOString()}).eq('id',id);failed++;}
 }
 return reply({ok:true,accepted,failed,skipped});
}
