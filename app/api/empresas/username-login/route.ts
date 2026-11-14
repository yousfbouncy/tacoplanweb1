import {NextRequest} from 'next/server';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {adminDatabase,sameOrigin} from '@/lib/admin-users';
import {enterpriseJson,cleanUsername,validUsername} from '@/lib/tp-enterprise';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return enterpriseJson({error:'Solicitud no permitida'},403);
 let username='',password='';
 try{
  const data=await req.json();
  username=cleanUsername(data.username);password=typeof data.password==='string'?data.password:'';
 }catch{return enterpriseJson({error:'Solicitud inválida'},400);}
 if(!validUsername(username)||password.length<8||password.length>256)return enterpriseJson({error:'Credenciales incorrectas'},401);
 const db=adminDatabase();
 if(!db)return enterpriseJson({error:'Inicio de sesión no disponible'},503);
 const pepper=process.env.TACOPLAN_ENTERPRISE_LOGIN_PEPPER||process.env.TACOPLAN_ADMIN_COOKIE_SECRET;
 if(!pepper)return enterpriseJson({error:'Seguridad del inicio de sesión sin configurar'},503);
 const address=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
 const key=createHash('sha256').update(pepper+':'+address+':'+username).digest('hex');
 const since=new Date(Date.now()-15*60*1000).toISOString();
 const {count,error:limitError}=await db.from('tp_login_attempts').select('id',{count:'exact',head:true}).eq('key_hash',key).gte('attempted_at',since);
 if(limitError)return enterpriseJson({error:'Inicio de sesión temporalmente no disponible'},503);
 if((count||0)>=6)return enterpriseJson({error:'Demasiados intentos. Vuelve a probar dentro de 15 minutos.'},429);
 const attempt=await db.from('tp_login_attempts').insert({key_hash:key});
 if(attempt.error)return enterpriseJson({error:'Error al comprobar acceso'},503);
 const found=await db.from('tp_company_members').select('user_id,active').eq('username',username).eq('active',true).maybeSingle();
 if(found.error||!found.data)return enterpriseJson({error:'Credenciales incorrectas'},401);
 const foundUser=await db.auth.admin.getUserById(found.data.user_id);
 if(foundUser.error||!foundUser.data.user?.email)return enterpriseJson({error:'Credenciales incorrectas'},401);
 const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.SUPABASE_ANON_KEY;
 if(!anonKey)return enterpriseJson({error:'Configura SUPABASE_ANON_KEY en el servidor para acceso por usuario'},503);
 const client=createClient('https://dutgxjwfjtqxmqonnjlp.supabase.co',anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const signin=await client.auth.signInWithPassword({email:foundUser.data.user.email,password});
 if(signin.error||!signin.data.session)return enterpriseJson({error:'Credenciales incorrectas'},401);
 return enterpriseJson({access_token:signin.data.session.access_token,refresh_token:signin.data.session.refresh_token,
  expires_in:signin.data.session.expires_in});
}
