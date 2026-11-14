import { NextRequest,NextResponse } from 'next/server';
import { randomBytes,createHash } from 'node:crypto';
import { adminDatabase,sameOrigin } from '@/lib/admin-users';
import { validDate,validFields } from '@/lib/report-sharing';

export const dynamic='force-dynamic';
const DAY=86400000;
function response(data:unknown,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'private,no-store','X-Robots-Tag':'noindex,nofollow'}});}
async function owner(req:NextRequest){
 const jwt=req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 const db=adminDatabase();
 if(!jwt||!db)return null;
 const {data,error}=await db.auth.getUser(jwt);
 if(error||!data.user)return null;
 return {db,id:data.user.id};
}
export async function GET(req:NextRequest){
 const a=await owner(req);if(!a)return response({error:'Inicia sesión para gestionar tus enlaces'},401);
 const {data,error}=await a.db.from('driver_report_shares')
  .select('id,date_from,date_to,fields,created_at,expires_at,revoked_at')
  .eq('user_id',a.id).order('created_at',{ascending:false}).limit(30);
 if(error)return response({error:'No se pudo consultar los enlaces'},500);
 return response({items:data||[]});
}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return response({error:'Origen no autorizado'},403);
 const a=await owner(req);if(!a)return response({error:'Inicia sesión para compartir tu informe'},401);
 let body:any;
 try{body=await req.json();}catch{return response({error:'Solicitud inválida'},400);}
 if(body?.action==='revoke'){
  if(typeof body.id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.id))return response({error:'Enlace inválido'},400);
  const {data,error}=await a.db.from('driver_report_shares')
   .update({revoked_at:new Date().toISOString()}).eq('id',body.id).eq('user_id',a.id).is('revoked_at',null)
   .select('id').maybeSingle();
  if(error)return response({error:'No se pudo desactivar el enlace'},500);
  return data?response({ok:true}):response({error:'Enlace inexistente o ya desactivado'},404);
 }
 if(body?.action!=='create')return response({error:'Acción no admitida'},400);
 const from=body.from,to=body.to;
 if(!validDate(from)||!validDate(to)||to<from)return response({error:'Selecciona fechas válidas'},400);
 const days=(Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/DAY;
 if(days>366||Date.parse(to+'T00:00:00Z')>Date.now()+DAY)return response({error:'El periodo no puede superar un año ni incluir fechas futuras'},400);
 if(!validFields(body.fields))return response({error:'Selecciona los datos que quieres compartir'},400);
 const ttl=Number(body.days);
 if(![1,7,30].includes(ttl))return response({error:'Caducidad inválida'},400);
 const {count,error:countError}=await a.db.from('driver_report_shares').select('id',{count:'exact',head:true})
 .eq('user_id',a.id).is('revoked_at',null).gt('expires_at',new Date().toISOString());
 if(countError)return response({error:'No se pudo comprobar tus enlaces'},500);
 if((count||0)>=5)return response({error:'Tienes cinco enlaces activos. Desactiva alguno antes de crear otro.'},409);
 const secret=randomBytes(32).toString('hex');
 const token_hash=createHash('sha256').update(secret).digest('hex');
 const {data,error}=await a.db.from('driver_report_shares').insert({
  user_id:a.id,token_hash,date_from:from,date_to:to,fields:body.fields,
  expires_at:new Date(Date.now()+ttl*DAY).toISOString()
 }).select('id,date_from,date_to,expires_at,fields').single();
 if(error){console.error('report share create',error);return response({error:'No se pudo crear el enlace privado'},500);}
 return response({ok:true,item:data,url:req.nextUrl.origin+'/empresa/informe/'+secret},201);
}
