'use client';

import { ArrowRight, BellRing, Calculator, CheckCircle2, Clock3, Coffee, Download, Gauge, MapPinned, ShieldAlert, Smartphone, Truck, Wallet } from 'lucide-react';
import { HomeHeroActions, HomeFinalCtaButton } from '@/components/home-hero-actions';

type Props = { heroTitle: string; heroSubtitle: string; betaNotice: string; aboutText: string; benefitsTitle: string; benefitsSubtitle: string; finalCtaTitle: string };
const features = [
  { icon: Clock3, title: 'Jornadas en segundos', text: 'Registra el inicio y el final de tu jornada sin depender de una libreta.' },
  { icon: Gauge, title: 'Conducción y descansos', text: 'Consulta tus registros diarios, semanales y bisemanales desde el móvil.' },
  { icon: ShieldAlert, title: 'Avisos preventivos', text: 'Recibe alertas de posibles excesos e incumplimientos según los datos registrados.' },
  { icon: Coffee, title: 'Descansos y compensaciones', text: 'Ten controlados los descansos reducidos y las compensaciones pendientes.' },
  { icon: Wallet, title: 'Dietas y pluses', text: 'Calcula importes con las tarifas que configures para tu trabajo.' },
  { icon: Calculator, title: 'Estimación de nómina', text: 'Revisa una estimación de lo que te corresponde cobrar.' },
];
export function HomePageView({ heroTitle, heroSubtitle, betaNotice, aboutText, benefitsTitle, benefitsSubtitle, finalCtaTitle }: Props) {
  return <div className="bg-[#081225] text-white">
    <section className="relative overflow-hidden border-b border-white/10 px-5 pb-20 pt-16 sm:px-8 lg:pt-24">
      <div className="pointer-events-none absolute -right-24 top-0 h-[450px] w-[450px] rounded-full bg-blue-600/25 blur-[110px]" />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-cyan-600/10 blur-[100px]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-400/10 px-4 py-2 text-sm text-blue-200"><Truck className="h-4 w-4" /> Hecha por un camionero, para camioneros</span>
          <h1 className="mt-7 max-w-xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">{heroTitle || 'Tu jornada bajo control. Sin libreta ni cálculos manuales.'}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">{heroSubtitle || 'Controla tus tiempos de conducción, descansos y dietas desde el móvil. Tacoplan te ayuda a anticiparte a posibles infracciones.'}</p>
          <div className="mt-8"><HomeHeroActions /></div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-400"/> Registro rápido</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-400"/> Avisos preventivos</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-400"/> iPhone y Android</span>
          </div>
          <p className="mt-6 text-xs text-slate-500">{betaNotice}</p>
        </div>
        <div className="relative mx-auto w-full max-w-[440px]" aria-label="Ilustración de las principales funciones de Tacoplan">
          <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-tr from-blue-500/15 to-cyan-400/5 blur-2xl"/>
          <div className="relative rounded-[2.5rem] border border-white/15 bg-[#111f39] p-5 shadow-[0_35px_90px_rgba(0,0,0,.4)] sm:p-7">
            <div className="mb-7 flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600"><Truck className="h-6 w-6"/></span><div><p className="font-bold">Tacoplan</p><p className="text-xs text-slate-400">Tu jornada a mano</p></div></div><Smartphone className="h-5 w-5 text-blue-300"/></div>
            <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-600/25 to-blue-900/10 p-5"><div className="flex items-center gap-2 text-blue-200"><Clock3 className="h-5 w-5"/><span className="font-semibold">Control de jornada</span></div><p className="mt-3 text-sm leading-relaxed text-slate-200">Consulta conducción, descansos y límites registrados estés donde estés.</p></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><ShieldAlert className="mb-3 h-6 w-6 text-amber-300"/><p className="font-semibold">Alertas</p><p className="mt-1 text-xs text-slate-400">Prevención de posibles infracciones</p></div><div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><Wallet className="mb-3 h-6 w-6 text-emerald-300"/><p className="font-semibold">Dietas</p><p className="mt-1 text-xs text-slate-400">Control de importes y pluses</p></div></div>
            <p className="mt-5 text-center text-[11px] text-slate-500">Representación ilustrativa de funcionalidades</p>
          </div>
        </div>
      </div>
    </section>
    <section className="border-b border-white/10 bg-white/[.025] px-5 py-16 sm:px-8"><div className="mx-auto max-w-4xl text-center"><p className="text-sm font-bold uppercase tracking-[.2em] text-sky-400">Por qué existe Tacoplan</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">Menos tiempo calculando. Más tranquilidad en ruta.</h2><p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-slate-300">{aboutText || 'Tacoplan nació de la experiencia de un conductor internacional: tener jornadas, conducción y descansos a mano, evitar apuntes dispersos y detectar posibles errores antes de que se conviertan en un problema.'}</p></div></section>
    <section id="funciones" className="px-5 py-20 sm:px-8"><div className="mx-auto max-w-6xl"><div className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-sky-400">Funciones para el día a día</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">{benefitsTitle || 'Todo lo importante en un solo lugar'}</h2><p className="mt-4 text-slate-300">{benefitsSubtitle || 'Datos accesibles y cálculos que te ahorran trabajo.'}</p></div><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map(({icon: Icon,title,text})=><article key={title} className="rounded-2xl border border-white/10 bg-white/[.04] p-6 transition hover:border-blue-400/40 hover:bg-white/[.07]"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300"><Icon className="h-6 w-6"/></div><h3 className="text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-300">{text}</p></article>)}</div></div></section>
    <section className="bg-[#101e36] px-5 py-20 sm:px-8"><div className="mx-auto max-w-6xl"><div className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-sky-400">Así de sencillo</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">Tu jornada en dos momentos</h2></div><div className="mt-9 grid gap-5 md:grid-cols-3"><div className="rounded-2xl bg-white/5 p-6"><span className="text-3xl font-black text-blue-300">01</span><h3 className="mt-4 text-xl font-bold">Inicia jornada</h3><p className="mt-2 text-slate-300">Registra cuándo empiezas a trabajar.</p></div><div className="rounded-2xl bg-white/5 p-6"><span className="text-3xl font-black text-blue-300">02</span><h3 className="mt-4 text-xl font-bold">Cierra jornada</h3><p className="mt-2 text-slate-300">Completa los datos necesarios cuando termines.</p></div><div className="rounded-2xl bg-white/5 p-6"><span className="text-3xl font-black text-blue-300">03</span><h3 className="mt-4 text-xl font-bold">Consulta el resumen</h3><p className="mt-2 text-slate-300">Revisa tus registros, descansos y estimaciones de dietas.</p></div></div><p className="mt-6 text-sm text-slate-400">Los cálculos dependen de la información registrada. Tacoplan no sustituye al tacógrafo oficial.</p></div></section>
    <section className="px-5 py-20 text-center sm:px-8"><div className="mx-auto max-w-3xl"><div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/15"><Download className="h-8 w-8 text-blue-300"/></div><h2 className="whitespace-pre-line text-3xl font-bold sm:text-5xl">{finalCtaTitle || 'Empieza a llevar tu jornada a mano'}</h2><p className="mt-5 text-slate-300">Descarga Tacoplan y descubre cómo puede ayudarte en carretera.</p><div className="mt-7 flex justify-center"><HomeFinalCtaButton/></div></div></section>
  </div>;
}
