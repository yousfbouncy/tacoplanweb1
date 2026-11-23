import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowRight, BarChart3, Building2, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, FileText, LockKeyhole, MapPin, Route, ShieldCheck, Truck, Users, Wallet} from 'lucide-react';

export const metadata:Metadata={
 title:'Tacoplan Empresas | Gestión de flotas, conductores, Tráfico y RRHH · En desarrollo',
 description:'Tacoplan para Empresas, plataforma en desarrollo para gestión de flotas de transporte: seguimiento de conductores y jornadas, asignación de viajes, revisión de dietas, pluses, RRHH e informes digitales.',
 keywords:['Tacoplan Empresas','software gestión de flotas','gestión de transporte por carretera','gestión de conductores','control de jornadas de conductores','software tráfico y logística','recursos humanos transporte','dietas conductores','gestión de viajes','informes conductores','seguimiento flota','gestión documental transporte'],
 alternates:{canonical:'https://tacoplan.es/empresas'},
 openGraph:{title:'Tacoplan Empresas | Plataforma de gestión para transporte',description:'Conecta conductores, Tráfico y Recursos Humanos en una sola plataforma. En desarrollo.',url:'https://tacoplan.es/empresas',type:'website'},
 robots:{index:true,follow:true}
};

function Stat({label,value,icon:Icon}:{label:string;value:string;icon:typeof Truck}){
 return <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><Icon className="mb-2 h-4 w-4 text-blue-600"/><div className="text-xl font-black text-slate-900">{value}</div><div className="mt-1 text-xs font-medium text-slate-500">{label}</div></div>;
}
function Window({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){
 return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_65px_rgba(12,35,72,.12)]">
   <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[#0c2448] px-4 py-3 text-white">
    <div><div className="text-sm font-black tracking-wide">{title}</div><div className="mt-0.5 text-[10px] text-blue-200">{subtitle}</div></div>
    <div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400"/><span className="h-2 w-2 rounded-full bg-sky-400/50"/><span className="h-2 w-2 rounded-full bg-sky-400/30"/></div>
   </div>
   {children}
   <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[10px] text-slate-500">Vista ilustrativa de la plataforma en desarrollo</div>
 </div>;
}
function TrafficPreview(){
 return <Window title="TACOPLAN · TRÁFICO" subtitle="Seguimiento operativo y asignación de viajes">
  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3">
    <Stat label="Conductores" value="10" icon={Users}/>
    <Stat label="En jornada" value="7" icon={Clock3}/>
    <Stat label="Viajes activos" value="5" icon={Route}/>
  </div>
  <div className="space-y-2 px-3 pb-4">
   <div className="flex justify-between py-1 text-xs font-bold text-slate-800"><span>Seguimiento de conductores</span><span className="text-blue-700">Estado actual</span></div>
   {[
    ['Conductor A','En ruta','Valencia → Madrid','bg-emerald-100 text-emerald-800'],
    ['Conductor B','Descanso','Barcelona → Zaragoza','bg-amber-100 text-amber-800'],
    ['Conductor C','En jornada','Lyon → Barcelona','bg-sky-100 text-sky-800'],
   ].map(row=><div key={row[0]} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-slate-100 bg-white p-3"><div><p className="text-xs font-bold text-slate-800">{row[0]}</p><p className="mt-1 text-[11px] text-slate-500">{row[2]}</p></div><span className={'rounded-full px-2 py-1 text-[10px] font-bold '+row[3]}>{row[1]}</span></div>)}
   <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white"><Route className="h-3.5 w-3.5"/> Asignación de viajes</div>
  </div>
 </Window>;
}
function HrPreview(){
 return <Window title="TACOPLAN · RECURSOS HUMANOS" subtitle="Revisión de conceptos y cierre de periodos">
  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3">
   <Stat label="Conductores" value="10" icon={Truck}/>
   <Stat label="Registros" value="128" icon={FileText}/>
   <Stat label="Pendientes" value="4" icon={ClipboardCheck}/>
  </div>
  <div className="px-3 pb-4">
   <div className="mb-2 flex items-center justify-between py-1 text-xs font-bold text-slate-800"><span>Liquidación del periodo</span><span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] text-blue-700">01/11 – 30/11</span></div>
   <div className="overflow-hidden rounded-lg border border-slate-200">
    <div className="grid grid-cols-3 bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600"><span>Conductor</span><span>Dietas</span><span>Estado</span></div>
    {[
     ['Conductor A','24 registros','Confirmado'],
     ['Conductor B','22 registros','Pendiente'],
     ['Conductor C','25 registros','Confirmado'],
    ].map(row=><div key={row[0]} className="grid grid-cols-3 border-t border-slate-100 px-3 py-3 text-[11px] text-slate-700"><span className="font-semibold">{row[0]}</span><span>{row[1]}</span><span className={row[2]==='Confirmado'?'font-semibold text-emerald-700':'font-semibold text-amber-600'}>{row[2]}</span></div>)}
   </div>
   <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white"><FileText className="h-3.5 w-3.5"/> Cierre de liquidaciones</div>
  </div>
 </Window>;
}
function AdminPreview(){
 return <Window title="TACOPLAN · ADMINISTRACIÓN" subtitle="Empresa, personal y configuración de la plantilla">
  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3">
   <Stat label="Conductores" value="10" icon={Truck}/>
   <Stat label="Tráfico" value="2" icon={Route}/>
   <Stat label="RRHH" value="2" icon={Users}/>
  </div>
  <div className="space-y-2 px-3 pb-4">
   <p className="py-1 text-xs font-bold text-slate-800">Gestión de personal y permisos</p>
   {[
    ['Conductores','Registro de jornadas y actividad',Truck],
    ['Tráfico','Viajes, seguimiento y revisiones',Route],
    ['RRHH','Dietas, pluses y liquidaciones',Wallet],
   ].map(([title,description,Icon])=><div key={title as string} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3"><span className="rounded-lg bg-blue-50 p-2"><Icon className="h-4 w-4 text-blue-700"/></span><div><p className="text-xs font-bold text-slate-800">{title as string}</p><p className="mt-0.5 text-[11px] text-slate-500">{description as string}</p></div><CheckCircle2 className="ml-auto h-4 w-4 text-sky-500"/></div>)}
   <div className="rounded-lg bg-slate-100 px-3 py-2 text-center text-[11px] font-medium text-slate-700">Configuración de condiciones, accesos y permisos</div>
  </div>
 </Window>;
}
const features=[
 {icon:Clock3,title:'Control de jornadas y actividades',text:'Consulta los tiempos registrados por los conductores, la conducción, la disponibilidad y sus descansos desde una vista centralizada.'},
 {icon:Route,title:'Asignación y gestión de viajes',text:'Organiza los servicios de carga y descarga y envía viajes al conductor desde el departamento de Tráfico.'},
 {icon:MapPin,title:'Seguimiento operativo',text:'Visualiza el estado de las jornadas y la localización compartida, con los permisos correspondientes.'},
 {icon:Wallet,title:'Dietas, pluses y conceptos',text:'Revisa las dietas nacionales e internacionales, domingos, festivos y conceptos adicionales según la configuración de cada conductor.'},
 {icon:ClipboardCheck,title:'Revisión y confirmaciones',text:'Tráfico comprueba registros y propone correcciones documentadas antes de trasladar la información a RRHH.'},
 {icon:FileText,title:'Informes y cierres de periodo',text:'RRHH accede a datos consolidados por conductor y prepara liquidaciones sin solicitar informes individuales continuamente.'}
];
export default function EmpresasPage(){
 return <div className="bg-[#f4f7fb] text-slate-900">
  <div className="border-b border-sky-300 bg-[#b9e7ff] px-4 py-2 text-center text-xs font-extrabold uppercase tracking-[.18em] text-[#082447] sm:text-sm">🚧 En desarrollo · Acceso a la plataforma todavía no disponible para empresas</div>
  <header className="border-b border-slate-200 bg-white">
   <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
    <Link href="/empresas" className="flex items-center gap-2 text-lg font-black tracking-tight text-[#102d5d] sm:text-xl"><Building2 className="h-6 w-6 text-blue-600"/> Tacoplan <span className="font-medium">Empresas</span></Link>
    <div className="flex items-center gap-3"><span className="hidden text-xs font-medium text-slate-500 sm:inline">Acceso público desactivado</span><Link href="/empresas/acceso" aria-label="Acceso privado del desarrollador" className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"><LockKeyhole className="h-4 w-4"/> Acceso</Link></div>
   </div>
  </header>
  <section className="overflow-hidden bg-gradient-to-br from-[#071b38] via-[#103467] to-[#175aa3] text-white">
   <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-6 md:grid-cols-2 md:py-20">
    <div>
     <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/40 bg-sky-400/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-sky-200">Plataforma en desarrollo</span>
     <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-5xl">La gestión del transporte, <span className="text-sky-300">conectada en un solo lugar.</span></h1>
     <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">Tacoplan para Empresas es una plataforma de gestión de conductores, flotas y operaciones de transporte que conecta Administración, Tráfico y Recursos Humanos con los registros de los conductores.</p>
     <div className="mt-7 flex flex-wrap gap-3 text-xs font-semibold text-sky-100"><span className="rounded-lg border border-white/20 px-3 py-2">Gestión de conductores</span><span className="rounded-lg border border-white/20 px-3 py-2">Tráfico y viajes</span><span className="rounded-lg border border-white/20 px-3 py-2">RRHH y dietas</span></div>
     <p className="mt-7 flex items-start gap-2 text-sm text-sky-200"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/> Acceso empresarial no disponible mientras finalizamos el desarrollo y las pruebas.</p>
    </div>
    <div className="relative"><div className="absolute -inset-5 rounded-3xl bg-sky-300/10 blur-2xl"/><div className="relative"><TrafficPreview/></div></div>
   </div>
  </section>
  <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6" aria-labelledby="roles-title">
   <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.15em] text-blue-700">Una plataforma, tres departamentos</p><h2 id="roles-title" className="mt-3 text-3xl font-black sm:text-4xl">Cada departamento ve lo que necesita</h2><p className="mt-4 text-slate-600">Tacoplan Empresas está diseñado para coordinar a los responsables del transporte, simplificar los procesos y reducir el intercambio manual de registros.</p></div>
   <div className="mt-10 grid items-center gap-7 lg:grid-cols-2"><TrafficPreview/><div><span className="text-sm font-bold text-blue-700">PANEL DE TRÁFICO</span><h3 className="mt-2 text-2xl font-extrabold">Organización y seguimiento de viajes</h3><p className="mt-4 leading-relaxed text-slate-600">El departamento de Tráfico podrá asignar viajes a sus conductores, consultar el estado de la jornada, revisar actividad, descansos y recibir información de los servicios en curso. Las revisiones de dietas se trasladarán al flujo de confirmación correspondiente.</p><div className="mt-5 flex flex-wrap gap-2">{['Viajes asignados','Jornadas','Disponibilidad','Revisión de registros'].map(x=><span key={x} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">{x}</span>)}</div></div></div>
   <div className="mt-16 grid items-center gap-7 lg:grid-cols-2"><div className="lg:order-2"><HrPreview/></div><div className="lg:order-1"><span className="text-sm font-bold text-blue-700">PANEL DE RECURSOS HUMANOS</span><h3 className="mt-2 text-2xl font-extrabold">Dietas y liquidaciones sin perseguir informes</h3><p className="mt-4 leading-relaxed text-slate-600">RRHH podrá consultar las dietas, pluses y registros confirmados de cada conductor, filtrar periodos personalizados y preparar cierres de liquidación. Cada departamento dispone de permisos específicos, evitando mostrar información que no necesita.</p><div className="mt-5 flex flex-wrap gap-2">{['Dietas por conductor','Pluses','Periodos libres','Cierre mensual'].map(x=><span key={x} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">{x}</span>)}</div></div></div>
   <div className="mt-16 grid items-center gap-7 lg:grid-cols-2"><AdminPreview/><div><span className="text-sm font-bold text-blue-700">ADMINISTRACIÓN DE EMPRESA</span><h3 className="mt-2 text-2xl font-extrabold">Toda la plantilla y sus permisos, organizados</h3><p className="mt-4 leading-relaxed text-slate-600">La empresa podrá configurar su plantilla, crear perfiles de conductor, Tráfico y RRHH, asignar responsables y establecer las condiciones de dietas, complementos y gestión para cada empleado.</p><div className="mt-5 flex flex-wrap gap-2">{['Alta de empleados','Roles y permisos','Configuración','Asignaciones'].map(x=><span key={x} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">{x}</span>)}</div></div></div>
  </section>
  <section className="bg-white py-16"><div className="mx-auto max-w-7xl px-5 sm:px-6"><p className="text-xs font-black uppercase tracking-[.15em] text-blue-700">Software para empresas de transporte</p><h2 className="mt-3 max-w-3xl text-3xl font-black sm:text-4xl">Funciones pensadas para la gestión de flotas y conductores profesionales</h2><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(({icon:Icon,title,text})=><article key={title} className="rounded-2xl border border-slate-200 bg-[#f7faff] p-6"><div className="inline-flex rounded-xl bg-blue-100 p-3 text-blue-700"><Icon className="h-5 w-5"/></div><h3 className="mt-4 font-extrabold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p></article>)}</div></div></section>
  <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6"><div className="grid gap-8 rounded-3xl bg-[#0c274e] p-8 text-white sm:p-10 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-sky-300">Conectado con la app Tacoplan</p><h2 className="mt-3 text-2xl font-black sm:text-3xl">De la jornada del conductor a cada departamento</h2><p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200">El conductor registra su actividad desde la aplicación Tacoplan. Tráfico revisa la información operativa y RRHH consulta los conceptos e informes autorizados para preparar las liquidaciones. Todo dentro de un flujo conectado.</p></div><Link href="/" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-400 px-5 py-3 font-bold text-[#0b2549] hover:bg-sky-300">Conocer Tacoplan <ArrowRight className="h-4 w-4"/></Link></div></section>
  <section className="border-t border-slate-200 bg-white px-5 py-12 text-center"><div className="mx-auto max-w-2xl"><span className="inline-block rounded-full bg-amber-100 px-4 py-2 text-xs font-black uppercase tracking-wider text-amber-900">En desarrollo</span><h2 className="mt-5 text-3xl font-black">Próximamente: Tacoplan para Empresas</h2><p className="mt-4 text-sm leading-relaxed text-slate-600">La plataforma empresarial permanece cerrada al público mientras continúa su desarrollo. Las pantallas mostradas son representaciones ilustrativas de las funciones previstas y pueden cambiar en la versión final.</p><p className="mt-5 text-sm font-semibold text-slate-700">El acceso privado está reservado al desarrollador.</p></div></section>
 </div>;
}
