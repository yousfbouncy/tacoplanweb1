import { NextRequest,NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { adminDatabase } from '@/lib/admin-users';
import { REPORT_DB_COLUMNS,validFields,mapReportRow,redactRows,ReportField,RawReportJornada } from '@/lib/report-sharing';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private,no-store,max-age=0','X-Robots-Tag':'noindex,nofollow','Referrer-Policy':'no-referrer'};
const json=(v:unknown,status=200)=>NextResponse.json(v,{status,headers});
export async function GET(req:NextRequest,{params}:{params:{token:string}}){
 const token=params.token;
 if(!/^[0-9a-f]{64}$/.test(token))return json({error:'Enlace no encontrado'},404);
 const db=adminDatabase();if(!db)return json({error:'Servicio no disponible'},503);
 const hash=createHash('sha256').update(token).digest('hex');
 const {data:share,error:shareError}=await db.from('driver_report_shares')
  .select('user_id,date_from,date_to,fields,expires_at,revoked_at')
  .eq('token_hash',hash).maybeSingle();
 if(shareError){console.error('company share lookup',shareError);return json({error:'No se pudo comprobar el enlace'},500);}
 if(!share)return json({error:'Enlace no encontrado'},404);
 if(share.revoked_at||new Date(share.expires_at).getTime()<=Date.now())return json({error:'El conductor ha desactivado este acceso o ha caducado'},410);
 const fields=share.fields;
 if(!validFields(fields))return json({error:'Configuración de acceso inválida'},500);
 const result=await db.from('jornadas').select(REPORT_DB_COLUMNS).eq('user_id',share.user_id)
  .gte('fecha_inicio',share.date_from).lte('fecha_inicio',share.date_to)
  .order('fecha_inicio',{ascending:false}).limit(1000);
 if(result.error){console.error('company report rows',result.error);return json({error:'No se pudo consultar el historial permitido'},500);}
 let driverName:null|string=null;
 if(fields.includes('driver_name')){
  const profile=await db.from('profiles').select('display_name,name').eq('id',share.user_id).maybeSingle();
  if(profile.error)return json({error:'Error al cargar conductor'},500);
  driverName=profile.data?.display_name||profile.data?.name||'Conductor';
 }
 const rows=(result.data||[]).map(j=>mapReportRow(j as unknown as RawReportJornada));
 return json({
  report:{title:'Informe de actividad · Tacoplan',driverName,from:share.date_from,to:share.date_to,
  fields:fields as ReportField[],rows:redactRows(rows,fields as ReportField[]),generatedAt:new Date().toISOString()},
  expiresAt:share.expires_at
 });
}
