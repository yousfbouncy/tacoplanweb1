import {NextRequest,NextResponse} from 'next/server';
import {adminDatabase,authorizedAdmin,sameOrigin} from '@/lib/admin-users';
import {emailReady,unsubscribeToken} from '@/lib/automatic-email';
import {renderEmail} from '@/lib/email-template';
export const dynamic='force-dynamic';
export const maxDuration=60;
const CAMPAIGN='recovery_2027';
const OFFER='7687f712-dfca-4768-9623-6043494f1617';
const reply=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'no-store'}});
const blocked=(s?:string|null)=>['active','trialing','past_due','unpaid','incomplete','paused'].includes(s||'');
export async function GET(req:NextRequest){
 if(!authorizedAdmin(req))return reply({error:'No autorizado'},401);
 const db=adminDatabase();if(!db)return reply({error:'Base no disponible'},503);
 const [d,c,p,s,m,prefs,offer,rule,g,pilots]=await Promise.all([
 db.from('tp_email_dispatches').select('id,user_id,status,created_at,updated_at,provider_id,error_code').eq('rule_key',CAMPAIGN),
 db.from('tp_recovery_email_clicks').select('*'),db.from('profiles').select('id,name,display_name,last_jornada_at').limit(10000),db.from('tp_driver_subscriptions').select('user_id,status,first_paid_at,trial_ends_at'),
 db.from('tp_subscription_offer_users').select('user_id').eq('offer_id',OFFER),db.from('tp_email_preferences').select('user_id,marketing_enabled,consent_at'),
 db.from('tp_subscription_offers').select('enabled,starts_at,ends_at,first_charge_at').eq('id',OFFER).single(),db.from('tp_email_rules').select('enabled,subject,body,commercial').eq('key',CAMPAIGN).single(),
 db.from('tp_subscription_grants').select('user_id,enabled'),db.from('tp_driver_pilot_access').select('user_id,enabled,pro_access')]);
 if([d,c,p,s,m,prefs,offer,rule,g,pilots].some(x=>x.error))return reply({error:'No se pudieron leer datos'},503);
 const rows=(d.data||[]).map(x=>{const profile=p.data?.find(y=>y.id===x.user_id),sub=s.data?.find(y=>y.user_id===x.user_id),clicks=(c.data||[]).filter(y=>y.dispatch_id===x.id);return {...x,name:profile?.display_name||profile?.name||'Sin nombre',clicks,recovered:x.status==='accepted'&&!!profile?.last_jornada_at&&Date.parse(profile.last_jornada_at)>Date.parse(x.updated_at||x.created_at),trial:sub?.status==='trialing'&&!!sub.trial_ends_at&&Date.parse(sub.trial_ends_at)>Date.parse(x.created_at),paid:!!sub?.first_paid_at&&Date.parse(sub.first_paid_at)>Date.parse(x.created_at)};});
 const users=(m.data||[]).map(({user_id:id})=>{const profile=p.data?.find(y=>y.id===id),sub=s.data?.find(y=>y.user_id===id),pref=prefs.data?.find(y=>y.user_id===id),history=rows.filter(x=>x.user_id===id);const consent=!!pref?.marketing_enabled&&!!pref.consent_at;const sent=history.some(x=>x.status==='accepted'||x.status==='claimed');const free=g.data?.some(x=>x.user_id===id&&x.enabled)||pilots.data?.some(x=>x.user_id===id&&x.enabled&&x.pro_access);return {id,name:profile?.display_name||profile?.name||'Sin nombre',last_jornada_at:profile?.last_jornada_at||null,consent,sent,eligible:!!profile&&!sent&&!free&&!blocked(sub?.status),status:sent?'Ya procesado':free||blocked(sub?.status)?'Ya tiene acceso':!consent?'Sin autorización comercial':history.some(x=>x.status==='failed')?'Envío anterior fallido':'Pendiente'};}).sort((a,b)=>a.name.localeCompare(b.name,'es'));
 const available=!!offer.data?.enabled&&!!rule.data?.enabled&&rule.data.commercial===true&&Date.parse(offer.data.starts_at)<=Date.now()&&Date.parse(offer.data.ends_at)>Date.now();
 return reply({rows,users,ready:emailReady()&&available,subject:rule.data?.subject,body:rule.data?.body});
}
export async function POST(req:NextRequest){
 if(!authorizedAdmin(req)||!sameOrigin(req))return reply({error:'No autorizado'},403);
 const db=adminDatabase();if(!db||!emailReady())return reply({error:'Proveedor no disponible'},503);
 let b:any;try{b=await req.json();}catch{return reply({error:'Solicitud incorrecta'},400);}
 const users:string[]=Array.isArray(b.users)?Array.from(new Set<string>(b.users.filter((x:unknown)=>typeof x==='string'&&/^[a-f0-9-]{36}$/i.test(x)))):[];
 if(!users.length||users.length>20)return reply({error:'Selecciona entre 1 y 20 usuarios por envío'},400);
 const [offer,rule]=await Promise.all([db.from('tp_subscription_offers').select('*').eq('id',OFFER).single(),db.from('tp_email_rules').select('*').eq('key',CAMPAIGN).single()]);
 if(offer.error||rule.error||!offer.data?.enabled||!rule.data?.enabled||!rule.data.commercial||Date.parse(offer.data.starts_at)>Date.now()||Date.parse(offer.data.ends_at)<=Date.now()||Date.parse(offer.data.first_charge_at)-Date.now()<172800000)return reply({error:'Campaña no disponible'},409);
 const results:{id:string;status:string}[]=[];
 for(const id of users){
 const [m,pref,account,sub,grant,pilot,history]=await Promise.all([db.from('tp_subscription_offer_users').select('user_id').eq('offer_id',OFFER).eq('user_id',id).maybeSingle(),db.from('tp_email_preferences').select('marketing_enabled,consent_at').eq('user_id',id).maybeSingle(),db.auth.admin.getUserById(id),db.from('tp_driver_subscriptions').select('status').eq('user_id',id).maybeSingle(),db.from('tp_subscription_grants').select('enabled').eq('user_id',id).maybeSingle(),db.from('tp_driver_pilot_access').select('enabled,pro_access').eq('user_id',id).maybeSingle(),db.from('tp_email_dispatches').select('status,error_code').eq('user_id',id).eq('rule_key',CAMPAIGN)]);
 const user=account.data?.user;
 if([m,pref,account,sub,grant,pilot,history].some(x=>x.error)||!m.data||!user?.email||!user.email_confirmed_at||blocked(sub.data?.status)||grant.data?.enabled||pilot.data?.enabled&&pilot.data.pro_access){results.push({id,status:'No elegible'});continue;}
 if(!pref.data?.marketing_enabled||!pref.data?.consent_at){results.push({id,status:'Sin autorización comercial'});continue;}
 if(history.data?.some(x=>x.status==='accepted'||x.status==='claimed'||x.error_code==='transport_uncertain_no_retry')){results.push({id,status:'Ya procesado'});continue;}
 const claim=await db.rpc('tp_claim_recovery_manual',{p_user:id,p_offer:OFFER});
 if(claim.error||!claim.data){results.push({id,status:'No disponible o ya procesado'});continue;}
 const dispatch=String(claim.data),url='https://www.tacoplan.es/api/email/unsubscribe?token='+encodeURIComponent(unsubscribeToken(id));
 const plan='https://www.tacoplan.es/api/email/click?id='+dispatch+'&action=plan',help='https://www.tacoplan.es/api/email/click?id='+dispatch+'&action=help';
 const message=renderEmail({key:'offer',subject:rule.data.subject,body:rule.data.body,commercial:true},url);
 const html=message.html.replace('href="https://www.tacoplan.es/planes"','href="'+plan+'&amp;unused=1"').replace('</body>','<p style="text-align:center"><a href="'+help.replace('&','&amp;')+'">Ayuda por WhatsApp</a></p></body>').replace('&amp;unused=1','');
 try{const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY!.trim(),'Content-Type':'application/json','Idempotency-Key':dispatch},body:JSON.stringify({from:process.env.TP_EMAIL_FROM!.trim(),to:[user.email],subject:rule.data.subject,html,text:message.text.replace('https://www.tacoplan.es/planes',plan)+'\nAyuda por WhatsApp: '+help,headers:{'List-Unsubscribe':'<'+url+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}})});const j=await res.json();const ok=res.ok&&!!j.id;await db.from('tp_email_dispatches').update({status:ok?'accepted':'failed',provider_id:ok?j.id:null,error_code:ok?null:'provider_http_'+res.status,updated_at:new Date().toISOString()}).eq('id',dispatch);results.push({id,status:ok?'Aceptado por Resend':'Rechazado por Resend'});}catch{await db.from('tp_email_dispatches').update({status:'failed',error_code:'transport_uncertain_no_retry',updated_at:new Date().toISOString()}).eq('id',dispatch);results.push({id,status:'Resultado incierto'});}
 }
 return reply({results});
}
