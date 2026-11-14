import { NextRequest,NextResponse } from 'next/server';
import { adminDatabase, authorizedAdmin, sameOrigin, classifyInactivity, reminderMessage, ADMIN_REMINDER_SOURCE, InactivityReason } from '@/lib/admin-users';

export const dynamic='force-dynamic';
const DAY=86_400_000;
export async function POST(req:NextRequest){
 if(!authorizedAdmin(req))return NextResponse.json({error:'No autorizado'},{status:401});
 if(!sameOrigin(req))return NextResponse.json({error:'Origen de solicitud no autorizado'},{status:403});
 const db=adminDatabase();
 if(!db)return NextResponse.json({error:'Falta configuración de Supabase'},{status:503});
 let userId:string;
 try{const body=await req.json();userId=String(body?.userId||'');}catch{return NextResponse.json({error:'Solicitud incorrecta'},{status:400});}
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId))return NextResponse.json({error:'Usuario inválido'},{status:400});
 try{
  const [p,count,last,reminders,logs]=await Promise.all([
   db.from('profiles').select('id,created_at,notifications_enabled,push_reminders_enabled,last_inactivity_notification_sent_at').eq('id',userId).maybeSingle(),
   db.from('jornadas').select('*',{count:'exact',head:true}).eq('user_id',userId),
   db.from('jornadas').select('created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(1),
   db.from('push_tokens').select('expo_push_token').eq('user_id',userId).eq('notifications_enabled',true),
   db.from('admin_notification_logs').select('created_at').eq('source',ADMIN_REMINDER_SOURCE).eq('target_user_id',userId).order('created_at',{ascending:false}).limit(1),
  ]);
  for(const r of [p,count,last,reminders,logs])if(r.error)throw r.error;
  if(!p.data)return NextResponse.json({error:'Usuario inexistente'},{status:404});
  const profile=p.data;
  if(profile.notifications_enabled===false||profile.push_reminders_enabled===false)return NextResponse.json({error:'El usuario ha desactivado estos avisos'},{status:409});
  const status=classifyInactivity(count.count||0,profile.created_at,last.data?.[0]?.created_at||null);
  if(status!=='zero_jornadas'&&status!=='stopped_registering')return NextResponse.json({error:'Ya no cumple las condiciones de inactividad; actualiza la lista'},{status:409});
  const recent=[profile.last_inactivity_notification_sent_at,logs.data?.[0]?.created_at].filter(Boolean).sort().reverse()[0];
  if(recent&&Date.now()-new Date(recent).getTime()<7*DAY)return NextResponse.json({error:'Ya se le ha enviado un recordatorio recientemente (espera 7 días)'},{status:429});

  const content=reminderMessage(status as InactivityReason);
  const tokenList=[...new Set((reminders.data||[]).map(t=>t.expo_push_token).filter(t=>/^ExponentPushToken\[.+\]$|^ExpoPushToken\[.+\]$/.test(t)))];
  // Guardamos la intención para bloquear reenvíos accidentales durante siete días.
  const log=await db.from('admin_notification_logs').insert({
   source:ADMIN_REMINDER_SOURCE,source_id:status,title:content.title,body:content.body,
   type:'reminder',target_type:'user',target_user_id:userId,
   send_push:tokenList.length>0,create_internal_notification:true,
   users_targeted:1,tokens_found:tokenList.length,push_ok:0,push_failed:0,internal_created:0,status:'pending',
   data:{reason:status}
  }).select('id').single();
  if(log.error)throw log.error;
  const logId=log.data.id;
  let internalCreated=0,pushOk=0,pushFailed=0,pushMessage='';
  const internal=await db.from('user_notifications').insert({
   user_id:userId,type:'reminder',title:content.title,body:content.body,
   data:{source:ADMIN_REMINDER_SOURCE,reason:status,log_id:logId},is_read:false
  });
  if(internal.error)pushMessage='No se pudo guardar el aviso dentro de la aplicación';
  else internalCreated=1;
  if(tokenList.length){
   try{
    const response=await fetch('https://exp.host/--/api/v2/push/send',{
     method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
     body:JSON.stringify(tokenList.map(to=>({to,title:content.title,body:content.body,sound:'default',data:{type:'reminder',reason:status,source:ADMIN_REMINDER_SOURCE}}))),
     signal:AbortSignal.timeout(12000)
    });
    if(!response.ok)throw new Error('Expo HTTP '+response.status);
    const result=await response.json() as {data?:Array<{status:string;message?:string}>};
    const tickets=Array.isArray(result.data)?result.data:[];
    pushOk=tickets.filter(t=>t.status==='ok').length;
    pushFailed=tokenList.length-pushOk;
    if(pushFailed)pushMessage='Algunos dispositivos no aceptaron la notificación';
   }catch(error){pushFailed=tokenList.length;pushMessage='No se pudo entregar el envío a Expo';console.error('Admin reminder push',error);}
  }
  const statusLog=internalCreated && pushFailed===0?'success':internalCreated||pushOk?'partial':'failed';
  await db.from('admin_notification_logs').update({status:statusLog,push_ok:pushOk,push_failed:pushFailed,internal_created:internalCreated,error_message:pushMessage||null}).eq('id',logId);
  // Evitamos afirmar entrega al teléfono: Expo sólo confirma aceptación.
  return NextResponse.json({
   ok:statusLog!=='failed',internalCreated,pushAccepted:pushOk,pushFailed,
   message:pushOk>0?'Aviso guardado y envío push aceptado por Expo':internalCreated?'Aviso guardado dentro de Tacoplan; no se ha confirmado una push':'No se pudo enviar el aviso'
  },{status:statusLog==='failed'?502:200,headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('Admin reminder error',error);return NextResponse.json({error:'No se pudo tramitar el aviso. Inténtalo más tarde.'},{status:500});}
}
