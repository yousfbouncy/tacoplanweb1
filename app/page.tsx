import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Truck, 
  Clock, 
  MapPin, 
  Calculator, 
  Cloud, 
  WifiOff, 
  CheckCircle2, 
  ShieldCheck,
  CalendarDays,
  Smartphone
} from 'lucide-react';

export const metadata = {
  title: 'Tacoplan | App para camioneros, control de jornada, viajes y dietas',
  description: 'Tacoplan es la agenda inteligente para conductores de camión y tráiler. Registra jornada, conducción, descansos, viajes y dietas automáticamente sin cálculos manuales. La mejor app para transportistas profesionales.',
  keywords: 'app para camioneros, agenda camionero, registro jornada conductor, control tacógrafo, tiempos de conducción, descansos camión, dietas camioneros, gestión viajes camión, app transporte, app transportistas, rutas camión, jornada laboral conductor, control horas conducción, tacógrafo digital, logística transporte, app para chóferes, app para tráiler'
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 py-24 px-6 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left space-y-8">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-100 text-sm font-medium animate-fade-in">
                <Truck className="w-4 h-4 mr-2" />
                Sustituye tu libreta tradicional hoy
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
                La agenda inteligente <span className="text-blue-400">para camioneros</span>
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Registra tu jornada, conducción, descansos, viajes y dietas sin libreta ni cálculos manuales.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                <Link href="/registro">
                  <Button size="lg" className="bg-white text-blue-800 hover:bg-blue-50 text-lg px-8 py-7 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95">
                    Registrarse Gratis
                  </Button>
                </Link>
                <Link href="/planes">
                  <Button size="lg" variant="outline" className="border-blue-400 text-white hover:bg-blue-700/50 text-lg px-8 py-7 rounded-2xl backdrop-blur-sm">
                    Ver planes
                  </Button>
                </Link>
              </div>
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
        {/* Decorative elements */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      </section>

      {/* Qué es Tacoplan Section */}
      <section className="py-20 bg-white px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">¿Qué es Tacoplan?</h2>
          <div className="w-20 h-1.5 bg-blue-600 mx-auto rounded-full"></div>
          <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
            Tacoplan es la herramienta definitiva diseñada por y para transportistas profesionales. Sustituye la agenda o libreta tradicional del conductor por una solución digital sincronizada que hace los cálculos pesados por ti, permitiéndote centrarte en lo que importa: la carretera.
          </p>
        </div>
      </section>

      {/* Beneficios Section */}
      <section className="py-20 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">Diseñado para tu día a día</h2>
            <p className="text-slate-600 text-lg">Todo lo que necesitas para gestionar tu jornada profesional</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <BenefitCard 
              icon={<CalendarDays className="w-8 h-8 text-blue-600" />}
              title="Registro de jornada"
              description="Controla el inicio y fin de tu jornada laboral con un solo toque."
            />
            <BenefitCard 
              icon={<Clock className="w-8 h-8 text-blue-600" />}
              title="Conducción y descansos"
              description="Monitoriza tus tiempos para cumplir con el tacógrafo sin errores."
            />
            <BenefitCard 
              icon={<MapPin className="w-8 h-8 text-blue-600" />}
              title="Gestión de viajes"
              description="Organiza tus rutas nacionales e internacionales de forma eficiente."
            />
            <BenefitCard 
              icon={<Calculator className="w-8 h-8 text-blue-600" />}
              title="Cálculo de dietas"
              description="Cálculos automáticos según tus rutas y convenios sin esfuerzo manual."
            />
            <BenefitCard 
              icon={<WifiOff className="w-8 h-8 text-blue-600" />}
              title="Uso offline"
              description="¿Sin cobertura? Registra tus datos y se sincronizarán al recuperar red."
            />
            <BenefitCard 
              icon={<Cloud className="w-8 h-8 text-blue-600" />}
              title="Sincronización total"
              description="Accede a tus datos desde cualquier dispositivo de forma segura."
            />
          </div>
        </div>
      </section>

      {/* Cómo funciona Section */}
      <section className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl font-bold text-slate-900">Cómo funciona</h2>
              <div className="space-y-6">
                <StepItem 
                  number="1" 
                  title="Registra el inicio de jornada" 
                  description="Comienza tu día activando tu jornada con un botón." 
                />
                <StepItem 
                  number="2" 
                  title="Añade tu actividad" 
                  description="Registra conducción, pausas, otros trabajos y descansos diarios." 
                />
                <StepItem 
                  number="3" 
                  title="Guarda viajes y paradas" 
                  description="Anota tus rutas y paradas importantes durante el trayecto." 
                />
                <StepItem 
                  number="4" 
                  title="Consulta estadísticas" 
                  description="Visualiza tu historial de dietas, kilómetros y tiempos totales." 
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

      {/* Google Play / Confidence Section */}
      <section className="py-16 bg-slate-900 text-white px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="flex justify-center mb-4 text-blue-400">
            <ShieldCheck className="w-16 h-16" />
          </div>
          <p className="text-xl md:text-2xl font-light leading-relaxed italic text-slate-300">
            “Tacoplan no sustituye al tacógrafo oficial ni al asesoramiento profesional. Es una herramienta de apoyo avanzada para registrar y organizar la información del conductor profesional.”
          </p>
          <div className="flex flex-wrap justify-center gap-6 pt-4 opacity-70 grayscale hover:grayscale-0 transition-all">
            {/* Aquí irían logos de Google Play, etc */}
            <div className="bg-slate-800 px-6 py-3 rounded-xl border border-slate-700 flex items-center space-x-3 cursor-pointer">
              <Smartphone className="w-6 h-6" />
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold text-slate-400 leading-none">Disponible en</p>
                <p className="text-sm font-bold">Google Play</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-blue-600 px-6 relative overflow-hidden text-white">
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            Empieza a controlar tu jornada <br className="hidden md:block" /> sin libreta hoy mismo
          </h2>
          <Link href="/registro" className="inline-block">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 text-xl px-12 py-8 rounded-2xl shadow-2xl transition-all hover:scale-105">
              Crear cuenta ahora
            </Button>
          </Link>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32"></div>
      </section>
    </div>
  );
}

function BenefitCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="border-none shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-3xl p-4 bg-white">
      <CardHeader className="pb-2">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
          {icon}
        </div>
        <CardTitle className="text-xl font-bold text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-600 leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

function StepItem({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="flex space-x-6">
      <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg shadow-blue-200">
        {number}
      </div>
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-1">{title}</h3>
        <p className="text-slate-600">{description}</p>
      </div>
    </div>
  );
}
