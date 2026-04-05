'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TriangleAlert as AlertTriangle, Trash2, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function EliminarCuentaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) throw profileError;

      const { error: dietasError } = await supabase
        .from('dietas_config')
        .delete()
        .eq('user_id', user.id);

      if (dietasError) throw dietasError;

      await supabase.auth.signOut();

      alert('Tu cuenta ha sido eliminada correctamente.');
      router.push('/');
    } catch (error) {
      console.error('Error al eliminar cuenta:', error);
      alert('Hubo un error al eliminar tu cuenta. Por favor, contacta con soporte.');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="bg-white py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Eliminar Cuenta
          </h1>
          <p className="text-xl text-gray-600">
            Información sobre cómo eliminar tu cuenta de Tacoplan
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
              <CardTitle className="text-2xl">Antes de Eliminar tu Cuenta</CardTitle>
              <CardDescription className="text-base">
                Por favor, lee atentamente la siguiente información
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">¿Qué datos se eliminarán?</h3>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>Tu perfil de usuario y datos de cuenta</li>
                  <li>Todos tus registros de jornada laboral</li>
                  <li>Historial de viajes y rutas</li>
                  <li>Configuración de dietas</li>
                  <li>Cualquier otro dato asociado a tu cuenta</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Esta acción es irreversible</h3>
                <p className="text-gray-700">
                  Una vez eliminada tu cuenta, no podremos recuperar tus datos. Asegúrate de exportar cualquier información importante antes de proceder.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Suscripciones activas</h3>
                <p className="text-gray-700">
                  Si tienes una suscripción al Plan Pro activa, asegúrate de cancelarla antes de eliminar tu cuenta para evitar cargos futuros.
                </p>
              </div>
            </CardContent>
          </Card>

          {user ? (
            <Card>
              <CardHeader>
                <Trash2 className="h-12 w-12 text-red-600 mb-4" />
                <CardTitle className="text-2xl">Proceder con la Eliminación</CardTitle>
                <CardDescription className="text-base">
                  Elimina permanentemente tu cuenta y todos tus datos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showConfirm ? (
                  <div>
                    <p className="text-gray-700 mb-6">
                      Estás a punto de eliminar tu cuenta de forma permanente. Esta acción no se puede deshacer.
                    </p>
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={() => setShowConfirm(true)}
                      className="w-full"
                    >
                      Quiero Eliminar mi Cuenta
                    </Button>
                  </div>
                ) : (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                    <h3 className="font-bold text-red-900 mb-4">Confirmación Final</h3>
                    <p className="text-red-800 mb-6">
                      Esta es tu última oportunidad para cambiar de opinión. ¿Estás completamente seguro de que deseas eliminar tu cuenta y todos tus datos de forma permanente?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        variant="destructive"
                        size="lg"
                        onClick={handleDeleteAccount}
                        disabled={loading}
                        className="flex-1"
                      >
                        {loading ? 'Eliminando...' : 'Sí, Eliminar Definitivamente'}
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setShowConfirm(false)}
                        disabled={loading}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Eliminar Cuenta</CardTitle>
                <CardDescription className="text-base">
                  Debes iniciar sesión para eliminar tu cuenta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-6">
                  Para proceder con la eliminación de tu cuenta, primero debes iniciar sesión.
                </p>
                <Button
                  onClick={() => router.push('/login')}
                  size="lg"
                  className="w-full"
                >
                  Iniciar Sesión
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <Mail className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle className="text-2xl">¿Necesitas Ayuda?</CardTitle>
              <CardDescription className="text-base">
                Alternativas antes de eliminar tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Contacta con Soporte</h3>
                <p className="text-gray-700 mb-4">
                  Si tienes problemas con la aplicación o dudas sobre tu cuenta, nuestro equipo de soporte está aquí para ayudarte. Muchos problemas pueden resolverse sin necesidad de eliminar tu cuenta.
                </p>
                <a href="mailto:soporte@tacoplan.es">
                  <Button variant="outline">
                    Contactar Soporte
                  </Button>
                </a>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Exporta tus Datos</h3>
                <p className="text-gray-700">
                  Si solo necesitas una copia de tus datos pero no quieres eliminar tu cuenta, puedes solicitar una exportación completa contactándonos en{' '}
                  <a href="mailto:soporte@tacoplan.es" className="text-blue-600 hover:underline">
                    soporte@tacoplan.es
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Política de Eliminación de Datos
            </h2>
            <p className="text-gray-700 mb-4">
              Cuando eliminas tu cuenta, todos tus datos personales se eliminan permanentemente de nuestros sistemas de forma inmediata. Cumplimos con el RGPD y garantizamos tu derecho al olvido.
            </p>
            <p className="text-gray-700">
              En algunos casos excepcionales, podemos conservar ciertos datos durante un período limitado cuando sea requerido por ley o para resolver disputas pendientes. Para más información, consulta nuestra{' '}
              <a href="/politica-privacidad" className="text-blue-600 hover:underline">
                Política de Privacidad
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
