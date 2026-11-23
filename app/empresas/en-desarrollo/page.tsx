import type {Metadata} from 'next';
import Link from 'next/link';

export const metadata:Metadata={
 title:'Tacoplan para Empresas · En desarrollo',
 description:'Tacoplan para Empresas está en desarrollo. Próximamente disponible para empresas de transporte.',
 robots:{index:false,follow:false}
};
export default function EmpresasEnDesarrollo(){
 return <main className="min-h-screen bg-[#071a36] px-5 py-20 text-white">
  <div className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center text-center">
   <div className="mb-7 rounded-2xl border border-sky-400/30 bg-sky-500/10 px-6 py-3 text-lg font-black tracking-wider">TACOPLAN <span className="font-normal">EMPRESAS</span></div>
   <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200">En desarrollo</span>
   <h1 className="mt-7 text-4xl font-black leading-tight sm:text-5xl">Una plataforma para conectar conductores, Tráfico y RRHH</h1>
   <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">Estamos preparando Tacoplan para Empresas para simplificar el seguimiento de jornadas, la gestión de viajes, dietas e informes en una misma plataforma.</p>
   <p className="mt-4 text-sm text-sky-200">Acceso privado habilitado únicamente para el desarrollador durante esta fase.</p>
   <Link className="mt-9 rounded-xl border border-white/30 px-5 py-3 font-semibold hover:bg-white/10" href="/">Volver a Tacoplan</Link>
  </div>
 </main>;
}
