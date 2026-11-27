import {NextRequest,NextResponse} from 'next/server';
import {adminDatabase,authorizedAdmin,sameOrigin} from '@/lib/admin-users';
import {emailReady,unsubscribeToken} from '@/lib/automatic-email';
import {renderEmail} from '@/lib/email-template';
export const dynamic='force-dynamic';
export const maxDuration=60;
const reply=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'no-store'}});
const subscribed=(s:string)=>['active','trialing','past_due','unpaid','incomplete','paused'].includes(s);
const fmt=(s:string)=>new Intl.DateTimeFormat('es-ES',{dateStyle:'long',timeZone:'Europe/Madrid'}).format(new Date(s));
export async function GET(req:NextRequest){
 if(!authorizedAdmin(req))return reply({error:'No autorizado'},401);
 const db=adminDatabase();if(!db)return reply({error:'Base no disponible'},503);
 const [offers,members,profiles,subs,grants,pilots,dispatches]=await Promise.all([
 db.from('tp_subscription_offers').select('*').order('created_at',{ascending:false}),
 db.from('tp_subscription_offer_users').select('*'),db.from('profiles').select('id,name,display_name,created_at,last_jornada_at').limit(10000),
 db.from('tp_driver_subscriptions').select('user_id,status,trial_ends_at,stripe_subscription_id'),db.from('tp_subscription_grants').select('user_id,enabled'),db.from('tp_driver_pilot_access').select('user_id,enabled,pro_access'),db.from('tp_subscription_offer_dispatches').select('*').order('created_at',{ascending:false}).limit(2000)]);
 if([offers,members,profiles,subs,grants,pilots,dispatches].some(x=>x.error))return reply({error:'Error leyendo promociones'},503);
 const blocked=new Set([...(grants.data||[]).filter(g=>g.enabled).map(g=>g.user_id),...(pilots.data||[]).filter(g=>g.enabled&&g.pro_access).map(g=>g.user_id)]);
 return reply({offers:offers.data,members:members.data,users:(profiles.data||[]).map(p=>{const s=subs.data?.find(s=>s.user_id===p.id);return {id:p.id,name:p.display_name||p.name||'Sin nombre',created_at:p.created_at,last_jornada_at:p.last_jornada_at,status:s?.status||null,eligible:!blocked.has(p.id)&&!subscribed(s?.status||'')};}),dispatches:dispatches.data,email_ready:emailReady()});
}
export async function POST(req:NextRequest){
 if(!authorizedAdmin(req)||!sameOrigin(req))return reply({error:'No autorizado'},403);
 const db=adminDatabase();if(!db)return reply({error:'Base no disponible'},503);
 let b:any;try{b=await req.json();}catch{return reply({error:'Solicitud inválida'},400);}
 if(b.action==='create'){
 const users=Array.isArray(b.users)?Array.from(new Set(b.users.filter((u:unknown)=>typeof u==='string'&&/^[a-f0-9-]{36}$/i.test(u)))):[];
 if(!users.length||users.length>500||typeof b.name!=='string'||!b.name.trim()||b.name.length>150||![b.starts,b.ends,b.charge].every(x=>typeof x==='string'&&Number.isFinite(Date.parse(x)))||Date.parse(b.starts)>=Date.parse(b.ends)||Date.parse(b.ends)>Date.parse(b.charge)-172800000||Date.parse(b.ends)<=Date.now())return reply({error:'Revisa destinatarios y fechas. La contratación debe cerrar al menos 48 h antes del cobro.'},400);
 const r=await db.rpc('tp_create_subscription_offer',{p_name:b.name.trim(),p_starts:b.starts,p_ends:b.ends,p_charge:b.charge,p_users:users});
 return r.error?reply({error:'No se pudo crear'},409):reply({id:r.data});
 }
 if(typeof b.id!=='string'||! /^[a-f0-9-]{36}$/i.test(b.id))return reply({error:'Oferta inválida'},400);
 if(b.action==='toggle'&&typeof b.enabled==='boolean'){
 const r=await db.from('tp_subscription_offers').update({enabled:b.enabled,updated_at:new Date().toISOString()}).eq('id',b.id).select('id');
 return r.error||!r.data?.length?reply({error:'No se pudo actualizar'},409):reply({ok:true});
 }
 if(b.action!=='send')return reply({error:'Acción inválida'},400);
 const offer=await db.from('tp_subscription_offers').select('*').eq('id',b.id).single();
 if(offer.error||!offer.data?.enabled||Date.parse(offer.data.starts_at)>Date.now()||Date.parse(offer.data.ends_at)<=Date.now()||Date.parse(offer.data.first_charge_at)-Date.now()<172800000)return reply({error:'La oferta no está disponible para contratar'},409);
 const members=await db.from('tp_subscription_offer_users').select('user_id').eq('offer_id',b.id);
 if(members.error)return reply({error:'No se pudieron leer destinatarios'},503);
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const results:any[]=[];
 const title='Activa tu suscripción sin coste hasta el '+fmt(offer.data.first_charge_at);
 const body='Sigue disfrutando de Tacoplan. Activa tu suscripción hoy y no pagarás nada hasta el '+fmt(offer.data.first_charge_at)+', fecha del primer cobro. Puedes cancelar antes sin coste. Oferta disponible hasta el '+new Date(offer.data.ends_at).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})+'.';
 const data={type:'reminder',button_text:'Activar suscripción',button_url:'https://tacoplan.es/planes',offer_id:b.id};
 for(const {user_id:u} of (members.data||[]).slice(0,500)){
 const [s,g,p,account,pref,tokens]=await Promise.all([db.from('tp_driver_subscriptions').select('status').eq('user_id',u).maybeSingle(),db.from('tp_subscription_grants').select('enabled').eq('user_id',u).maybeSingle(),db.from('tp_driver_pilot_access').select('enabled,pro_access').eq('user_id',u).maybeSingle(),db.auth.admin.getUserById(u),db.from('tp_email_preferences').select('marketing_enabled').eq('user_id',u).maybeSingle(),db.from('push_tokens').select('expo_push_token').eq('user_id',u).eq('notifications_enabled',true)]);
 if([s,g,p,account,pref,tokens].some(r=>r.error)||!account.data?.user||subscribed(s.data?.status||'')||g.data?.enabled||p.data?.enabled&&p.data?.pro_access){results.push({user_id:u,status:'excluded'});continue;}
 const key={offer_id:b.id,user_id:u,send_day:day};
 const claim=await db.from('tp_subscription_offer_dispatches').insert(key);
 if(claim.error){results.push({user_id:u,status:claim.error.code==='23505'?'already_sent':'error'});continue;}
 let internal='failed',push='no_token',email='no_consent';
 const n=await db.from('user_notifications').insert({user_id:u,title,body,type:'reminder',data,button_text:data.button_text,button_url:data.button_url,visibility_mode:'snapshot',push_status:'not_requested',delivered_at:new Date().toISOString()}).select('id').single();
 if(!n.error)internal='created';
 const ts=Array.from(new Set((tokens.data||[]).map(t=>t.expo_push_token).filter(Boolean)));
 if(ts.length){try{const res=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ts.map(to=>({to,title,body,data,sound:'default'})))});const j=await res.json();push=res.ok&&Array.isArray(j.data)&&j.data.some((t:any)=>t.status==='ok')?'sent':'failed';}catch{push='uncertain';}}
 if(n.data?.id)await db.from('user_notifications').update({push_status:push==='sent'?'sent':push==='no_token'?'no_token':'failed'}).eq('id',n.data.id);
 if(pref.data?.marketing_enabled&&account.data.user.email&&account.data.user.email_confirmed_at){email='disabled';if(emailReady()){try{const link='https://www.tacoplan.es/api/email/unsubscribe?token='+encodeURIComponent(unsubscribeToken(u));const message=renderEmail({key:'offer',subject:title,body,commercial:true},link);const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY!.trim(),'Content-Type':'application/json','Idempotency-Key':'offer-'+b.id+'-'+u+'-'+day},body:JSON.stringify({from:process.env.TP_EMAIL_FROM!.trim(),to:[account.data.user.email],subject:title,...message})});const j=await res.json();email=res.ok&&j.id?'accepted':'failed';}catch{email='uncertain';}}}
 await db.from('tp_subscription_offer_dispatches').update({internal_status:internal,push_status:push,email_status:email}).match(key);
 results.push({user_id:u,internal,push,email});
 }
 return reply({results});
}
