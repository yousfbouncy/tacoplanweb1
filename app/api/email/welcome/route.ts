import {NextRequest,NextResponse} from 'next/server';
import crypto from 'crypto';
import {adminDatabase} from '@/lib/admin-users';
import {renderEmail} from '@/lib/email-template';
import {emailReady} from '@/lib/automatic-email';
export const dynamic='force-dynamic';
export const maxDuration=30;
const reply=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:NextRequest){
 const secret=process.env.TP_WELCOME_WEBHOOK_SECRET;
 const a=Buffer.from(req.headers.get('authorization')||''),b=Buffer.from('Bearer '+(secret||''));
 if(!secret||a.length!==b.length||!crypto.timingSafeEqual(a,b))return reply({error:'Unauthorized'},401);
 if(!emailReady())return reply({status:'disabled'});
 const db=adminDatabase();if(!db)return reply({error:'Database unavailable'},503);
 let body:any;try{body=await req.json();}catch{return reply({error:'Invalid body'},400);}
 if(typeof body?.user_id!=='string'||!/^[a-f0-9-]{36}$/i.test(body.user_id))return reply({error:'Invalid user'},400);
 const [account,rule]=await Promise.all([db.auth.admin.getUserById(body.user_id),db.from('tp_email_rules').select('*').eq('key','welcome').maybeSingle()]);
 const user=account.data?.user,r=rule.data;
 if(account.error||rule.error||!user?.email||!user.email_confirmed_at||!r?.enabled||r.commercial||Date.now()-Date.parse(user.created_at)>7*86400000)return reply({status:'ineligible'});
 const claim=await db.rpc('tp_claim_welcome_email',{p_user:user.id});
 if(claim.error)return reply({error:'Claim failed'},503);
 if(!claim.data)return reply({status:'already_processed'});
 const id=String(claim.data);
 try{
  const message=renderEmail(r,'');
  const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY!.trim(),'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({from:process.env.TP_EMAIL_FROM!.trim(),to:[user.email],subject:r.subject,...message})});
  const result=await res.json();
  if(!res.ok||!result.id){
   const code='provider_http_'+res.status;
   await db.from('tp_email_dispatches').update({status:'failed',error_code:code,updated_at:new Date().toISOString()}).eq('id',id);
   const detail=String(result.message||'').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').slice(0,300);
   console.warn('Welcome provider rejection',res.status,String(result.name||'').slice(0,80),detail);
   return reply({status:'failed',provider_status:res.status,code:String(result.name||'unknown').slice(0,80),detail},502);
  }
  const saved=await db.from('tp_email_dispatches').update({status:'accepted',provider_id:result.id,updated_at:new Date().toISOString()}).eq('id',id);
  if(saved.error)return reply({status:'accepted_unrecorded'},503);
  return reply({status:'accepted'});
 }catch{await db.from('tp_email_dispatches').update({status:'failed',error_code:'transport_uncertain_no_retry',updated_at:new Date().toISOString()}).eq('id',id);return reply({status:'uncertain'},502);}
}
