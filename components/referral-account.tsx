'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
type Account={enabled:boolean;code:string;link:string;registered:number;confirmed:number;pending:number;available:number;reserved:number;paid:number};
const euro=(n:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n/100);
export function ReferralAccount(){
 const {user,loading}=useAuth();
 const [data,setData]=useState<Account|null>(null);
 const [error,setError]=useState('');
 const [copied,setCopied]=useState(false);
 useEffect(()=>{
  let alive=true;setData(null);setError('');
  if(user)void (async()=>{try{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session)throw Error('Inicia sesión de nuevo');
    const r=await fetch('/api/referrals',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
    if(!r.ok)throw Error('El programa todavía no está disponible.');
    const value=await r.json();if(alive)setData(value);
  }catch(e){if(alive)setError(e instanceof Error?e.message:'Error de conexión');}})();
  return()=>{alive=false;};
 },[user]);
 if(loading)return <p>Cargando cuenta…</p>;
 if(!user)return <div className="mt-8 rounded-2xl border p-6"><h2 className="text-xl font-bold">Tu cuenta de recomendaciones</h2><p className="my-3">Inicia sesión con tu cuenta de Tacoplan para consultar el estado del programa.</p><Link className="font-bold text-blue-600 underline" href="/mi-tacoplan">Iniciar sesión</Link></div>;
 if(error)return <p className="mt-8" role="status">{error}</p>;
 if(!data)return <p className="mt-8">Consultando programa…</p>;
 if(!data.enabled)return <p className="mt-8 rounded-xl border p-4">Tu cuenta está conectada. El programa aún no está activo.</p>;
 return <section className="mt-8 rounded-2xl border p-6"><h2 className="text-xl font-bold">Tu cuenta de recomendaciones</h2><p className="mt-3 font-medium">Código: {data.code}</p><input aria-label="Enlace personal" className="mt-2 w-full rounded border bg-transparent p-2" readOnly value={data.link}/><button className="mt-2 rounded bg-blue-700 px-4 py-2 text-white" onClick={async()=>{try{await navigator.clipboard.writeText(data.link);setCopied(true);}catch{setCopied(false);}}}>{copied?'Copiado':'Copiar enlace'}</button><div className="mt-6 grid gap-4 sm:grid-cols-3">{[['Registrados',data.registered],['Confirmados',data.confirmed],['Pendientes',euro(data.pending)],['Disponibles',euro(data.available)],['En retirada',euro(data.reserved)],['Pagados',euro(data.paid)]].map(([label,value])=><div key={label} className="rounded-xl border p-3"><p className="text-sm">{label}</p><p className="text-xl font-bold">{value}</p></div>)}</div><p className="mt-4 text-sm">La retirada de dinero estará disponible tras completar las verificaciones del programa.</p></section>;
}
