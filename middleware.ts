import {NextRequest,NextResponse} from 'next/server';

const MAX_AGE_MS=30*24*60*60*1000;
function hex(bytes:Uint8Array){return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');}
async function isDeveloper(req:NextRequest):Promise<boolean>{
 const password=process.env.TACOPLAN_ADMIN_PASSWORD||process.env.ADMIN_PASSWORD;
 if(!password?.trim())return false;
 const secret=process.env.TACOPLAN_ADMIN_COOKIE_SECRET?.trim()||password.trim();
 const token=req.cookies.get('tp_admin')?.value;
 if(!token)return false;
 const parts=token.split('.');
 if(parts.length!==3||!/^[0-9a-f]{64}$/.test(parts[2]))return false;
 const [issued,nonce,signature]=parts;
 if(!/^[0-9a-z]+$/.test(issued)||!/^[0-9a-f]{32}$/.test(nonce))return false;
 const age=Date.now()-parseInt(issued,36);
 if(!Number.isFinite(age)||age<0||age>MAX_AGE_MS)return false;
 const encoder=new TextEncoder();
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(issued+'.'+nonce))));
 let diff=0;
 for(let i=0;i<64;i++)diff|=digest.charCodeAt(i)^signature.charCodeAt(i);
 return diff===0;
}
export async function middleware(req:NextRequest){
 const path=req.nextUrl.pathname;
 if(path==='/empresas/en-desarrollo'||path==='/empresas/acceso')return NextResponse.next();
 // Keep driver integrations and signed Stripe events available.
 if(['/api/empresas/stripe-webhook','/api/empresas/mobile-config','/api/empresas/native-activate','/api/empresas/username-login'].includes(path))
  return NextResponse.next();
 if(await isDeveloper(req))return NextResponse.next();
 if(path.startsWith('/api/empresas/'))
  return NextResponse.json({error:'Tacoplan para Empresas está en desarrollo. Acceso restringido al desarrollador.'},{status:403,headers:{'Cache-Control':'no-store'}});
 const url=req.nextUrl.clone();
 url.pathname='/empresas/en-desarrollo';
 url.search='';
 return NextResponse.rewrite(url,{headers:{'Cache-Control':'no-store'}});
}
export const config={matcher:['/empresas/:path*','/demo-empresas/:path*','/api/empresas/:path*']};
