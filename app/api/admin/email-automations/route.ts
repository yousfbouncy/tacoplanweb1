import {NextRequest,NextResponse} from 'next/server';
import {adminDatabase,authorizedAdmin,sameOrigin} from '@/lib/admin-users';
import {emailReady} from '@/lib/automatic-email';
export const dynamic='force-dynamic';
const reply=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private,no-store'}});
export async function GET(req:NextRequest){
 if(!authorizedAdmin(req))return reply({error:'No autorizado'},401);
 const db=adminDatabase();if(!db)return reply({error:'Servicio no disponible'},503);
 const [rules,logs,consents]=await Promise.all([db.from('tp_email_rules').select('*').order('key'),db.from('tp_email_dispatches').select('id,rule_key,status,created_at,error_code').order('created_at',{ascending:false}).limit(100),db.from('tp_email_preferences').select('user_id',{count:'exact',head:true}).eq('marketing_enabled',true)]);
 if(rules.error||logs.error||consents.error)return reply({error:'Error consultando correos'},503);
 return reply({ready:emailReady(),rules:rules.data,logs:logs.data,consents:consents.count||0});
}
export async function PATCH(req:NextRequest){
 if(!authorizedAdmin(req)||!sameOrigin(req))return reply({error:'No autorizado'},403);
 const db=adminDatabase();if(!db)return reply({error:'Servicio no disponible'},503);
 const b=await req.json().catch(()=>null);
 if(!b||typeof b.key!=='string'||typeof b.enabled!=='boolean'||typeof b.subject!=='string'||typeof b.body!=='string'||!b.subject.trim()||b.subject.length>140||!b.body.trim()||b.body.length>5000||/[\r\n]/.test(b.subject))return reply({error:'Datos inválidos'},400);
 if(b.enabled&&!emailReady())return reply({error:'Configura y verifica primero el proveedor de correo'},409);
 const r=await db.from('tp_email_rules').update({enabled:b.enabled,subject:b.subject.trim(),body:b.body.trim()}).eq('key',b.key).select('key').maybeSingle();
 if(r.error||!r.data)return reply({error:'No se pudo guardar'},400);return reply({ok:true});
}
