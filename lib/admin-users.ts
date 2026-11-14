import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_COOKIE_NAME, getAdminPassword, verifyAdminToken } from '@/lib/admin-auth';

const DAY=86_400_000;
export const ADMIN_REMINDER_SOURCE='admin_dashboard_inactivity';
export type InactivityReason='zero_jornadas'|'stopped_registering';
export type UserStatus='new'|'zero_jornadas'|'stopped_registering'|'recording';

export function authorizedAdmin(req:NextRequest){
 const password=getAdminPassword();
 if(!password)return false;
 const secret=process.env.TACOPLAN_ADMIN_COOKIE_SECRET?.trim()||password;
 return verifyAdminToken(secret,req.cookies.get(ADMIN_COOKIE_NAME)?.value,30*DAY);
}
export function sameOrigin(req:NextRequest){
 const origin=req.headers.get('origin');
 if(!origin)return false;
 try{
  const host=req.headers.get('x-forwarded-host')||req.headers.get('host')||req.nextUrl.host;
  const parsed=new URL(origin);
  return parsed.host===host && parsed.protocol==='https:' || (process.env.NODE_ENV!=='production' && parsed.host===host);
 }catch{return false;}
}
export function adminDatabase(){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE;
 if(!key)return null;
 return createClient('https://dutgxjwfjtqxmqonnjlp.supabase.co',key,{auth:{persistSession:false}});
}
export function classifyInactivity(count:number,joined:string,lastCreated:string|null,now=Date.now()):UserStatus{
 if(count===0)return now-new Date(joined).getTime()<2*DAY?'new':'zero_jornadas';
 if(lastCreated && now-new Date(lastCreated).getTime()>=7*DAY)return 'stopped_registering';
 return 'recording';
}
export function reminderMessage(reason:InactivityReason) {
 return reason==='zero_jornadas'
 ? {title:'🚛 ¿Has empezado a usar Tacoplan?',body:'Recuerda que puedes registrar tu primera jornada en unos segundos y consultar tus tiempos y descansos desde el móvil. Si necesitas ayuda, estamos para ayudarte.'}
 : {title:'🚛 Tu registro de jornadas, siempre a mano',body:'Si has estado trabajando estos días, recuerda que puedes poner al día tus jornadas en Tacoplan y seguir controlando conducción, descansos y dietas. ¿Necesitas ayuda? Estamos aquí.'};
}
export const daysSince=(date:string|null,now=Date.now())=>date===null?null:Math.max(0,Math.floor((now-new Date(date).getTime())/DAY));
