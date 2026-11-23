'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function AccesoDesarrollador(){
 const router=useRouter();
 const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError('');
  try{
   const response=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({password})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'Acceso denegado');
   router.replace('/empresas');router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Error de acceso');}
  finally{setBusy(false);setPassword('');}
 }
 return <main className="flex min-h-screen items-center justify-center bg-[#081b39] px-4 text-white">
  <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-7 shadow-xl">
   <h1 className="text-2xl font-bold">Acceso del desarrollador</h1>
   <p className="mt-2 text-sm text-slate-300">Tacoplan para Empresas está en desarrollo y no admite accesos públicos.</p>
   <label className="mt-6 block text-sm font-semibold" htmlFor="developer-password">Contraseña de administración</label>
   <input id="developer-password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900"/>
   {error?<p role="alert" className="mt-3 text-sm text-red-200">{error}</p>:null}
   <button disabled={busy} type="submit" className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold disabled:opacity-60">{busy?'Comprobando…':'Entrar'}</button>
  </form>
 </main>;
}
