import { NextRequest,NextResponse } from 'next/server';
import { adminDatabase,authorizedAdmin,sameOrigin } from '@/lib/admin-users';
export const dynamic='force-dynamic';
const json=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private,no-store'}});
export async function GET(req:NextRequest){
 if(!authorizedAdmin(req))return json({error:'No autorizado'},401);
 const db=adminDatabase();if(!db)return json({error:'Base de datos no disponible'},503);
 const [config,codes,refs,rewards,bonuses,payouts,evidence]=await Promise.all([
 db.from('tp_referral_config').select('*').eq('id',true).single(),
 db.from('tp_referral_codes').select('*',{count:'exact',head:true}),
 db.from('tp_referral_attributions').select('*',{count:'exact',head:true}),
 db.from('tp_referral_rewards').select('id,referred_user_id,status,amount_cents,available_at').order('created_at',{ascending:false}).limit(100),
 db.from('tp_referral_bonuses').select('id,referrer_user_id,kind,status,amount_cents').order('qualified_at',{ascending:false}).limit(100),
 db.from('tp_referral_payouts').select('id,user_id,status,amount_cents,created_at').order('created_at',{ascending:false}).limit(100),
 db.from('tp_referral_invoice_evidence').select('*',{count:'exact',head:true})
 ]);
 if([config,codes,refs,rewards,bonuses,payouts,evidence].some(r=>r.error))return json({error:'No se pudo consultar el programa; comprueba la migración.'},503);
 return json({config:config.data,codes:codes.count,referrals:refs.count,evidence:evidence.count,rewards:rewards.data,bonuses:bonuses.data,payouts:payouts.data});
}
export async function PATCH(req:NextRequest){
 if(!authorizedAdmin(req))return json({error:'No autorizado'},401);
 if(!sameOrigin(req))return json({error:'Origen no autorizado'},403);
 const db=adminDatabase();if(!db)return json({error:'Base de datos no disponible'},503);
 let body:Record<string,unknown>;try{body=await req.json();}catch{return json({error:'Datos inválidos'},400);}
 if(!body||typeof body!=='object')return json({error:'Datos inválidos'},400);
 const bounds:Record<string,[number,number]>={monthly_cents:[0,400],annual_cents:[0,4000],min_referrals:[1,10000],min_payout_cents:[100,1000000],milestone_count:[1,10000],milestone_cents:[0,100000],loyalty_min_count:[1,10000],loyalty_cents:[0,4000],hold_days:[30,365]};
 const patch:Record<string,number|boolean|string>={};
 for(const [key,val] of Object.entries(body)){
  if(key==='enabled'){if(typeof val!=='boolean')return json({error:'Estado inválido'},400);patch.enabled=val;continue;}
  const b=bounds[key];if(!b||typeof val!=='number'||!Number.isInteger(val)||val<b[0]||val>b[1])return json({error:'Valor inválido: '+key},400);
  patch[key]=val;
 }
 if(!Object.keys(patch).length)return json({error:'Sin cambios'},400);
 if(patch.enabled===true){const current=await db.from('tp_referral_config').select('active_since').eq('id',true).single();if(current.error)return json({error:'No se pudo consultar el estado'},503);if(!current.data.active_since)patch.active_since=new Date().toISOString();}
 const result=await db.from('tp_referral_config').update(patch).eq('id',true).select('*').single();
 if(result.error)return json({error:'No se pudo guardar'},500);
 return json({config:result.data});
}
