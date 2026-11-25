import { NextRequest,NextResponse } from 'next/server';
import { adminDatabase,authorizedAdmin } from '@/lib/admin-users';
export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private,no-store','X-Robots-Tag':'noindex,nofollow'}});
export async function GET(req:NextRequest){
 if(!authorizedAdmin(req))return json({error:'No autorizado'},401);
 const db=adminDatabase();if(!db)return json({error:'Servicio no disponible'},503);
 try{
 const shares: {id:string;user_id:string;date_from:string;date_to:string;created_at:string;expires_at:string;revoked_at:string|null}[]=[];
 for(let offset=0;;offset+=1000){const r=await db.from('driver_report_shares').select('id,user_id,date_from,date_to,created_at,expires_at,revoked_at').order('created_at',{ascending:false}).order('id').range(offset,offset+999);if(r.error)throw r.error;shares.push(...(r.data||[]));if((r.data||[]).length<1000)break;}
 const users=Array.from(new Set(shares.map(s=>s.user_id)));
 const names=new Map<string,string>();
 for(let i=0;i<users.length;i+=100){const r=await db.from('profiles').select('id,display_name,name').in('id',users.slice(i,i+100));if(r.error)throw r.error;for(const p of r.data||[])names.set(p.id,p.display_name||p.name||'Usuario');}
 const counts=new Map<string,{opens:number;websiteClicks:number;enterpriseClicks:number;lastOpen:string|null}>();
 for(let offset=0;;offset+=1000){const r=await db.from('driver_report_access_events').select('id,share_id,event_type,created_at').order('id').range(offset,offset+999);if(r.error)throw r.error;for(const e of r.data||[]){const c=counts.get(e.share_id)||{opens:0,websiteClicks:0,enterpriseClicks:0,lastOpen:null};if(e.event_type==='open'){c.opens++;if(!c.lastOpen||e.created_at>c.lastOpen)c.lastOpen=e.created_at;}else if(e.event_type==='website_click')c.websiteClicks++;else if(e.event_type==='enterprise_click')c.enterpriseClicks++;counts.set(e.share_id,c);}if((r.data||[]).length<1000)break;}
 const items=shares.map(s=>({...s,name:names.get(s.user_id)||'Usuario',active:!s.revoked_at&&Date.parse(s.expires_at)>Date.now(),...(counts.get(s.id)||{opens:0,websiteClicks:0,enterpriseClicks:0,lastOpen:null})}));
 return json({items,summary:{users:users.length,reports:items.length,active:items.filter(x=>x.active).length,opened:items.filter(x=>x.opens>0).length,opens:items.reduce((a,x)=>a+x.opens,0),websiteClicks:items.reduce((a,x)=>a+x.websiteClicks,0),enterpriseClicks:items.reduce((a,x)=>a+x.enterpriseClicks,0)}});
 }catch(e){console.error('report stats',e);return json({error:'No se pudieron consultar las estadísticas'},500);}
}