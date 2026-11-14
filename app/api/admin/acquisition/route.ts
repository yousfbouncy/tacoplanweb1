import { NextRequest,NextResponse } from 'next/server';
import { adminDatabase,authorizedAdmin } from '@/lib/admin-users';
export const dynamic='force-dynamic';
const DAY=86_400_000;
export async function GET(req:NextRequest){
 if(!authorizedAdmin(req))return NextResponse.json({error:'No autorizado'},{status:401});
 const db=adminDatabase();if(!db)return NextResponse.json({error:'Falta configurar Supabase en el servidor'},{status:503});
 try{
  const now=Date.now(),cut14=new Date(now-14*DAY).toISOString();
  const [p,j]=await Promise.all([db.from('profiles').select('id,created_at').gte('created_at',cut14).limit(5000),db.from('jornadas').select('user_id').limit(5000)]);
  if(p.error||j.error)throw p.error||j.error;
  const profiles=p.data||[],recorders=new Set((j.data||[]).map(x=>x.user_id));
  const recent=(days:number)=>profiles.filter(x=>new Date(x.created_at).getTime()>=now-days*DAY);
  const seven=recent(7),fourteen=recent(14);
  const cut=(days:number)=>new Date(now-days*DAY).toISOString();
  const types=['page_view','store_click_ios','store_click_android'];
  const reqs=await Promise.all(types.flatMap(type=>[7,30].map(days=>db.from('web_analytics_events').select('id',{count:'exact',head:true}).eq('event_type',type).gte('created_at',cut(days)))));
  for(const r of reqs)if(r.error)throw r.error;
  const sessionResult=await db.from('web_analytics_events').select('session_id,created_at').eq('event_type','page_view').gte('created_at',cut(30)).limit(20000);
  if(sessionResult.error)throw sessionResult.error;
  const allSessions=sessionResult.data||[];
  const [first]=await Promise.all([db.from('web_analytics_events').select('created_at').order('created_at',{ascending:true}).limit(1)]);
  return NextResponse.json({
   since:first.data?.[0]?.created_at||new Date().toISOString(),
   new7:seven.length,new14:fourteen.length,new7WithJornadas:seven.filter(x=>recorders.has(x.id)).length,
   new14WithJornadas:fourteen.filter(x=>recorders.has(x.id)).length,
   new7NoJornadas:seven.filter(x=>!recorders.has(x.id)).length,new14NoJornadas:fourteen.filter(x=>!recorders.has(x.id)).length,
   pageviews7:reqs[0].count||0,pageviews30:reqs[1].count||0,
   iosClicks7:reqs[2].count||0,iosClicks30:reqs[3].count||0,
   androidClicks7:reqs[4].count||0,androidClicks30:reqs[5].count||0,
   sessions7:new Set(allSessions.filter(x=>new Date(x.created_at).getTime()>=now-7*DAY).map(x=>x.session_id)).size,
   sessions30:new Set(allSessions.map(x=>x.session_id)).size
  },{headers:{'Cache-Control':'private,no-store','X-Robots-Tag':'noindex,nofollow'}});
 }catch(error){console.error('Admin acquisition error',error);return NextResponse.json({error:'No se pudieron consultar métricas'},{status:500});}
}
