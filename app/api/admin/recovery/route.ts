import {NextRequest,NextResponse} from 'next/server';
import {adminDatabase,authorizedAdmin} from '@/lib/admin-users';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 if(!authorizedAdmin(req))return NextResponse.json({error:'No autorizado'},{status:401});
 const db=adminDatabase();if(!db)return NextResponse.json({error:'Base no disponible'},{status:503});
 const [d,c,p,s]=await Promise.all([db.from('tp_email_dispatches').select('id,user_id,status,created_at,updated_at,provider_id').eq('rule_key','recovery_2027'),db.from('tp_recovery_email_clicks').select('*'),db.from('profiles').select('id,name,display_name,last_jornada_at').limit(10000),db.from('tp_driver_subscriptions').select('user_id,status,first_paid_at,trial_ends_at')]);
 if([d,c,p,s].some(x=>x.error))return NextResponse.json({error:'No se pudieron leer datos'},{status:503});
 const rows=(d.data||[]).map(x=>{const profile=p.data?.find(y=>y.id===x.user_id),sub=s.data?.find(y=>y.user_id===x.user_id),clicks=(c.data||[]).filter(y=>y.dispatch_id===x.id);return {...x,name:profile?.display_name||profile?.name||'Sin nombre',clicks,recovered:x.status==='accepted'&&!!profile?.last_jornada_at&&Date.parse(profile.last_jornada_at)>Date.parse(x.updated_at||x.created_at),trial:sub?.status==='trialing'&&!!sub.trial_ends_at&&Date.parse(sub.trial_ends_at)>Date.parse(x.created_at),paid:!!sub?.first_paid_at&&Date.parse(sub.first_paid_at)>Date.parse(x.created_at)};});
 return NextResponse.json({rows},{headers:{'Cache-Control':'no-store'}});
}