export const metadata = {
  title: 'Términos y Condiciones - Tacoplan',
  description: 'Términos y condiciones de uso de Tacoplan. Lee las normas y condiciones para usar nuestra app de control de jornada para camioneros.',
};

export default function TerminosCondicionesPage() {
  return (
    <div className="bg-white py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Términos y Condiciones de Uso
        </h1>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
          <p className="text-sm text-gray-500">
            Última actualización: {new Date().toLocaleDateString('es-ES')}
          </p>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Aceptación de los Términos</h2>
            <p>
              Bienvenido a Tacoplan. Al descargar, instalar o usar nuestra aplicación móvil y servicios web, aceptas estar sujeto a estos Términos y Condiciones. Si no estás de acuerdo con alguna parte de estos términos, no debes usar Tacoplan.
            </p>
            <p>
              Estos términos constituyen un acuerdo legal vinculante entre tú (el usuario) y Tacoplan (desarrollado por Youssef).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Descripción del Servicio</h2>
            <p>
              Tacoplan es una aplicación móvil diseñada para ayudar a conductores profesionales de camión y tráiler a:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Registrar y controlar su jornada laboral</li>
              <li>Gestionar tiempos de conducción y descanso</li>
              <li>Registrar viajes y rutas nacionales e internacionales</li>
              <li>Calcular dietas de forma automática</li>
              <li>Mantener un registro digital de su actividad profesional</li>
            </ul>
            <p>
              Nos reservamos el derecho de modificar, suspender o discontinuar cualquier aspecto del servicio en cualquier momento, con o sin previo aviso.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Registro y Cuenta de Usuario</h2>
            <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">3.1. Creación de Cuenta</h3>
            <p>
              Para usar Tacoplan, debes crear una cuenta proporcionando información precisa y completa. Puedes registrarte usando tu dirección de correo electrónico o mediante tu cuenta de Google.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">3.2. Responsabilidad de la Cuenta</h3>
            <p>
              Eres responsable de mantener la confidencialidad de tus credenciales de acceso y de todas las actividades que ocurran bajo tu cuenta. Debes notificarnos inmediatamente cualquier uso no autorizado de tu cuenta.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">3.3. Requisitos de Edad</h3>
            <p>
              Debes tener al menos 18 años para usar Tacoplan. Al registrarte, confirmas que cumples con este requisito.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Uso Aceptable</h2>
            <p>Al usar Tacoplan, aceptas:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Proporcionar información veraz y precisa</li>
              <li>Usar la aplicación solo para fines legales y profesionales</li>
              <li>No intentar acceder a áreas restringidas del sistema</li>
              <li>No interferir con el funcionamiento de la aplicación</li>
              <li>No realizar ingeniería inversa, descompilar o desensamblar la aplicación</li>
              <li>No usar la aplicación para actividades fraudulentas o ilegales</li>
              <li>Cumplir con todas las leyes y regulaciones aplicables</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Planes y Pagos</h2>
            <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">5.1. Plan Básico</h3>
            <p>
              El Plan Básico es gratuito e incluye funcionalidades esenciales de la aplicación. Este plan está disponible de forma indefinida sin costo alguno.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">5.2. Plan Pro</h3>
            <p>
              El Plan Pro es un servicio de suscripción de pago que ofrece funcionalidades adicionales. Los detalles de precios se especifican en la aplicación y pueden estar sujetos a cambios con previo aviso.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">5.3. Facturación</h3>
            <p>
              Las suscripciones al Plan Pro se facturan mensualmente. Los cargos se realizarán automáticamente al inicio de cada período de facturación hasta que canceles tu suscripción.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">5.4. Cancelación</h3>
            <p>
              Puedes cancelar tu suscripción al Plan Pro en cualquier momento desde la configuración de tu cuenta. La cancelación será efectiva al final del período de facturación actual.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">5.5. Reembolsos</h3>
            <p>
              No ofrecemos reembolsos por períodos de suscripción parcialmente utilizados, salvo que la ley aplicable lo requiera.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Propiedad Intelectual</h2>
            <p>
              Tacoplan, incluido su código, diseño, gráficos, texto y otros contenidos, es propiedad de Youssef y está protegido por leyes de propiedad intelectual españolas e internacionales.
            </p>
            <p>
              Se te concede una licencia limitada, no exclusiva, no transferible y revocable para usar la aplicación únicamente para tus fines personales o profesionales de acuerdo con estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Contenido del Usuario</h2>
            <p>
              Tú mantienes todos los derechos sobre los datos que ingresas en Tacoplan, incluyendo registros de jornada, viajes, rutas y otra información personal.
            </p>
            <p>
              Al usar Tacoplan, nos concedes una licencia para almacenar, procesar y mostrar tu contenido solo en la medida necesaria para proporcionar el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitación de Responsabilidad</h2>
            <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">8.1. Uso Bajo Normativa</h3>
            <p>
              <strong>IMPORTANTE:</strong> Tacoplan es una herramienta de ayuda para el registro y control de jornada laboral. Sin embargo, tú eres el único responsable de cumplir con todas las normativas y regulaciones aplicables al transporte por carretera, incluyendo pero no limitándose a:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Reglamento (CE) N° 561/2006 sobre tiempos de conducción y descanso</li>
              <li>Normativa sobre tacógrafos digitales</li>
              <li>Regulaciones nacionales e internacionales de transporte</li>
              <li>Cualquier otra normativa aplicable a tu actividad profesional</li>
            </ul>
            <p>
              Tacoplan no sustituye el tacógrafo oficial ni otros sistemas obligatorios. Es responsabilidad del usuario verificar que sus registros cumplen con la normativa vigente.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">8.2. Disponibilidad del Servicio</h3>
            <p>
              Aunque nos esforzamos por mantener Tacoplan disponible en todo momento, no garantizamos que el servicio será ininterrumpido, oportuno, seguro o libre de errores. No seremos responsables de ninguna pérdida o daño resultante de la indisponibilidad del servicio.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">8.3. Exactitud de la Información</h3>
            <p>
              Hacemos todo lo posible para proporcionar cálculos precisos (como dietas), pero no garantizamos la exactitud absoluta. Es tu responsabilidad verificar toda la información antes de usarla para fines oficiales o legales.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">8.4. Limitación General</h3>
            <p>
              En ningún caso Tacoplan o sus desarrolladores serán responsables de daños indirectos, incidentales, especiales, consecuentes o punitivos, incluidos, entre otros, pérdida de beneficios, datos, uso, fondo de comercio u otras pérdidas intangibles, resultantes de:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tu acceso o uso (o incapacidad de acceso o uso) del servicio</li>
              <li>Cualquier conducta o contenido de terceros en el servicio</li>
              <li>Cualquier contenido obtenido del servicio</li>
              <li>Acceso no autorizado, uso o alteración de tus transmisiones o contenido</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Indemnización</h2>
            <p>
              Aceptas indemnizar y mantener indemne a Tacoplan, sus desarrolladores, empleados y afiliados de cualquier reclamación, daño, obligación, pérdida, responsabilidad, costo o deuda, y gastos (incluidos, entre otros, honorarios de abogados) que surjan de:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tu uso y acceso al servicio</li>
              <li>Tu violación de estos términos</li>
              <li>Tu violación de los derechos de terceros, incluidos otros usuarios</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Terminación</h2>
            <p>
              Podemos suspender o terminar tu acceso a Tacoplan inmediatamente, sin previo aviso ni responsabilidad, por cualquier motivo, incluyendo, sin limitación, si incumples estos términos.
            </p>
            <p>
              Puedes eliminar tu cuenta en cualquier momento desde la configuración de la aplicación o contactándonos en{' '}
              <a href="mailto:soporte@tacoplan.es" className="text-blue-600 hover:underline">
                soporte@tacoplan.es
              </a>
            </p>
            <p>
              Tras la terminación, tu derecho a usar el servicio cesará inmediatamente. Si deseas eliminar tu cuenta, consulta nuestra página de{' '}
              <a href="/eliminar-cuenta" className="text-blue-600 hover:underline">
                eliminación de cuenta
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Modificaciones de los Términos</h2>
            <p>
              Nos reservamos el derecho de modificar o reemplazar estos términos en cualquier momento. Si una revisión es material, intentaremos proporcionar un aviso con al menos 30 días de anticipación a que cualquier término nuevo entre en vigencia.
            </p>
            <p>
              Al continuar accediendo o usando nuestro servicio después de que esas revisiones entren en vigencia, aceptas estar sujeto a los términos revisados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Ley Aplicable</h2>
            <p>
              Estos términos se regirán e interpretarán de acuerdo con las leyes de España, sin dar efecto a ninguna disposición o regla de conflicto de leyes.
            </p>
            <p>
              Cualquier disputa relacionada con estos términos estará sujeta a la jurisdicción exclusiva de los tribunales de España.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Divisibilidad</h2>
            <p>
              Si alguna disposición de estos términos se considera inválida o inaplicable por un tribunal de jurisdicción competente, las disposiciones restantes de estos términos permanecerán en pleno vigor y efecto.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Acuerdo Completo</h2>
            <p>
              Estos términos, junto con nuestra Política de Privacidad, constituyen el acuerdo completo entre tú y Tacoplan con respecto a nuestro servicio y reemplazan cualquier acuerdo anterior.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Contacto</h2>
            <p>
              Si tienes alguna pregunta sobre estos Términos y Condiciones, contáctanos en:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg mt-4">
              <p className="font-semibold">Tacoplan</p>
              <p>Desarrollador: Youssef</p>
              <p>Email: <a href="mailto:soporte@tacoplan.es" className="text-blue-600 hover:underline">soporte@tacoplan.es</a></p>
            </div>
          </section>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mt-8">
            <p className="font-semibold text-yellow-800">Aviso Importante</p>
            <p className="text-yellow-700 mt-2">
              Al usar Tacoplan, reconoces que has leído, entendido y aceptado estar sujeto a estos Términos y Condiciones, así como a nuestra Política de Privacidad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
