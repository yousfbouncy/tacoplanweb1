import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { adminDatabase } from '@/lib/admin-users';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status=200) => NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(req: NextRequest) {
 const db=adminDatabase();
 if(!db)return json({error:'Servicio no disponible'},503);
 const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return json({error:'Inicia sesión'},401);
 const {data:auth,error:authError}=await db.auth.getUser(token);
 if(authError||!auth.user)return json({error:'Sesión inválida'},401);
 const uid=auth.user.id;
 const cfg=await db.from('tp_referral_config').select('*').eq('id',true).single();
 if(cfg.error)return json({enabled:false},503);
 if(!cfg.data.enabled)return json({enabled:false});
 if(!auth.user.email_confirmed_at)return json({error:'Confirma tu correo'},403);
 let code=await db.from('tp_referral_codes').select('code').eq('user_id',uid).maybeSingle();
 if(code.error)return json({error:'No se pudo consultar tu código'},500);
 if(!code.data){
  const created=await db.from('tp_referral_codes').upsert({user_id:uid,code:randomBytes(6).toString('hex').toUpperCase()},{onConflict:'user_id',ignoreDuplicates:true});
  if(created.error)return json({error:'No se pudo crear el código'},500);
  code=await db.from('tp_referral_codes').select('code').eq('user_id',uid).single();
 }
 if(code.error||!code.data)return json({error:'No se pudo consultar tu código'},500);
 const [refs,rewards,bonuses,payouts]=await Promise.all([
  db.from('tp_referral_attributions').select('referred_user_id',{count:'exact',head:true}).eq('referrer_user_id',uid),
  db.from('tp_referral_rewards').select('amount_cents,status,tp_referral_attributions!inner(referrer_user_id)').eq('tp_referral_attributions.referrer_user_id',uid).limit(10000),
  db.from('tp_referral_bonuses').select('amount_cents,status,kind').eq('referrer_user_id',uid).limit(10000),
  db.from('tp_referral_payouts').select('id,amount_cents,status,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(100)
 ]);
 if([refs,rewards,bonuses,payouts].some(x=>x.error))return json({error:'No se pudo consultar tu cuenta'},500);
 const entries=[...(rewards.data||[]),...(bonuses.data||[])];
 const sum=(status:string)=>entries.filter(x=>x.status===status).reduce((n,x)=>n+x.amount_cents,0);
 return json({enabled:true,code:code.data.code,link:'https://tacoplan.es/registro?ref='+code.data.code,registered:refs.count||0,confirmed:(rewards.data||[]).filter(x=>['available','reserved','paid'].includes(x.status)).length,pending:sum('pending'),available:sum('available'),reserved:sum('reserved'),paid:sum('paid'),payouts:payouts.data});
}
