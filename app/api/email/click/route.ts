import {NextRequest,NextResponse} from 'next/server';
import {adminDatabase} from '@/lib/admin-users';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const id=req.nextUrl.searchParams.get('id')||'',action=req.nextUrl.searchParams.get('action')||'';
 if(!/^[a-f0-9-]{36}$/i.test(id)||!['plan','help'].includes(action))return new NextResponse('Enlace inválido',{status:400});
 const db=adminDatabase();
 if(db){const r=await db.from('tp_email_dispatches').select('id').eq('id',id).eq('rule_key','recovery_2027').maybeSingle();if(r.data)await db.from('tp_recovery_email_clicks').upsert({dispatch_id:id,action},{onConflict:'dispatch_id,action',ignoreDuplicates:true});}
 return NextResponse.redirect(action==='help'?'https://wa.me/34614314554?text='+encodeURIComponent('Hola, me gustaría recibir ayuda para empezar a utilizar Tacoplan'):'https://www.tacoplan.es/planes',302);
}