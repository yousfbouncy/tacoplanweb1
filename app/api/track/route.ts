import { NextRequest, NextResponse } from 'next/server';
import { adminDatabase } from '@/lib/admin-users';
export const dynamic='force-dynamic';
const types=['page_view','store_click_ios','store_click_android'];
export async function POST(req:NextRequest){
 const origin=req.headers.get('origin');const host=req.headers.get('x-forwarded-host')||req.headers.get('host');
 if(!origin||!host)return new NextResponse(null,{status:403});
 try{const u=new URL(origin);if(u.host!==host||(process.env.NODE_ENV==='production'&&u.protocol!=='https:'))return new NextResponse(null,{status:403});}catch{return new NextResponse(null,{status:403});}
 let data:{type?:string;path?:string;session?:string};
 try{data=await req.json();}catch{return new NextResponse(null,{status:400});}
 if(!data||!data.type||!types.includes(data.type)||typeof data.path!=='string'||data.path.length>100||!data.path.startsWith('/')||data.path.startsWith('/empresa/informe')||data.path.startsWith('/desarrollo')||data.path.startsWith('/api')||typeof data.session!=='string'||!/^[a-f0-9-]{36}$/i.test(data.session))return new NextResponse(null,{status:400});
 const db=adminDatabase();if(!db)return new NextResponse(null,{status:503});
 try{const {error}=await db.from('web_analytics_events').insert({event_type:data.type,session_id:data.session,path:data.path});
 if(error){console.error('Tracking',error);return new NextResponse(null,{status:503});}
 return new NextResponse(null,{status:204});}catch{return new NextResponse(null,{status:503});}
}
