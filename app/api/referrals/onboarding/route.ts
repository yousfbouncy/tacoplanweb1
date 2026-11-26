import {NextRequest,NextResponse} from 'next/server';
import {adminDatabase} from '@/lib/admin-users';
export const dynamic='force-dynamic';
const json=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private,no-store'}});
export async function POST(req:NextRequest){
 const db=adminDatabase();
 if(!db)return json({error:'Servicio no disponible'},503);
 const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return json({error:'Inicia sesión'},401);
 const {data,error}=await db.auth.getUser(token);
 if(error||!data.user)return json({error:'Sesión inválida'},401);
 let body:any;try{body=await req.json();}catch{return json({error:'Datos inválidos'},400);}
 if(!body||!['check','claim','skip'].includes(body.action))return json({error:'Acción inválida'},400);
 const code=typeof body.code==='string'?body.code.trim().toUpperCase():null;
 if(body.action==='claim'&&(!code||!/^[A-Z0-9]{12}$/.test(code)))return json({status:'invalid_code'},400);
 const result=await db.rpc('tp_referral_onboarding',{p_user:data.user.id,p_action:body.action,p_code:code});
 if(result.error)return json({error:'Programa no disponible'},503);
 return json({status:result.data});
}
