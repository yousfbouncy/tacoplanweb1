import {NextRequest,NextResponse} from 'next/server';
import {adminDatabase,sameOrigin} from '@/lib/admin-users';
export type EnterpriseRole='owner'|'traffic'|'hr'|'driver';
export {PLAN_PRICES} from '@/lib/tp-enterprise-plans';

export const enterpriseJson=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private,no-store','X-Robots-Tag':'noindex,nofollow'}});
export async function identity(req:NextRequest){
 const match=req.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/);
 const db=adminDatabase();
 if(!db||!match)return null;
 const {data,error}=await db.auth.getUser(match[1]);
 if(error||!data.user)return null;
 return {db,user:data.user};
}
export async function membership(req:NextRequest){
 const auth=await identity(req);if(!auth)return null;
 const {data,error}=await auth.db.from('tp_company_members').select('company_id,username,role,active')
  .eq('user_id',auth.user.id).eq('active',true).maybeSingle();
 if(error)throw error;
 if(!data)return {...auth,member:null};
 return {...auth,member:data as {company_id:string;username:string;role:EnterpriseRole;active:boolean}};
}
export function originAllowed(req:NextRequest){return sameOrigin(req);}
export function permitted(role:EnterpriseRole|undefined,...allow:EnterpriseRole[]){return role!==undefined&&allow.includes(role);}
export function uuid(input:unknown):input is string{return typeof input==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);}
export const cleanUsername=(value:unknown)=>typeof value==='string'?value.trim().toLowerCase():'';
export const validUsername=(value:string)=>/^[a-z0-9][a-z0-9_.-]{2,29}$/.test(value);
export const cleanEmail=(value:unknown)=>typeof value==='string'?value.trim().toLowerCase():'';
export const validEmail=(value:string)=>value.length<250&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export async function audit(db:any,company:string,actor:string,action:string,entity:string,entityId:string,before:any,after:any,reason?:string){
 const r=await db.from('tp_company_audit').insert({company_id:company,actor_id:actor,action,entity,entity_id:entityId,before_data:before,after_data:after,reason:reason||null});
 if(r.error)throw r.error;
}

export function isPaidAccess(company:{subscription_status:string;trial_ends_at?:string|null}|null|undefined){
 if(!company)return false;
 if(company.subscription_status==='active')return true;
 if(company.subscription_status==='trialing'){
  return Boolean(company.trial_ends_at&&new Date(company.trial_ends_at).getTime()>Date.now());
 }
 return false;
}
