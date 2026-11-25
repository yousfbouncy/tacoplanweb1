import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_COOKIE_NAME,getAdminPassword,verifyAdminToken } from '@/lib/admin-auth';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'};
function reply(body:unknown,status=200){return NextResponse.json(body,{status,headers});}
function todayMadrid(){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>p.find(x=>x.type===k)?.value).join('-');}
export async function GET(req:NextRequest){
 const password=getAdminPassword(),secret=process.env.TACOPLAN_ADMIN_COOKIE_SECRET?.trim()||password;
 if(!password||!secret||!verifyAdminToken(secret,req.cookies.get(ADMIN_COOKIE_NAME)?.value,30*86400000))return reply({error:'No autorizado'},401);
 const date=req.nextUrl.searchParams.get('date')||todayMadrid();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>todayMadrid())return reply({error:'Fecha no válida'},400);
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE;
 if(!key)return reply({error:'Servicio no configurado'},503);
 try{
   const db=createClient('https://dutgxjwfjtqxmqonnjlp.supabase.co',key,{auth:{persistSession:false}});
   const {data,error}=await db.rpc('admin_daily_activity_stats',{p_date:date});
   if(error)throw error;
   return reply(data);
 }catch(e){console.error('Admin daily activity query failed',e);return reply({error:'No se han podido cargar las estadísticas'},500);}
}
