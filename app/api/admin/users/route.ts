import { NextRequest, NextResponse } from 'next/server';
import { adminDatabase, authorizedAdmin, classifyInactivity, daysSince, reminderMessage, ADMIN_REMINDER_SOURCE, InactivityReason } from '@/lib/admin-users';

export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 if(!authorizedAdmin(req))return NextResponse.json({error:'No autorizado'},{status:401});
 const db=adminDatabase();
 if(!db)return NextResponse.json({error:'Falta SUPABASE_SERVICE_ROLE_KEY en Vercel'},{status:503});
 try {
  const [profiles,devices,tokens,prior,members,companies]=await Promise.all([
   db.from('profiles').select('id,name,display_name,created_at,onboarding_completed,base_name,base_city,payroll_config,notifications_enabled,push_reminders_enabled,last_inactivity_notification_sent_at').order('created_at',{ascending:false}).limit(5000),
   db.from('app_user_devices').select('user_id,last_seen_at').limit(5000),
   db.from('push_tokens').select('user_id').eq('notifications_enabled',true).like('expo_push_token','ExponentPushToken[%').limit(5000),
   db.from('admin_notification_logs').select('target_user_id,created_at').eq('source',ADMIN_REMINDER_SOURCE).order('created_at',{ascending:false}).limit(5000),
   db.from('tp_company_members').select('user_id,company_id,role').eq('active',true).limit(5000),
   db.from('tp_companies').select('id,name').limit(5000)
  ]);
  for(const r of [profiles,devices,tokens,prior,members,companies])if(r.error)throw r.error;
  const journeys:Array<{user_id:string;created_at:string}>=[];
  for(let i=0;i<10;i++){
   const result=await db.from('jornadas').select('user_id,created_at').order('created_at',{ascending:false}).range(i*1000,(i+1)*1000-1);
   if(result.error)throw result.error;
   journeys.push(...(result.data||[]));
   if((result.data||[]).length<1000)break;
  }
  const companyNames=new Map((companies.data||[]).map(c=>[c.id,c.name]));
  const companyByUser=new Map<string,Array<{name:string;role:string}>>();
  for(const m of members.data||[]){const current=companyByUser.get(m.user_id)||[];current.push({name:companyNames.get(m.company_id)||'Empresa',role:m.role});companyByUser.set(m.user_id,current);}
  const byUser=new Map<string,{count:number;last:string|null}>();
  for(const j of journeys){const x=byUser.get(j.user_id)||{count:0,last:null};x.count++;if(!x.last||j.created_at>x.last)x.last=j.created_at;byUser.set(j.user_id,x);}
  const lastSeen=new Map<string,string>();
  for(const d of devices.data||[]){if(d.last_seen_at && (!lastSeen.has(d.user_id)||d.last_seen_at>lastSeen.get(d.user_id)!))lastSeen.set(d.user_id,d.last_seen_at);}
  const withPush=new Set((tokens.data||[]).map(t=>t.user_id));
  const lastManual=new Map<string,string>();
  for(const n of prior.data||[]){if(n.target_user_id&&!lastManual.has(n.target_user_id))lastManual.set(n.target_user_id,n.created_at);}
  const now=Date.now();
  const users=(profiles.data||[]).map(p=>{
   const j=byUser.get(p.id)||{count:0,last:null};
   const status=classifyInactivity(j.count,p.created_at,j.last,now);
   const lastReminder=[lastManual.get(p.id),p.last_inactivity_notification_sent_at].filter(Boolean).sort().reverse()[0]||null;
   const canNotify=(status==='zero_jornadas'||status==='stopped_registering')
    && p.push_reminders_enabled!==false && p.notifications_enabled!==false
    && (!lastReminder || now-new Date(lastReminder).getTime()>=7*86_400_000);
   const reason=status==='zero_jornadas'||status==='stopped_registering'?status:null;
   const msg=reason?reminderMessage(reason as InactivityReason):null;
   return {
    id:p.id,name:(p.display_name||p.name||'Usuario sin nombre').trim(),
    accountType:companyByUser.has(p.id)?'company':'independent',companies:companyByUser.get(p.id)||[],
    joinedAt:p.created_at,lastSeenAt:lastSeen.get(p.id)||null,lastJornadaAt:j.last,
    daysWithoutRecording:daysSince(j.last||p.created_at,now),jornadas:j.count,
    base:p.base_name||p.base_city||null,
    onboarding:p.onboarding_completed===true,
    payroll:p.payroll_config&&typeof p.payroll_config==='object'&&Object.keys(p.payroll_config).length>0,
    status,pushAvailable:withPush.has(p.id),remindersEnabled:p.push_reminders_enabled!==false && p.notifications_enabled!==false,
    lastReminderAt:lastReminder,canNotify,message:msg
   };
  });
  return NextResponse.json({users,updatedAt:new Date().toISOString()}, {headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex,nofollow'}});
 }catch(error){console.error('Admin users',error);return NextResponse.json({error:'Error cargando usuarios. Revisa conexión a Supabase.'},{status:500});}
}
