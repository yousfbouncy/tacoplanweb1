import {NextRequest,NextResponse} from 'next/server';
import {adminDatabase} from '@/lib/admin-users';
import {validatePlanConfig,type FeatureKey} from '@/lib/plan-policy';
import {calculateTimedFreeFeatures,trialEligibility,type LaunchMap} from '@/lib/feature-entitlements';
import {dueMoment,featureNotice,FEATURE_LABELS} from '@/lib/feature-plan-notifications';
export const dynamic='force-dynamic';
export const maxDuration=60;
const json=(x:unknown,status=200)=>NextResponse.json(x,{status,headers:{'Cache-Control':'no-store'}});
type Candidate={userId:string;feature:FeatureKey;key:string;title:string;body:string;tokens:string[];daysLeft:number;batch?:Candidate[]};
const isToken=(x:unknown):x is string=>typeof x==='string'&&/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(x);
export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get('authorization')!=='Bearer '+secret)return json({error:'No autorizado'},401);
 const db=adminDatabase();if(!db)return json({error:'Database unavailable'},503);
 const [runtime,policy,launches,profiles,subs,history,grants,pilots,tokens,events]=await Promise.all([
  db.from('tp_subscription_runtime').select('restrictions_enabled,billing_enabled').eq('id',1).single(),
  db.from('tp_plan_policies').select('published_config').eq('slug','free').single(),
  db.from('tp_free_feature_launches').select('feature_key,first_started_at'),
  db.from('profiles').select('id,created_at,notifications_enabled,push_reminders_enabled').range(0,999),
  db.from('tp_driver_subscriptions').select('user_id,status,trial_used,trial_ends_at').range(0,999),
  db.from('tp_driver_trial_history').select('user_id').range(0,999),
  db.from('tp_subscription_grants').select('user_id,enabled,plan').range(0,999),
  db.from('tp_driver_pilot_access').select('user_id,enabled,pro_access').range(0,999),
  db.from('push_tokens').select('user_id,expo_push_token,notifications_enabled').eq('notifications_enabled',true).range(0,1999),
  db.from('tp_feature_notification_events').select('user_id,feature_key,event_key').range(0,4999)
 ]);
 const results=[runtime,policy,launches,profiles,subs,history,grants,pilots,tokens,events];
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
 const notices:Candidate[]=[];
 for(const profile of profiles.data||[]){
  if(profile.notifications_enabled===false||profile.push_reminders_enabled===false)continue;
  const sub=bySub.get(profile.id);
  if(['active','trialing'].includes(sub?.status||''))continue;
  const grant=byGrant.get(profile.id),pilot=byPilot.get(profile.id);
  if(grant?.enabled===true||pilot?.enabled===true&&pilot.pro_access===true)continue;
  const status=calculateTimedFreeFeatures(free,launchMap,profile.created_at,now);
  const trialAvailable=runtime.data.billing_enabled===true&&trialEligibility(sub||null,used.has(profile.id),1);
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
  // One message per driver per day avoids flooding drivers when several free
  // limits are published simultaneously.
  if(userNotices.length){
   userNotices.sort((a,b)=>a.daysLeft-b.daysLeft);
   const primary=userNotices[0];
   if(userNotices.length===1)notices.push(primary);
   else {
    const details=userNotices.map(x=>FEATURE_LABELS[x.feature]+': '+(x.daysLeft===0?'plazo terminado':x.daysLeft+' días restantes')).join(' · ');
    notices.push({...primary,batch:userNotices,title:'Tus funciones gratuitas en Tacoplan',
     body:details+'. '+(trialAvailable?'Tienes una prueba gratuita de Plus o Pro disponible.':'Consulta los planes Plus y Pro para seguir usando las funciones.')});
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
   data:{source:'feature_limit',feature:n.feature,event:n.key}
  });
  if(!inbox.error)internal++;
  let pushState='no_token';
  if(n.tokens.length){
   try{
    const push=await fetch('https://exp.host/--/api/v2/push/send',{
     method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
     body:JSON.stringify(n.tokens.map(to=>({to,title:n.title,body:n.body,sound:'default',
      data:{type:'plan',feature:n.feature,url:'https://tacoplan.es/planes'}})))
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
