import {NextRequest} from 'next/server';
import {membership,enterpriseJson,isPaidAccess} from '@/lib/tp-enterprise';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const auth=await membership(req);
 if(!auth||!auth.member)return enterpriseJson({managed:false},200);
 if(auth.member.role!=='driver')return enterpriseJson({managed:false},200);
 const {db,member,user}=auth;
 const c=await db.from('tp_companies').select('id,name,subscription_status,trial_ends_at').eq('id',member.company_id).single();
 if(c.error||!c.data)return enterpriseJson({managed:false},200);
 if(!isPaidAccess(c.data))return enterpriseJson({managed:false,reason:'company_subscription_inactive'},200);
 const s=await db.from('tp_driver_settings').select('base_name,workplace,agreement,effective_from,diet_rates,plus_rates,payroll_terms,updated_at')
  .eq('company_id',member.company_id).eq('driver_id',user.id).maybeSingle();
 if(s.error)return enterpriseJson({error:'No se pudo cargar la configuración de empresa'},500);
 if(!s.data)return enterpriseJson({managed:false},200);
 return enterpriseJson({managed:true,companyId:member.company_id,companyName:c.data.name,config:s.data});
}
