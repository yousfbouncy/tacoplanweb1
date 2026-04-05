export const metadata = {
  title: 'Política de Privacidad - Tacoplan',
  description: 'Política de privacidad de Tacoplan. Información sobre cómo recopilamos, usamos y protegemos tus datos personales.',
};

export default function PoliticaPrivacidadPage() {
  return (
    <div className="bg-white py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Política de Privacidad
        </h1>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
          <p className="text-sm text-gray-500">
            Última actualización: {new Date().toLocaleDateString('es-ES')}
          </p>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introducción</h2>
            <p>
              En Tacoplan, desarrollada por Youssef, nos tomamos muy en serio la privacidad de nuestros usuarios. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos tu información personal cuando utilizas nuestra aplicación móvil y servicios web.
            </p>
            <p>
              Al usar Tacoplan, aceptas las prácticas descritas en esta política. Si no estás de acuerdo con algún aspecto de esta política, por favor no uses nuestra aplicación.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Datos que Recopilamos</h2>
            <p>Recopilamos los siguientes tipos de información:</p>
            <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">2.1. Información de Cuenta</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Nombre completo</li>
              <li>Dirección de correo electrónico</li>
              <li>Contraseña (almacenada de forma cifrada)</li>
              <li>Información de perfil de Google (si inicias sesión con Google)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">2.2. Datos de Uso de la Aplicación</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Registros de jornada laboral</li>
              <li>Tiempos de conducción y descanso</li>
              <li>Información de viajes y rutas</li>
              <li>Configuración de dietas</li>
              <li>Datos de uso y preferencias de la aplicación</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">2.3. Información Técnica</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tipo de dispositivo y sistema operativo</li>
              <li>Versión de la aplicación</li>
              <li>Registros de errores y diagnósticos</li>
              <li>Información de sesión</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Cómo Usamos tus Datos</h2>
            <p>Utilizamos la información recopilada para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Proporcionar y mantener los servicios de Tacoplan</li>
              <li>Gestionar tu cuenta y autenticación</li>
              <li>Guardar y sincronizar tus registros de jornada laboral</li>
              <li>Calcular automáticamente tus dietas</li>
              <li>Mejorar la funcionalidad y experiencia de la aplicación</li>
              <li>Enviarte notificaciones importantes sobre el servicio</li>
              <li>Proporcionar soporte técnico</li>
              <li>Detectar y prevenir actividades fraudulentas o no autorizadas</li>
              <li>Cumplir con obligaciones legales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Almacenamiento de Datos</h2>
            <p>
              Tus datos se almacenan de forma segura en servidores de Supabase, un proveedor de servicios en la nube que cumple con los más altos estándares de seguridad y protección de datos. Todos los datos se almacenan cifrados y protegidos mediante medidas de seguridad técnicas y organizativas apropiadas.
            </p>
            <p>
              Los datos se almacenan tanto localmente en tu dispositivo (para funcionamiento offline) como en la nube (para sincronización entre dispositivos). La sincronización ocurre automáticamente cuando tienes conexión a Internet.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Compartir Información</h2>
            <p>
              <strong>NO vendemos, alquilamos ni compartimos tu información personal con terceros con fines comerciales.</strong>
            </p>
            <p>Solo compartimos información en las siguientes circunstancias limitadas:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Con proveedores de servicios de confianza que nos ayudan a operar la aplicación (como Supabase para almacenamiento de datos), bajo estrictos acuerdos de confidencialidad</li>
              <li>Cuando sea requerido por ley o en respuesta a procesos legales válidos</li>
              <li>Para proteger los derechos, propiedad o seguridad de Tacoplan, nuestros usuarios o el público</li>
              <li>Con tu consentimiento explícito</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Tus Derechos</h2>
            <p>Tienes los siguientes derechos sobre tus datos personales:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Acceso:</strong> Puedes solicitar una copia de todos los datos que tenemos sobre ti</li>
              <li><strong>Rectificación:</strong> Puedes actualizar o corregir tu información en cualquier momento desde la configuración de tu cuenta</li>
              <li><strong>Eliminación:</strong> Puedes solicitar la eliminación de tu cuenta y todos tus datos asociados</li>
              <li><strong>Portabilidad:</strong> Puedes solicitar una copia de tus datos en un formato estructurado y legible</li>
              <li><strong>Oposición:</strong> Puedes oponerte al procesamiento de tus datos en ciertas circunstancias</li>
            </ul>
            <p>
              Para ejercer cualquiera de estos derechos, contáctanos en{' '}
              <a href="mailto:soporte@tacoplan.es" className="text-blue-600 hover:underline">
                soporte@tacoplan.es
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Seguridad</h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas apropiadas para proteger tus datos personales contra acceso no autorizado, alteración, divulgación o destrucción. Estas medidas incluyen:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cifrado de datos en tránsito y en reposo</li>
              <li>Autenticación segura</li>
              <li>Controles de acceso estrictos</li>
              <li>Monitoreo regular de seguridad</li>
              <li>Copias de seguridad regulares</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Retención de Datos</h2>
            <p>
              Conservamos tus datos personales solo durante el tiempo necesario para cumplir con los propósitos descritos en esta política, salvo que la ley requiera o permita un período de retención más largo.
            </p>
            <p>
              Cuando elimines tu cuenta, eliminaremos o anonimizaremos tus datos personales, excepto aquellos que debamos conservar por obligaciones legales.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Cookies y Tecnologías Similares</h2>
            <p>
              Tacoplan utiliza cookies y tecnologías similares para gestionar sesiones de usuario y mejorar la experiencia de la aplicación. Puedes configurar tu navegador para rechazar cookies, aunque esto puede afectar a algunas funcionalidades.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Cambios en esta Política</h2>
            <p>
              Podemos actualizar esta Política de Privacidad ocasionalmente para reflejar cambios en nuestras prácticas o por otras razones operativas, legales o regulatorias. Te notificaremos de cualquier cambio significativo publicando la nueva política en nuestra aplicación y sitio web, y actualizando la fecha de última modificación.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Menores de Edad</h2>
            <p>
              Tacoplan está diseñado para conductores profesionales y no está dirigido a menores de 18 años. No recopilamos intencionalmente información personal de menores de edad. Si descubrimos que hemos recopilado datos de un menor, eliminaremos esa información inmediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contacto</h2>
            <p>
              Si tienes preguntas, preocupaciones o solicitudes relacionadas con esta Política de Privacidad o el tratamiento de tus datos personales, puedes contactarnos en:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg mt-4">
              <p className="font-semibold">Tacoplan</p>
              <p>Desarrollador: Youssef</p>
              <p>Email: <a href="mailto:soporte@tacoplan.es" className="text-blue-600 hover:underline">soporte@tacoplan.es</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Jurisdicción</h2>
            <p>
              Esta Política de Privacidad se rige por las leyes españolas y europeas, incluido el Reglamento General de Protección de Datos (RGPD).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
