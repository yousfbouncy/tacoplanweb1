import {NextRequest,NextResponse} from 'next/server';
import {adminDatabase} from '@/lib/admin-users';
import {validatePlanConfig,FEATURE_KEYS,type FeatureKey} from '@/lib/plan-policy';
import {calculateTimedFreeFeatures,trialEligibility,type LaunchMap} from '@/lib/feature-entitlements';
import {dueMoment,featureNotice,FEATURE_LABELS} from '@/lib/feature-plan-notifications';
export const dynamic='force-dynamic';
export const maxDuration=60;
const json=(x:unknown,status=200)=>NextResponse.json(x,{status,headers:{'Cache-Control':'no-store'}});
type Candidate={userId:string;feature:FeatureKey|'policy'|'trial';key:string;title:string;body:string;tokens:string[];daysLeft:number;batch?:Candidate[]};
const isToken=(x:unknown):x is string=>typeof x==='string'&&/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(x);
export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get('authorization')!=='Bearer '+secret)return json({error:'No autorizado'},401);
 const db=adminDatabase();if(!db)return json({error:'Database unavailable'},503);
 const [runtime,policy,launches,profiles,subs,history,grants,pilots,tokens,events,noticesRuntime,catalog,overrides,manualTrialNotices]=await Promise.all([
  db.from('tp_subscription_runtime').select('restrictions_enabled,billing_enabled').eq('id',1).single(),
  db.from('tp_plan_policies').select('published_config,published_at,version').eq('slug','free').single(),
  db.from('tp_free_feature_launches').select('feature_key,first_started_at'),
  db.from('profiles').select('id,created_at,notifications_enabled,push_reminders_enabled').range(0,999),
  db.from('tp_driver_subscriptions').select('user_id,status,trial_used,trial_ends_at,first_paid_at,payment_failed_at').range(0,999),
  db.from('tp_driver_trial_history').select('user_id').range(0,999),
  db.from('tp_subscription_grants').select('user_id,enabled,plan').range(0,999),
  db.from('tp_driver_pilot_access').select('user_id,enabled,pro_access').range(0,999),
  db.from('push_tokens').select('user_id,expo_push_token,notifications_enabled').eq('notifications_enabled',true).range(0,1999),
  db.from('tp_feature_notification_events').select('user_id,feature_key,event_key').range(0,4999),
  db.from('tp_feature_notification_runtime').select('activated_at').eq('id',1).single(),
  db.from('tp_subscription_price_catalog').select('trial_days').eq('plan','pro'),
  db.from('tp_driver_trial_overrides').select('user_id,trial_mode').range(0,999),
  db.from('user_notifications').select('user_id').eq('title','Tu periodo de prueba ha finalizado').range(0,999)
 ]);
 const results=[runtime,policy,launches,profiles,subs,history,grants,pilots,tokens,events,noticesRuntime,catalog,overrides,manualTrialNotices];
 if(results.some(r=>r.error)){console.error('Feature reminder source failure',results.filter(r=>r.error).map(r=>r.error?.message));return json({error:'No se pudieron comprobar todos los permisos'},503);}
 if(runtime.data?.restrictions_enabled!==true)return json({ok:true,skipped:'restrictions_disabled'});
 const free=validatePlanConfig('free',policy.data?.published_config);
 if(!free)return json({error:'Invalid policy'},503);
 const launchMap:LaunchMap=Object.fromEntries((launches.data||[]).map(x=>[x.feature_key,x.first_started_at]));
 const used=new Set((history.data||[]).map(x=>x.user_id));
 const bySub=new Map((subs.data||[]).map(x=>[x.user_id,x]));
 const byGrant=new Map((grants.data||[]).map(x=>[x.user_id,x]));
 const byPilot=new Map((pilots.data||[]).map(x=>[x.user_id,x]));
 const byTokens=new Map<string,string[]>();
 for(const token of tokens.data||[]){
  if(!isToken(token.expo_push_token))continue;
  byTokens.set(token.user_id,[...(byTokens.get(token.user_id)||[]),token.expo_push_token]);
 }
 const dispatched=new Set((events.data||[]).map(e=>e.user_id+'|'+e.feature_key+'|'+e.event_key));
 const now=Date.now();
 const publication=Date.parse(policy.data?.published_at||'');
 const activated=Date.parse(noticesRuntime.data?.activated_at||'');
 const publishedRecently=Number.isFinite(publication)&&Number.isFinite(activated)&&publication>=activated&&now-publication>=0&&now-publication<=72*3600000;
 const advertisedTrialDays=Math.max(0,...(catalog.data||[]).map(p=>Number(p.trial_days)||0));
 const notices:Candidate[]=[];
 const overrideByUser=new Map((overrides.data||[]).map(x=>[x.user_id,x.trial_mode]));
 const manualTrialUsers=new Set((manualTrialNotices.data||[]).map(x=>x.user_id));
 // Use the same workday-based trial rule as checkout, not account creation.
 const eligibleProfiles=(profiles.data||[]).filter(p=>{
  const sub=bySub.get(p.id),grant=byGrant.get(p.id),pilot=byPilot.get(p.id);
  const grace=sub?.status==='past_due'&&!!sub.first_paid_at&&now-Date.parse(sub.payment_failed_at||'')<72*3600000;
  return p.notifications_enabled!==false&&p.push_reminders_enabled!==false&&!['active','trialing'].includes(sub?.status||'')&&!grace&&!grant?.enabled&&!(pilot?.enabled&&pilot.pro_access);
 });
 const experienced=new Set<string>();
 for(let i=0;i<eligibleProfiles.length;i+=20){
  const batch=await Promise.all(eligibleProfiles.slice(i,i+20).map(async p=>({id:p.id,result:await db.rpc('tp_driver_trial_activity',{p_user_id:p.id})})));
  for(const {id,result} of batch){
   if(result.error)return json({error:'No se pudo comprobar la antigüedad de jornadas'},503);
   const activity=result.data?.[0];
   if(Number(activity?.distinct_jornada_days||0)>=2&&Number(activity?.activity_span_days||0)>=30)experienced.add(id);
  }
 }
 for(const profile of profiles.data||[]){
  if(profile.notifications_enabled===false||profile.push_reminders_enabled===false)continue;
  const sub=bySub.get(profile.id);
  if(['active','trialing'].includes(sub?.status||'')||(sub?.status==='past_due'&&sub.first_paid_at&&now-Date.parse(sub.payment_failed_at||'')<72*3600000))continue;
  const grant=byGrant.get(profile.id),pilot=byPilot.get(profile.id);
  if(grant?.enabled===true||pilot?.enabled===true&&pilot.pro_access===true)continue;
  const status=calculateTimedFreeFeatures(free,launchMap,profile.created_at,now);
  const trialMode=overrideByUser.get(profile.id);
  const activityExpired=experienced.has(profile.id)&&trialMode!=='allowed';
  const trialDisabled=trialMode==='disabled'||activityExpired;
  const trialAvailable=runtime.data.billing_enabled===true&&!trialDisabled&&trialEligibility(sub||null,used.has(profile.id),advertisedTrialDays);
  if(runtime.data.billing_enabled===true&&activityExpired&&!sub?.first_paid_at&&!manualTrialUsers.has(profile.id)&&!dispatched.has(profile.id+'|trial|activity_30_days')){
   notices.push({userId:profile.id,feature:'trial',key:'activity_30_days',title:'Tu periodo de prueba ha finalizado',
    body:'Han pasado al menos 30 días desde que comenzaste a registrar jornadas en Tacoplan. Consulta los planes disponibles para seguir disfrutando de todas las funciones. Tu historial y tus jornadas se conservarán.',
    tokens:Array.from(new Set(byTokens.get(profile.id)||[])),daysLeft:0});
  }
  const userNotices:Candidate[]=[];
  for(const [key,feature] of Object.entries(status.feature_status)){
   if(!feature.limited||!feature.expires_at)continue;
   const days=feature.days_left||0;
   const launch=Date.parse(launchMap[key as FeatureKey]||'');
   const account=Date.parse(profile.created_at||'');
   const elapsed=now-Math.max(launch,account);
   const moment=dueMoment(days,elapsed);
   if(!moment)continue;
   const eventKey=moment;const dedupe=profile.id+'|'+key+'|'+eventKey;
   if(dispatched.has(dedupe))continue;
   const msg=featureNotice(key as FeatureKey,moment,days,trialAvailable);
   userNotices.push({userId:profile.id,feature:key as FeatureKey,key:eventKey,
    title:msg.title,body:msg.body,tokens:Array.from(new Set(byTokens.get(profile.id)||[])),daysLeft:days});
  }
  // Announce the complete published Free plan once, including unlimited
  // functions, finite windows, and the true remaining trial eligibility.
  const announcementKey='v'+String(policy.data?.version||0);
  if(publishedRecently&&!dispatched.has(profile.id+'|policy|'+announcementKey)){
   const available=FEATURE_KEYS.filter(key=>status.features[key]).map(key=>{
    const days=status.feature_status[key];
    return FEATURE_LABELS[key]+(days.limited?' ('+days.days_left+' días restantes)':'');
   });
   const expired=FEATURE_KEYS.filter(key=>status.feature_status[key].expired).map(key=>FEATURE_LABELS[key]);
   const blocked=FEATURE_KEYS.filter(key=>!status.features[key]&&!status.feature_status[key].expired).map(key=>FEATURE_LABELS[key]);
   const parts=[
    'Gratis incluye: '+(available.join(', ')||'acceso básico'),
    expired.length?'Ya finalizaron: '+expired.join(', '):'',
    blocked.length?'No incluidas: '+blocked.join(', '):'',
    trialAvailable?'Aún tienes una prueba gratuita de '+advertisedTrialDays+' días de Pro.':'Consulta Pro si necesitas funciones adicionales.'
   ].filter(Boolean);
   const notice:Candidate={userId:profile.id,feature:'policy',key:announcementKey,
    title:'Tus funciones disponibles en Tacoplan',body:parts.join('. ')+'.',
    tokens:Array.from(new Set(byTokens.get(profile.id)||[])),daysLeft:0};
   notices.push({...notice,batch:[notice,...userNotices]});
   continue;
  }
  // One message per driver per day avoids flooding drivers when several free
  // limits are published simultaneously.
  if(userNotices.length){
   userNotices.sort((a,b)=>a.daysLeft-b.daysLeft);
   const primary=userNotices[0];
   if(userNotices.length===1)notices.push(primary);
   else {
    const details=userNotices.map(x=>FEATURE_LABELS[x.feature as FeatureKey]+': '+(x.daysLeft===0?'plazo terminado':x.daysLeft+' días restantes')).join(' · ');
    notices.push({...primary,batch:userNotices,title:'Tus funciones gratuitas en Tacoplan',
     body:details+'. '+(trialAvailable?'Tienes una prueba gratuita de Pro disponible.':'Consulta el plan Pro para seguir usando las funciones.')});
   }
  }
 }
 let internal=0,accepted=0,failed=0,skipped=0;
 for(const n of notices){
  const claimed:Candidate[]=[];
  for(const pending of n.batch||[n]){
   const claim=await db.from('tp_feature_notification_events').insert({
     user_id:pending.userId,feature_key:pending.feature,event_key:pending.key,push_status:'pending'
   });
   if(claim.error){
    if(claim.error.code==='23505'){skipped++;continue;}
    return json({error:'Could not secure notification log',internal,accepted,failed},503);
   }
   claimed.push(pending);
  }
  if(claimed.length===0)continue;
  const inbox=await db.from('user_notifications').insert({
   user_id:n.userId,type:'system',title:n.title,body:n.body,
   button_text:'Ver planes',button_url:'https://tacoplan.es/planes',
   data:{source:n.feature==='trial'?'trial_activity':'feature_limit',feature:n.feature,event:n.key,button_text:'Ver planes',button_url:'https://tacoplan.es/planes'}
  });
  if(inbox.error){
   for(const c of claimed)await db.from('tp_feature_notification_events').delete().eq('user_id',c.userId).eq('feature_key',c.feature).eq('event_key',c.key);
   return json({error:'No se pudo guardar el aviso',internal,accepted,failed,skipped},503);
  }
  internal++;
  let pushState='no_token';
  if(n.tokens.length){
   try{
    const push=await fetch('https://exp.host/--/api/v2/push/send',{
     method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
     body:JSON.stringify(n.tokens.map(to=>({to,title:n.title,body:n.body,sound:'default',
      data:{type:'plan',feature:n.feature,url:'https://tacoplan.es/planes',button_text:'Ver planes',button_url:'https://tacoplan.es/planes'}})))
    });
    if(!push.ok)throw Error('Expo push HTTP '+push.status);
    const j=await push.json();
    const tickets=Array.isArray(j.data)?j.data:[j.data];
    const count=tickets.filter((x:{status?:string})=>x?.status==='ok').length;
    accepted+=count;failed+=n.tokens.length-count;pushState=count>0?'accepted':'failed';
   }catch(error){console.error('Plan push error',error);failed+=n.tokens.length;pushState='failed';}
  }
  for(const c of claimed){
   await db.from('tp_feature_notification_events').update({push_status:pushState})
    .eq('user_id',c.userId).eq('feature_key',c.feature).eq('event_key',c.key);
  }
 }
 return json({ok:true,processed:notices.length,internal,accepted,failed,skipped});
}
