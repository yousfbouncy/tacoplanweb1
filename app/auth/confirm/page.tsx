'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'No se pudo verificar tu cuenta';
}

function AuthConfirmContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resend'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const processAuth = async () => {
      setStatus('loading');
      setError(null);

      try {
        // 1. Obtener parámetros de la URL (Query Params)
        let code = searchParams.get('code');
        let tokenHash = searchParams.get('token_hash');
        let type = searchParams.get('type');
        let accessToken = searchParams.get('access_token');
        let refreshToken = searchParams.get('refresh_token');

        // 2. Obtener parámetros del Hash (#) - Supabase a veces los manda así
        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          if (!accessToken) accessToken = hashParams.get('access_token');
          if (!refreshToken) refreshToken = hashParams.get('refresh_token');
          if (!type) type = hashParams.get('type');
          
          // También capturar posibles errores en el hash
          const hashError = hashParams.get('error_description') || hashParams.get('error');
          if (hashError) throw new Error(hashError);
        }

        console.log('Procesando confirmación:', { code, tokenHash, type, hasAccessToken: !!accessToken });

        // 3. Lógica de verificación según los parámetros encontrados
        if (accessToken && refreshToken) {
          console.log('Usando setSession...');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        } else if (code) {
          console.log('Usando exchangeCodeForSession...');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash && type) {
          console.log('Usando verifyOtp...');
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          if (verifyError) throw verifyError;
        } else {
          // Si no hay parámetros, intentamos ver si ya hay una sesión activa
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Faltan parámetros de verificación en la URL');
          }
        }

        // 4. Asegurar datos en la base de datos tras verificar
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('Usuario no encontrado');

        setEmail(user.email ?? null);
        const nombre = user.user_metadata?.nombre || '';

        // Upsert de perfil y configuración básica
        await supabase.from('profiles').upsert({
          id: user.id,
          nombre,
          email: user.email,
          plan: 'basico'
        }, { onConflict: 'id' });

        await supabase.from('dietas_config').upsert({
          user_id: user.id,
          dieta_nacional: 28.0,
          dieta_internacional: 53.0
        }, { onConflict: 'user_id' });

        setStatus('success');
      } catch (err: any) {
        console.error('Error en confirmación:', err);
        const msg = getErrorMessage(err);
        setError(msg);

        if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('otp_expired')) {
          setStatus('resend');
        } else {
          setStatus('error');
        }
      }
    };

    processAuth();
  }, [searchParams]);

  const handleResend = async () => {
    if (!email) {
      setError('No se pudo identificar el correo para reenviar. Por favor, intenta registrarte de nuevo.');
      setStatus('error');
      return;
    }

    setResending(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: 'https://tacoplan.es/auth/confirm'
        }
      });
      if (resendError) throw resendError;
      alert('Correo de confirmación reenviado. Revisa tu bandeja de entrada.');
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verificación de Cuenta</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Procesando tu verificación...'}
            {status === 'success' && '¡Cuenta verificada con éxito!'}
            {status === 'resend' && 'El enlace ha expirado'}
            {status === 'error' && 'Hubo un problema'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {status === 'loading' && (
            <div className="py-8 flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600 text-sm">Validando tus credenciales en Tacoplan v3...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6">
              <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200">
                Tu correo ha sido verificado correctamente. Ya puedes usar Tacoplan.
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-gray-600 font-medium">¿Dónde quieres ir ahora?</p>
                <a href="tacoplan://login" className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Abrir App Tacoplan (Recomendado)
                  </Button>
                </a>
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full">
                    Ir al Login Web
                  </Button>
                </Link>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">¿Aún no tienes la aplicación?</p>
                <div className="flex justify-center gap-2">
                   <Button variant="ghost" size="sm" className="text-xs">Descargar APK</Button>
                   <Button variant="ghost" size="sm" className="text-xs">Google Play</Button>
                </div>
              </div>
            </div>
          )}

          {status === 'resend' && (
            <div className="space-y-4">
              <div className="bg-amber-50 text-amber-700 p-4 rounded-lg border border-amber-200 text-sm text-left">
                Parece que este enlace de confirmación ya no es válido o ha expirado.
              </div>
              <Button 
                onClick={handleResend} 
                disabled={resending}
                className="w-full bg-blue-600"
              >
                {resending ? 'Enviando...' : 'Reenviar email de confirmación'}
              </Button>
              <Link href="/registro" className="block text-sm text-blue-600 hover:underline">
                Volver al registro
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm">
                {error || 'No se pudo completar la verificación.'}
              </div>
              <Link href="/registro" className="block">
                <Button className="w-full">Intentar de nuevo</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <AuthConfirmContent />
    </Suspense>
  );
}
