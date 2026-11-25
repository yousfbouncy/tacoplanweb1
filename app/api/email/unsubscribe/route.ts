import {NextRequest,NextResponse} from 'next/server';
import {adminDatabase} from '@/lib/admin-users';
import {verifyUnsubscribe} from '@/lib/automatic-email';
export const dynamic='force-dynamic';
const html=(body:string,status=200)=>new NextResponse('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Tacoplan · Preferencias</title><body style="font:16px system-ui;max-width:520px;margin:60px auto;padding:20px">'+body+'</body></html>',{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'"}});
export async function GET(req:NextRequest){
 const token=req.nextUrl.searchParams.get('token')||'';
 if(!verifyUnsubscribe(token))return html('<h1>Enlace no válido</h1>',400);
 return html('<h1>Correos de Tacoplan</h1><p>Confirma que quieres dejar de recibir comunicaciones comerciales. Los avisos necesarios de tu cuenta seguirán disponibles.</p><form method="post"><button type="submit">Dar de baja</button></form>');
}
export async function POST(req:NextRequest){
 const id=verifyUnsubscribe(req.nextUrl.searchParams.get('token')||'');if(!id)return html('<h1>Enlace no válido</h1>',400);
 const db=adminDatabase();if(!db)return html('<h1>Servicio no disponible</h1>',503);
 const r=await db.from('tp_email_preferences').upsert({user_id:id,marketing_enabled:false});
 return r.error?html('<h1>No se pudo guardar. Inténtalo de nuevo.</h1>',503):html('<h1>Baja confirmada</h1><p>No recibirás más correos comerciales de Tacoplan salvo que vuelvas a activarlos.</p>');
}
