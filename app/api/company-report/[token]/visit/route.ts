import { NextRequest,NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { adminDatabase } from '@/lib/admin-users';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest,{params}:{params:{token:string}}){
 const origin=req.headers.get('origin');
 if(!origin || origin!=='https://tacoplan.es' && origin!=='https://www.tacoplan.es' && origin!==req.nextUrl.origin)return new NextResponse(null,{status:403});
 if(!/^[0-9a-f]{64}$/.test(params.token))return new NextResponse(null,{status:404});
 let event:string;try{event=(await req.json()).event;}catch{return new NextResponse(null,{status:400});}
 if(event!=='website_click'&&event!=='enterprise_click')return new NextResponse(null,{status:400});
 const db=adminDatabase();if(!db)return new NextResponse(null,{status:503});
 const {data,error}=await db.from('driver_report_shares').select('id').eq('token_hash',createHash('sha256').update(params.token).digest('hex')).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
 if(error||!data)return new NextResponse(null,{status:404});
 const result=await db.from('driver_report_access_events').insert({share_id:data.id,event_type:event});
 return new NextResponse(null,{status:result.error?503:204,headers:{'Cache-Control':'private,no-store'}});
}