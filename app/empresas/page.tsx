import type {Metadata} from 'next';
import Link from 'next/link';
import {Building2,UsersRound,Truck,Wallet,ShieldCheck,ClipboardCheck,ArrowRight} from 'lucide-react';
export const metadata:Metadata={
 title:'Tacoplan Empresas | Gestión de conductores, Tráfico y RRHH',
 description:'Tacoplan Empresas: gestión de conductores, jornadas y dietas con departamentos de Tráfico y RRHH separados. Próximamente disponible.',
 alternates:{canonical:'https://tacoplan.es/empresas'}
};
const features=[
 {Icon:UsersRound,title:'Gestión de conductores',description:'Cada empresa configura las cuentas de sus empleados, sus dietas, pluses y condiciones laborales.'},
 {Icon:Truck,title:'Departamento de Tráfico',description:'Consulta las jornadas y ubicaciones laborales autorizadas, y revisa las dietas declaradas.'},
 {Icon:ClipboardCheck,title:'Confirmaciones justificadas',description:'Los cambios en dietas o pluses requieren una observación y el conductor puede aceptarlos o discrepar.'},
 {Icon:Wallet,title:'Departamento de RRHH',description:'Prepara los cierres mensuales con dietas y pluses confirmados, pendientes y en discrepancia.'}
];
export default function EmpresasPage(){
 return <main className="min-h-[70vh] bg-slate-50">
  <section className="bg-gradient-to-br from-[#07162D] via-[#092C61] to-[#0B1F3F] px-5 py-16 text-white sm:py-24">
   <div className="mx-auto max-w-5xl">
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-100"><Building2 className="h-4 w-4"/>Tacoplan Empresas · En desarrollo</span>
    <h1 className="mt-7 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">Una misma plataforma. Tráfico y RRHH, cada uno con su espacio.</h1>
    <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-200">Gestiona las jornadas, dietas y pluses de tus conductores con revisiones justificadas y confirmaciones transparentes. Accesos independientes para cada departamento.</p>
    <div className="mt-8 flex flex-wrap items-center gap-4">
      <Link href="/contacto" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#0A2651] transition hover:bg-blue-100">Solicitar información <ArrowRight className="h-4 w-4"/></Link>
      <span className="text-sm text-blue-100">Prueba gratuita de 7 días prevista para el lanzamiento</span>
    </div>
   </div>
  </section>
  <section className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
   <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Pensado para empresas de transporte</h2>
   <p className="mt-3 max-w-2xl text-slate-600">Los permisos se separarán entre administrador, Tráfico, RRHH y conductor. El conductor estará vinculado a una sola empresa activa.</p>
   <div className="mt-8 grid gap-4 md:grid-cols-2">
    {features.map(({Icon,title,description})=><article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
     <div className="inline-flex rounded-xl bg-blue-50 p-3 text-blue-700"><Icon className="h-6 w-6"/></div>
     <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
     <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </article>)}
   </div>
   <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700"/>
    <p><strong className="text-slate-900">Disponible próximamente.</strong> La creación de empresas, los accesos de empleados y la contratación siguen en fase de pruebas. Todavía no se pueden iniciar suscripciones desde esta página.</p>
   </div>
  </section>
 </main>;
}
