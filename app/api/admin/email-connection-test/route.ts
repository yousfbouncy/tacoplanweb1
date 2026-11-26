import {NextRequest,NextResponse} from 'next/server';
import crypto from 'crypto';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){
 const reply=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private,no-store'}});
 const expected=process.env.TP_EMAIL_TEST_TOKEN||'', actual=req.headers.get('authorization')||'';
 const a=Buffer.from(actual),b=Buffer.from('Bearer '+expected);
 if(!expected||Date.now()>Date.parse('2026-11-26T03:00:00+01:00')||a.length!==b.length||!crypto.timingSafeEqual(a,b))return reply({error:'No autorizado'},401);
 const key=process.env.RESEND_API_KEY,from=process.env.TP_EMAIL_FROM,to=process.env.TP_EMAIL_TEST_TO;
 if(!key||!from||!to)return reply({error:'Configuración incompleta'},503);
 try{
 const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'tacoplan-owner-connection-test-20261126-v1'},body:JSON.stringify({from,to:[to],subject:'Tacoplan · Prueba de correo automático',text:'Este es un correo de prueba de Tacoplan. Si lo has recibido, el nuevo sistema de correo está conectado. Las campañas automáticas todavía están desactivadas.'})});
 const result=await res.json();
 if(!res.ok||!result.id)return reply({accepted:false,providerStatus:res.status,code:result.name||'unknown'},502);
 return reply({accepted:true,id:result.id});
 }catch{return reply({accepted:false,error:'Error de conexión'},502);}
}
