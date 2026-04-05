import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleCheck as CheckCircle, Clock, MapPin, Calculator, Smartphone, Cloud } from 'lucide-react';

export default function Home() {
  return (
    <div className="bg-white">
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Tacoplan - App para Camioneros
            </h1>
            <p className="text-xl md:text-2xl mb-4 text-blue-100">
              Control Profesional de Jornada Laboral para Conductores de Camión
            </p>
            <p className="text-lg md:text-xl mb-8 text-blue-200 max-w-3xl mx-auto">
              Registra tu jornada, controla tiempos de conducción y descanso, gestiona rutas y calcula dietas automáticamente. Sustituye la libreta tradicional por una solución digital profesional.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/registro">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8">
                  Registrarse Gratis
                </Button>
              </Link>
              <Link href="/planes">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-blue-700 text-lg px-8">
                  Ver Planes
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              ¿Qué es Tacoplan?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tacoplan es una aplicación profesional diseñada específicamente para conductores de camión y tráiler que necesitan llevar un control exhaustivo de su jornada laboral, cumpliendo con la normativa de transporte.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Sustituye tu libreta tradicional
              </h3>
              <p className="text-gray-600 mb-4">
                Olvídate de apuntar manualmente en tu libreta. Tacoplan digitaliza todo el proceso de registro de tu jornada, conducción, descansos, viajes y dietas de manera intuitiva y eficiente.
              </p>
              <p className="text-gray-600">
                Diseñado por profesionales del transporte para profesionales del transporte. Control total de tu actividad diaria con la tecnología más avanzada adaptada al sector del transporte por carretera.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                  <span className="text-gray-700"><strong>App para transportistas</strong> profesionales</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                  <span className="text-gray-700"><strong>Control de tacógrafo</strong> digital</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                  <span className="text-gray-700"><strong>Registro de jornada</strong> conductor completo</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                  <span className="text-gray-700"><strong>Gestión de rutas</strong> nacionales e internacionales</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                  <span className="text-gray-700"><strong>Cálculo automático</strong> de dietas</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Cómo Funciona Tacoplan
            </h2>
            <p className="text-xl text-gray-600">
              Gestión completa de tu actividad como conductor profesional
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Smartphone className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>1. Descarga e Inicia Sesión</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Descarga Tacoplan desde Google Play, regístrate con tu email o Google y configura tu perfil de conductor en segundos.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>2. Registra tu Jornada</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Registra tus tiempos de conducción, descansos, pausas y otras actividades. La app controla automáticamente el cumplimiento de la normativa.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Calculator className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>3. Gestiona y Calcula</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Gestiona tus viajes, rutas nacionales e internacionales y deja que Tacoplan calcule automáticamente tus dietas según configuración.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Beneficios de Usar Tacoplan
            </h2>
            <p className="text-xl text-gray-600">
              Todo lo que necesitas para el control de tu actividad como camionero
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Clock className="h-10 w-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Control de Jornada</h3>
              <p className="text-gray-600">
                Registra y controla tus tiempos de conducción, descansos obligatorios y pausas. Cumple con la normativa de transporte sin esfuerzo.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <MapPin className="h-10 w-10 text-green-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Gestión de Rutas y Viajes</h3>
              <p className="text-gray-600">
                Organiza tus viajes nacionales e internacionales. Registra origen, destino, kilómetros y toda la información relevante de cada ruta.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <Calculator className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Cálculo de Dietas</h3>
              <p className="text-gray-600">
                Calcula automáticamente tus dietas según configuración personalizada. Diferencia entre dietas nacionales e internacionales.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <CheckCircle className="h-10 w-10 text-red-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Registro de Conducción</h3>
              <p className="text-gray-600">
                Lleva un registro detallado de todas tus horas de conducción. Control preciso de tiempos para cumplir con el tacógrafo digital.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <Cloud className="h-10 w-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Uso Offline y Sincronización</h3>
              <p className="text-gray-600">
                Trabaja sin conexión y sincroniza tus datos cuando tengas red. Tus registros siempre seguros en la nube.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <Smartphone className="h-10 w-10 text-teal-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">App para Transporte</h3>
              <p className="text-gray-600">
                Interfaz intuitiva diseñada para conductores profesionales. Rápida, fácil de usar y optimizada para el día a día en carretera.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Empieza a Usar Tacoplan Hoy
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Únete a los conductores profesionales que ya confían en Tacoplan para gestionar su jornada laboral. Regístrate gratis y descubre cómo simplificar tu trabajo diario.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/registro">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8">
                Crear Cuenta Gratis
              </Button>
            </Link>
            <Link href="/contacto">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-blue-700 text-lg px-8">
                Contactar Soporte
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
