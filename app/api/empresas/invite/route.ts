import {NextRequest} from 'next/server';
import {createHash} from 'node:crypto';
import {adminDatabase} from '@/lib/admin-users';
import {enterpriseJson} from '@/lib/tp-enterprise';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const raw=req.nextUrl.searchParams.get('token')||'';
 if(!/^[0-9a-f]{64}$/.test(raw))return enterpriseJson({error:'El enlace de invitación no es válido.'},400);
 const db=adminDatabase();
 if(!db)return enterpriseJson({error:'Servicio de invitaciones no disponible.'},503);
 const hash=createHash('sha256').update(raw).digest('hex');
 const {data,error}=await db.from('tp_company_invites')
  .select('id,company_id,email,username,employee_name,role,expires_at,accepted_at,revoked_at')
  .eq('token_hash',hash).maybeSingle();
 if(error)return enterpriseJson({error:'No se pudo comprobar la invitación.'},503);
 if(!data||data.revoked_at||data.accepted_at||new Date(data.expires_at).getTime()<=Date.now())
  return enterpriseJson({error:'Esta invitación ha caducado o ya no está disponible. Solicita una nueva a tu empresa.'},410);
 const company=await db.from('tp_companies').select('name').eq('id',data.company_id).maybeSingle();
 if(company.error||!company.data)return enterpriseJson({error:'No se encontró la empresa.'},404);
 return enterpriseJson({
  companyName:company.data.name,
  email:data.email,
  username:data.username,employeeName:data.employee_name||data.username,
  role:data.role,
  expiresAt:data.expires_at
 });
}
