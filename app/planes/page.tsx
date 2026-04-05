import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

export const metadata = {
  title: 'Planes y Precios - Tacoplan',
  description: 'Elige el plan de Tacoplan que mejor se adapte a tus necesidades como conductor profesional. Planes básico y pro para control de jornada de camioneros.',
};

export default function PlanesPage() {
  return (
    <div className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Planes y Precios
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Elige el plan que mejor se adapte a tus necesidades como conductor profesional
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Card className="border-2 border-gray-200 hover:border-blue-300 transition">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl mb-2">Plan Básico</CardTitle>
              <CardDescription className="text-lg">
                Ideal para empezar
              </CardDescription>
              <div className="mt-4">
                <span className="text-5xl font-bold text-gray-900">Gratis</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Registro de jornada laboral</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Control de tiempos de conducción</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Registro de descansos</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Gestión básica de viajes</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Cálculo de dietas</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Uso offline</span>
                </li>
              </ul>
              <Link href="/registro">
                <Button variant="outline" className="w-full" size="lg">
                  Empezar Gratis
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-500 hover:border-blue-600 transition relative">
            <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-semibold">
              Recomendado
            </div>
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl mb-2">Plan Pro</CardTitle>
              <CardDescription className="text-lg">
                Para profesionales exigentes
              </CardDescription>
              <div className="mt-4">
                <span className="text-5xl font-bold text-gray-900">9,99€</span>
                <span className="text-gray-600">/mes</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Todo del Plan Básico</strong></span>
                </li>
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Informes y estadísticas avanzadas</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Exportación de datos en PDF y Excel</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Gestión avanzada de rutas internacionales</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Soporte prioritario</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Sincronización en múltiples dispositivos</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Sin publicidad</span>
                </li>
              </ul>
              <Link href="/registro">
                <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                  Seleccionar Plan Pro
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 bg-gray-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
            Preguntas Frecuentes sobre los Planes
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Puedo cambiar de plan en cualquier momento?
              </h3>
              <p className="text-gray-600">
                Sí, puedes actualizar o cambiar tu plan en cualquier momento desde la configuración de tu cuenta. Los cambios se aplicarán inmediatamente.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿El Plan Básico es realmente gratis?
              </h3>
              <p className="text-gray-600">
                Sí, el Plan Básico es completamente gratuito e incluye todas las funciones esenciales para el control de tu jornada laboral como conductor profesional.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Cómo funciona la facturación del Plan Pro?
              </h3>
              <p className="text-gray-600">
                El Plan Pro se factura mensualmente. Puedes cancelar tu suscripción en cualquier momento sin penalización.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Ofrecen descuentos para empresas?
              </h3>
              <p className="text-gray-600">
                Sí, ofrecemos planes especiales para empresas de transporte con múltiples conductores. Contacta con nuestro equipo en{' '}
                <a href="mailto:soporte@tacoplan.es" className="text-blue-600 hover:underline">
                  soporte@tacoplan.es
                </a>{' '}
                para más información.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            ¿Necesitas ayuda para elegir?
          </h2>
          <p className="text-gray-600 mb-6">
            Nuestro equipo está aquí para ayudarte a seleccionar el plan perfecto para ti
          </p>
          <Link href="/contacto">
            <Button size="lg">Contactar con Soporte</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
