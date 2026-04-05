import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CircleHelp as HelpCircle, Mail, Book } from 'lucide-react';

export const metadata = {
  title: 'Soporte - Tacoplan',
  description: 'Centro de ayuda de Tacoplan. Encuentra respuestas a tus preguntas sobre control de jornada, tacógrafo, rutas y dietas para camioneros.',
};

export default function SoportePage() {
  return (
    <div className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Centro de Soporte
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Encuentra respuestas a tus preguntas y aprende a sacar el máximo partido a Tacoplan
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <HelpCircle className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Preguntas Frecuentes</CardTitle>
              <CardDescription>
                Respuestas a las dudas más comunes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                Encuentra soluciones rápidas a las preguntas más habituales sobre Tacoplan.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Book className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Guías de Uso</CardTitle>
              <CardDescription>
                Aprende a usar todas las funciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                Tutoriales paso a paso para dominar cada función de la aplicación.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Mail className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>Contacto Directo</CardTitle>
              <CardDescription>
                Habla con nuestro equipo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                ¿No encuentras lo que buscas? Contáctanos directamente.
              </p>
              <Link href="/contacto">
                <Button variant="outline">Contactar</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Preguntas Frecuentes
          </h2>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg font-semibold">
                ¿Cómo empiezo a usar Tacoplan?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                Descarga Tacoplan desde Google Play, regístrate con tu email o cuenta de Google, y completa tu perfil. La aplicación te guiará paso a paso en la configuración inicial, incluyendo la configuración de tus dietas nacionales e internacionales.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg font-semibold">
                ¿Cómo registro mi jornada laboral?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                En la pantalla principal, pulsa el botón de inicio de jornada cuando comiences tu día laboral. La app registrará automáticamente el tiempo. Puedes registrar conducción, descansos, pausas y otras actividades tocando los botones correspondientes. Todo se guarda automáticamente.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg font-semibold">
                ¿Puedo usar Tacoplan sin conexión a Internet?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                Sí, Tacoplan funciona completamente offline. Todos tus registros se guardan localmente en tu dispositivo y se sincronizan automáticamente con la nube cuando vuelvas a tener conexión. Así puedes trabajar en cualquier lugar sin preocuparte por la cobertura.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-lg font-semibold">
                ¿Cómo calculo mis dietas?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                Tacoplan calcula automáticamente tus dietas basándose en los viajes que registres. En la sección de configuración puedes establecer las cantidades de dieta nacional e internacional. La app detectará automáticamente si tu viaje es nacional o internacional según los datos que introduzcas.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-lg font-semibold">
                ¿Cumple Tacoplan con la normativa de transporte?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                Tacoplan está diseñado para ayudarte a cumplir con la normativa de tiempos de conducción y descanso. La app te alerta cuando te acercas a los límites legales de conducción y te recuerda cuándo debes tomar descansos obligatorios. Sin embargo, es importante que como conductor siempre verifiques el cumplimiento de la normativa vigente.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-lg font-semibold">
                ¿Cómo gestiono rutas internacionales?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                Al crear un nuevo viaje, selecciona el país de origen y destino. La app reconocerá automáticamente si es una ruta internacional y aplicará las configuraciones correspondientes, incluyendo el cálculo de dietas internacionales y el control de tiempos según la normativa europea.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7">
              <AccordionTrigger className="text-lg font-semibold">
                ¿Puedo exportar mis datos?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                Sí, con el Plan Pro puedes exportar todos tus datos en formato PDF y Excel. Esto es útil para presentar informes a tu empresa, llevar tu propia contabilidad o tener un respaldo de tu actividad laboral. El Plan Básico permite visualizar todos los datos pero no exportarlos.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8">
              <AccordionTrigger className="text-lg font-semibold">
                ¿Es seguro guardar mis datos en Tacoplan?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                Absolutamente. Todos tus datos se almacenan de forma segura y cifrada. Utilizamos servidores seguros y cumplimos con todas las regulaciones de protección de datos. Tus datos son solo tuyos y nunca los compartiremos con terceros sin tu consentimiento explícito.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-9">
              <AccordionTrigger className="text-lg font-semibold">
                ¿Cómo cancelo mi suscripción Pro?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                Puedes cancelar tu suscripción en cualquier momento desde la configuración de tu cuenta en la app. No hay penalizaciones ni cargos adicionales. Una vez cancelada, seguirás teniendo acceso al Plan Pro hasta el final del periodo de facturación actual, momento en el cual pasarás automáticamente al Plan Básico.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-10">
              <AccordionTrigger className="text-lg font-semibold">
                ¿Qué hago si encuentro un problema o error?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                Si encuentras algún problema, puedes contactarnos directamente en{' '}
                <a href="mailto:soporte@tacoplan.es" className="text-blue-600 hover:underline">
                  soporte@tacoplan.es
                </a>
                . Describe el problema con el máximo detalle posible e incluye capturas de pantalla si es necesario. Nuestro equipo responderá en menos de 24 horas laborables.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-16 bg-blue-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              ¿Necesitas más ayuda?
            </h2>
            <p className="text-gray-600 mb-6">
              Nuestro equipo de soporte está disponible para ayudarte con cualquier duda o problema
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contacto">
                <Button size="lg">Contactar Soporte</Button>
              </Link>
              <a href="mailto:soporte@tacoplan.es">
                <Button variant="outline" size="lg">
                  Enviar Email
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
