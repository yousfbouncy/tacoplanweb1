'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return 'No se pudo verificar tu cuenta';
}

function formatCallbackError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('expired') || normalized.includes('otp_expired')) {
    return 'El enlace de confirmación ha caducado. Vuelve a registrarte para recibir un nuevo correo de confirmación.';
  }

  if (normalized.includes('invalid') || normalized.includes('access_denied')) {
    return 'El enlace de confirmación no es válido. Vuelve a registrarte para recibir un nuevo correo de confirmación.';
  }

  return message;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const returnTo = useMemo(() => {
    const redirectTo = searchParams.get('return_to') ?? searchParams.get('redirect_to') ?? searchParams.get('redirect');
    return redirectTo ?? null;
  }, [searchParams]);

  useEffect(() => {
    const run = async () => {
      setStatus('loading');
      setError(null);

      try {
        const queryError = searchParams.get('error');
        const queryErrorDescription = searchParams.get('error_description');
        const queryErrorCode = searchParams.get('error_code');

        if (queryError || queryErrorDescription || queryErrorCode) {
          throw new Error([queryErrorCode, queryError, queryErrorDescription].filter(Boolean).join(' - '));
        }

        const code = searchParams.get('code');
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as never,
          });
          if (verifyError) throw verifyError;
        } else {
          throw new Error('Faltan parámetros de verificación en la URL');
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error('No se pudo obtener el usuario tras la verificación');

        const nombre = (user.user_metadata?.nombre as string | undefined) ?? '';
        const email = user.email ?? '';

        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: user.id,
            nombre,
            email,
            plan: 'basico',
          },
          { onConflict: 'id' },
        );

        if (profileError) throw new Error(profileError.message);

        const { error: dietasError } = await supabase.from('dietas_config').upsert(
          {
            user_id: user.id,
            dieta_nacional: 28.0,
            dieta_internacional: 53.0,
          },
          { onConflict: 'user_id' },
        );

        if (dietasError) throw new Error(dietasError.message);

        setStatus('success');
      } catch (err: unknown) {
        console.error('Auth callback error:', err);
        const message = getErrorMessage(err);
        setError(formatCallbackError(message));
        setStatus('error');
      }
    };

    void run();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Verificación</CardTitle>
            <CardDescription>
              {status === 'loading'
                ? 'Verificando tu cuenta...'
                : status === 'success'
                  ? 'Cuenta verificada'
                  : 'No se pudo verificar'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'loading' ? (
              <div className="text-gray-700">Espera un momento…</div>
            ) : status === 'success' ? (
              <>
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
                  Cuenta verificada correctamente. Vuelve a la app Tacoplan e inicia sesión con tu correo y contraseña.
                </div>
                {returnTo ? (
                  <a href={returnTo} className="block">
                    <Button className="w-full">Volver a la app Tacoplan</Button>
                  </a>
                ) : null}
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full">
                    Ir a iniciar sesión
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error ?? 'No se pudo verificar tu cuenta'}
                </div>
                <Link href="/registro" className="block">
                  <Button className="w-full">Volver al registro</Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
