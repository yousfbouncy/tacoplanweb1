'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Building2,LockKeyhole} from 'lucide-react';
import {supabase} from '@/lib/supabase';

export default function EmployeeLoginPage(){
 const router=useRouter();
 const [username,setUsername]=useState(''),[password,setPassword]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const submit=async(e:React.FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  try{
   const response=await fetch('/api/empresas/username-login',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username:username.trim().toLowerCase(),password,staffOnly:true})
   });
   const payload=await response.json();
   if(!response.ok)throw Error(payload.error||'No se pudo iniciar sesión');
   const {error:sessionError}=await supabase.auth.setSession({
    access_token:payload.access_token,refresh_token:payload.refresh_token
   });
   if(sessionError)throw sessionError;
   router.replace('/empresas');
   router.refresh();
  }catch(e:unknown){setError(e instanceof Error?e.message:'Credenciales incorrectas');}
  finally{setBusy(false);}
 };
 return <main className="min-h-[78vh] bg-slate-50 px-4 py-12">
  <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
   <header className="bg-[#0c1931] p-7 text-center text-white">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600"><Building2 className="h-7 w-7"/></div>
    <h1 className="mt-5 text-3xl font-extrabold">Acceso de empleados</h1>
    <p className="mt-3 text-sm text-slate-300">Acceso exclusivo para Tráfico y Recursos Humanos.</p>
   </header>
   <form onSubmit={submit} className="space-y-4 p-6">
    <label className="block text-sm font-semibold text-slate-700">Nombre de usuario
     <input type="text" required autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="usuario.empleado" className="mt-2 w-full rounded-xl border border-slate-300 p-3"/>
    </label>
    <label className="block text-sm font-semibold text-slate-700">Contraseña
     <input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Tu contraseña" className="mt-2 w-full rounded-xl border border-slate-300 p-3"/>
    </label>
    {error?<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}
    <button type="submit" disabled={busy} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy?'Comprobando…':'Iniciar sesión'}</button>
    <p className="flex items-center gap-2 text-xs text-slate-500"><LockKeyhole className="h-4 w-4"/>Tu empresa crea y facilita tus credenciales. No necesitas correo electrónico.</p>
    <p className="text-center text-sm"><Link className="font-semibold text-blue-700" href="/mi-tacoplan">Soy conductor · Mi Tacoplan</Link></p>
   </form>
  </div>
 </main>;
}
