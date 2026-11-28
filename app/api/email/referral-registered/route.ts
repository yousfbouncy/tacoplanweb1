import {NextRequest,NextResponse} from 'next/server';
import crypto from 'crypto';
import {adminDatabase} from '@/lib/admin-users';
import {renderEmail} from '@/lib/email-template';
import {emailReady} from '@/lib/automatic-email';
export const dynamic='force-dynamic';
export const maxDuration=30;
const reply=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private,no-store'}});
const euro=(c:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:c%100===0?0:2}).format(c/100);
const firstName=(metadata:Record<string,any>|undefined,fallback:string)=>String(metadata?.name||metadata?.full_name||fallback).trim().split(/\s+/)[0].slice(0,60)||fallback;
export async function POST(req:NextRequest){
 const secret=process.env.TP_WELCOME_WEBHOOK_SECRET;
 const a=Buffer.from(req.headers.get('authorization')||''),b=Buffer.from('Bearer '+(secret||''));
 if(!secret||a.length!==b.length||!crypto.timingSafeEqual(a,b))return reply({error:'Unauthorized'},401);
 if(!emailReady())return reply({status:'disabled'});
 const db=adminDatabase();if(!db)return reply({error:'Database unavailable'},503);
 let body:any;try{body=await req.json();}catch{return reply({error:'Invalid body'},400);}
 if(typeof body?.referred_user_id!=='string'||!/^[a-f0-9-]{36}$/i.test(body.referred_user_id))return reply({error:'Invalid user'},400);
 const [attr,config]=await Promise.all([db.from('tp_referral_attributions').select('referrer_user_id,referred_user_id').eq('referred_user_id',body.referred_user_id).maybeSingle(),db.from('tp_referral_config').select('*').eq('id',true).single()]);
 if(attr.error||config.error)return reply({error:'Query failed'},503);
 if(!attr.data||!config.data?.enabled)return reply({status:'ineligible'});
 const [owner,ref]=await Promise.all([db.auth.admin.getUserById(attr.data.referrer_user_id),db.auth.admin.getUserById(attr.data.referred_user_id)]);
 const u=owner.data?.user,v=ref.data?.user,c=config.data;
 if(owner.error||ref.error||!u?.email||!u.email_confirmed_at||!v)return reply({status:'ineligible'});
 const name=firstName(u.user_metadata,'conductor'),referred=firstName(v.user_metadata,'Un conductor');
 const claim=await db.rpc('tp_claim_referral_notice',{p_referred:v.id});
 if(claim.error)return reply({error:'Claim failed'},503);
 if(!claim.data)return reply({status:'already_processed'});
 const id=String(claim.data);
 const rule={key:'referral_registered',commercial:false,subject:'Tacoplan | Tienes un nuevo referido, '+name,body:
 'Hola, '+name+':\n\n'+referred+' se ha registrado en Tacoplan y ya forma parte de tu lista de referidos.\n\n¿Cuáles son las recompensas previstas?\n• '+euro(c.monthly_cents)+' si contrata una suscripción mensual a Tacoplan Pro.\n• '+euro(c.annual_cents)+' si contrata una suscripción anual.\nLa comisión se prevé una sola vez, tras el primer pago y con '+c.hold_days+' días de validación.\n\nPremio de captación: al alcanzar '+c.milestone_count+' referidos con suscripción confirmada, se prevé un premio adicional de '+euro(c.milestone_cents)+'.\n\nPremio de fidelización: cuando al menos '+c.loyalty_min_count+' referidos mantengan la suscripción durante 12 meses consecutivos, se prevén '+euro(c.loyalty_cents)+' por cada referido que cumpla esa condición.\n• '+c.loyalty_min_count+' fidelizados: '+euro(c.loyalty_min_count*c.loyalty_cents)+'.\n• '+(c.loyalty_min_count*2)+' fidelizados: '+euro(c.loyalty_min_count*2*c.loyalty_cents)+'.\n• '+(c.loyalty_min_count*4)+' fidelizados: '+euro(c.loyalty_min_count*4*c.loyalty_cents)+'.\n\nEl programa está actualmente en fase piloto. Estos importes son previsiones sujetas al lanzamiento definitivo y a sus condiciones; todavía no son saldo disponible ni existe derecho a retirada.\n\nConsulta el registro y las condiciones de tu programa en tu perfil de referidos.'};
 try{
  const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY!.trim(),'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({from:process.env.TP_EMAIL_FROM!.trim(),to:[u.email],subject:rule.subject,...renderEmail(rule,'')})});
  const result=await res.json();
  if(!res.ok||!result.id){await db.from('tp_referral_email_notices').update({status:'failed',error_code:'provider_http_'+res.status,updated_at:new Date().toISOString()}).eq('id',id);return reply({status:'failed',provider_status:res.status},502);}
  const saved=await db.from('tp_referral_email_notices').update({status:'accepted',provider_id:result.id,updated_at:new Date().toISOString()}).eq('id',id);
  if(saved.error)return reply({status:'accepted_unrecorded'},503);
  return reply({status:'accepted'});
 }catch{await db.from('tp_referral_email_notices').update({status:'failed',error_code:'transport_uncertain_no_retry',updated_at:new Date().toISOString()}).eq('id',id);return reply({status:'uncertain'},502);}
}
