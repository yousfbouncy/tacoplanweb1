'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HomeFinalCtaButton, HomeHeroActions } from '@/components/home-hero-actions';
import {
  Calculator,
  CalendarDays,
  CheckCircle2,
  Clock,
  Cloud,
  MapPin,
  ShieldCheck,
  Smartphone,
  Truck,
  WifiOff,
} from 'lucide-react';

type HomePageViewProps = {
  heroTitle: string;
  heroSubtitle: string;
  betaNotice: string;
  aboutText: string;
  benefitsTitle: string;
  benefitsSubtitle: string;
  finalCtaTitle: string;
};

export function HomePageView({
  heroTitle,
  heroSubtitle,
  betaNotice,
  aboutText,
  benefitsTitle,
  benefitsSubtitle,
  finalCtaTitle,
}: HomePageViewProps) {
  const appStoreHref = 'https://apps.apple.com/es/app/tacoplan/id6767099789';
  const apkHref =
    process.env.NEXT_PUBLIC_APK_URL ||
    'https://dutgxjwfjtqxmqonnjlp.supabase.co/storage/v1/object/public/apk/tacoplan%20version%202.2.2.apk';

  const highlightIndex = heroTitle.toLowerCase().indexOf('para ');
  const heroTitleBefore = highlightIndex >= 0 ? heroTitle.slice(0, highlightIndex) : heroTitle;
  const heroTitleAfter = highlightIndex >= 0 ? heroTitle.slice(highlightIndex) : null;

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 py-24 px-6 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left space-y-8">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-100 text-sm font-medium animate-fade-in">
                <Truck className="w-4 h-4 mr-2" />
                Sustituye tu libreta tradicional hoy
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
                {heroTitleAfter ? (
                  <>
                    {heroTitleBefore}
                    <span className="text-blue-400">{heroTitleAfter}</span>
                  </>
                ) : (
                  heroTitle
                )}
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                {heroSubtitle}
              </p>
              <p className="text-sm text-blue-200">{betaNotice}</p>
              <HomeHeroActions />
            </div>
            <div className="hidden lg:flex justify-center items-center relative animate-float">
              <div className="relative w-[320px] h-[640px] bg-slate-800 rounded-[3rem] border-[8px] border-slate-700 shadow-2xl overflow-hidden">
                <div className="absolute top-0 w-full h-8 bg-slate-700 flex justify-center items-end pb-1">
                  <div className="w-16 h-4 bg-slate-800 rounded-full"></div>
                </div>
                <div className="p-4 pt-12 space-y-4 bg-slate-900 h-full">
                  <div className="h-20 bg-blue-600 rounded-xl opacity-40 animate-pulse"></div>
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="h-24 bg-slate-800 rounded-xl"></div>
                    <div className="h-24 bg-slate-800 rounded-xl"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      </section>

      <section className="py-20 bg-white px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">¿Qué es Tacoplan?</h2>
          <div className="w-20 h-1.5 bg-blue-600 mx-auto rounded-full"></div>
          <p className="text-lg md:text-xl text-slate-600 leading-relaxed whitespace-pre-wrap">{aboutText}</p>
        </div>
      </section>

      <section className="py-20 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">{benefitsTitle}</h2>
            <p className="text-slate-600 text-lg whitespace-pre-wrap">{benefitsSubtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <BenefitCard
              icon={<CalendarDays className="w-8 h-8 text-blue-600" />}
              title="Registro de jornadas"
              description="Inicia y cierra tu jornada en segundos, sin libreta."
            />
            <BenefitCard
              icon={<Clock className="w-8 h-8 text-blue-600" />}
              title="Tiempos y descansos"
              description="Control de conducción, disponibilidad y descansos diarios/semanales."
            />
            <BenefitCard
              icon={<MapPin className="w-8 h-8 text-blue-600" />}
              title="Rutas y base"
              description="Registra viajes y base (nacional/internacional) de forma rápida."
            />
            <BenefitCard
              icon={<Calculator className="w-8 h-8 text-blue-600" />}
              title="Dietas en un clic"
              description="Resumen de dietas en tiempo real, sin cálculos manuales."
            />
            <BenefitCard
              icon={<WifiOff className="w-8 h-8 text-blue-600" />}
              title="Uso offline"
              description="¿Sin cobertura? Registra tus datos y se sincronizarán al recuperar red."
            />
            <BenefitCard
              icon={<Cloud className="w-8 h-8 text-blue-600" />}
              title="Resumen e informes"
              description="Resumen semanal y bisemanal, exportación e histórico siempre a mano."
            />
          </div>
        </div>
      </section>

      <section className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl font-bold text-slate-900">Cómo funciona</h2>
              <div className="space-y-6">
                <StepItem
                  number="1"
                  title="Registra el inicio de jornada"
                  description="Comienza tu día activando tu jornada con un botón. y descansos diarios es automatico."
                />
                <StepItem
                  number="2"
                  title="fin de jornada, Añade tu actividad"
                  description="Registra lugar fin, hora automatico editable, conducción, selecciona tipo de ruta y deita."
                />
                <StepItem number="3" title="Guarda viajes y paradas" description="Anota tus rutas" />
                <StepItem
                  number="4"
                  title="Consulta estadísticas"
                  description="Visualiza tu historial de dietas, y tiempos totales."
                />
              </div>
            </div>
            <div className="bg-blue-50 p-12 rounded-[2.5rem] border border-blue-100 shadow-inner">
              <div className="space-y-6">
                <div className="flex items-center space-x-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <span className="font-semibold text-slate-700">Normativa actualizada</span>
                </div>
                <div className="flex items-center space-x-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <span className="font-semibold text-slate-700">Exportación de informes</span>
                </div>
                <div className="flex items-center space-x-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <span className="font-semibold text-slate-700">Soporte multi-idioma</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-900 text-white px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="flex justify-center mb-4 text-blue-400">
            <ShieldCheck className="w-16 h-16" />
          </div>
          <p className="text-xl md:text-2xl font-light leading-relaxed italic text-slate-300">
            “Tacoplan no sustituye al tacógrafo oficial ni al asesoramiento profesional. Es una herramienta de apoyo avanzada para registrar y organizar la información del conductor profesional.”
          </p>
          <div className="flex flex-wrap justify-center gap-6 pt-4 opacity-80 grayscale hover:grayscale-0 transition-all">
            <a
              href={appStoreHref}
              target="_blank"
              rel="noreferrer"
              className="bg-slate-800 px-6 py-3 rounded-xl border border-slate-700 flex items-center space-x-3 hover:border-slate-600 transition"
            >
              <Smartphone className="w-6 h-6" />
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold text-slate-400 leading-none">Disponible en</p>
                <p className="text-sm font-bold">App Store</p>
              </div>
            </a>
            <a
              href={apkHref}
              target="_blank"
              rel="noreferrer"
              className="bg-slate-800 px-6 py-3 rounded-xl border border-slate-700 flex items-center space-x-3 hover:border-slate-600 transition"
            >
              <Smartphone className="w-6 h-6" />
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold text-slate-400 leading-none">Android</p>
                <p className="text-sm font-bold">Descarga APK</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      <section className="py-24 bg-blue-600 px-6 relative overflow-hidden text-white">
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold leading-tight whitespace-pre-line">{finalCtaTitle}</h2>
          <HomeFinalCtaButton />
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32"></div>
      </section>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-none shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-3xl p-4 bg-white">
      <CardHeader className="pb-2">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">{icon}</div>
        <CardTitle className="text-xl font-bold text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-600 leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

function StepItem({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex space-x-6">
      <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg shadow-blue-200">
        {number}
      </div>
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-1">{title}</h3>
        <p className="text-slate-600 whitespace-pre-wrap">{description}</p>
      </div>
    </div>
  );
}
