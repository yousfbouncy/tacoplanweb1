'use client';
import { useState } from 'react';
import { LockKeyhole, LogOut, Truck } from 'lucide-react';

export function AdminAccess({mode}:{mode:'login'|'logout'}){
 const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const execute=async(url:string,body?:object)=>{
   setBusy(true);setError('');
   try{
     const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
     const json=await res.json() as {ok?:boolean;error?:string};
     if(!res.ok || !json.ok) throw new Error(json.error||'No se pudo completar la operación');
     window.location.reload();
   }catch(e:unknown){setError(e instanceof Error?e.message:'Error de conexión');setBusy(false);}
 };
 if(mode==='logout')return <button type="button" onClick={()=>execute('/api/admin/logout')} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><LogOut className="h-4 w-4"/>Salir</button>;
 return <section className="mx-auto mt-8 max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
 <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><LockKeyhole className="h-6 w-6"/></div><div><h1 className="text-xl font-bold text-slate-900">Acceso de administrador</h1><p className="text-sm text-slate-500">Panel privado de estadísticas</p></div></div>
 <form onSubmit={e=>{e.preventDefault();void execute('/api/admin/login',{password});}} className="space-y-4">
 <label htmlFor="admin-password" className="block text-sm font-semibold text-slate-700">Contraseña</label>
 <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Contraseña de administrador"/>
 {error?<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}
 <button disabled={busy||!password.trim()} type="submit" className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50">{busy?'Entrando…':'Entrar al panel'}</button>
 </form></section>;
}
