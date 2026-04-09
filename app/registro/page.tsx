'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Truck, Mail } from 'lucide-react';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return 'Error al crear la cuenta';
}

function formatRegistroError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('email rate limit exceeded') || normalized.includes('rate limit')) {
    return 'Has alcanzado el límite de envío de emails. Espera unos minutos y vuelve a intentarlo. Si ya te llegó el correo, no hace falta repetir el registro: confirma el email y listo.';
  }

  if (normalized.includes('redirect') && normalized.includes('not allowed')) {
    return 'Supabase está bloqueando el redirect de confirmación. En Supabase → Authentication → URL Configuration, añade https://tacoplan.es/auth/callback (y tu dominio) en Redirect URLs.';
  }

  if (normalized.includes('captcha') && (normalized.includes('required') || normalized.includes('missing'))) {
    return 'Supabase está exigiendo CAPTCHA para registrarse. Desactívalo en Supabase Auth (Security) o implementa el token de CAPTCHA en el formulario.';
  }

  if (
    normalized.includes('could not find the table') ||
    normalized.includes('schema cache') ||
    normalized.includes('relation') ||
    normalized.includes('does not exist') ||
    normalized.includes('not found')
  ) {
    if (normalized.includes('profiles') || normalized.includes('dietas')) {
      return 'La cuenta se está creando, pero tu Supabase no tiene las tablas public.profiles / public.dietas_config (o la web está conectada a otro proyecto). Revisa que la web usa el MISMO Supabase que la app (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY) y aplica la migración supabase/migrations en ese proyecto.';
    }
  }

  return message;
}

function getSupabaseProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const ref = host.split('.')[0];
    return ref || null;
  } catch {
    return null;
  }
}

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'form' | 'email_sent' | 'success'>('form');
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [cooldownUntilMs, setCooldownUntilMs] = useState(0);
  const [debug, setDebug] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnTo(params.get('return_to') ?? params.get('redirect_to') ?? params.get('redirect'));
    setDebug(params.get('debug') === '1');
  }, []);

  const getEmailRedirectTo = () => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseUrl = isLocalhost ? window.location.origin : 'https://tacoplan.es';
    const redirectParams = new URLSearchParams();
    if (returnTo) redirectParams.set('return_to', returnTo);
    return `${baseUrl}/auth/callback${redirectParams.size ? `?${redirectParams.toString()}` : ''}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const now = Date.now();
    if (now < cooldownUntilMs) {
      const seconds = Math.ceil((cooldownUntilMs - now) / 1000);
      setError(`Espera ${seconds}s antes de volver a intentarlo.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setCooldownUntilMs(Date.now() + 10_000);
      const emailRedirectTo = getEmailRedirectTo();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            nombre: formData.nombre,
          },
          emailRedirectTo,
        },
      });

      if (signUpError) throw signUpError;

      if (data.session?.user) {
        const userId = data.session.user.id;

        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: userId,
            nombre: formData.nombre,
            email: formData.email.trim(),
            plan: 'basico',
          },
          { onConflict: 'id' },
        );

        if (profileError) throw new Error(profileError.message);

        const { error: dietasError } = await supabase.from('dietas_config').upsert(
          {
            user_id: userId,
            dieta_nacional: 28.0,
            dieta_internacional: 53.0,
          },
          { onConflict: 'user_id' },
        );

        if (dietasError) throw new Error(dietasError.message);

        setStatus('success');
        return;
      }

      setStatus('email_sent');
    } catch (err: unknown) {
      console.error('Registro error:', err);
      const message = getErrorMessage(err);
      setError(formatRegistroError(message));

      if (message.toLowerCase().includes('rate limit')) {
        setCooldownUntilMs(Date.now() + 60_000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al iniciar sesión con Google');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-4">
            <Truck className="h-10 w-10 text-blue-600" />
            <span className="text-3xl font-bold text-gray-900">Tacoplan</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Cuenta</h1>
          <p className="text-gray-600">
            Únete a Tacoplan y gestiona tu jornada laboral
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registro</CardTitle>
            <CardDescription>
              Crea tu cuenta para comenzar a usar Tacoplan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'form' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre Completo</Label>
                  <Input
                    id="nombre"
                    type="text"
                    placeholder="Tu nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </Button>
              </form>
            ) : status === 'email_sent' ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
                  Te hemos enviado un correo de confirmación. Confirma tu cuenta y luego vuelve a la app Tacoplan para iniciar sesión. Revisa spam/promociones si no lo ves.
                </div>
                {returnTo ? (
                  <a href={returnTo} className="block">
                    <Button className="w-full">Volver a la app Tacoplan</Button>
                  </a>
                ) : null}
                <Button type="button" variant="outline" className="w-full" onClick={() => router.push('/login')}>
                  Ir a iniciar sesión
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
                  Cuenta verificada correctamente. Vuelve a la app Tacoplan e inicia sesión con tu correo y contraseña.
                </div>
                {returnTo ? (
                  <a href={returnTo} className="block">
                    <Button className="w-full">Volver a la app Tacoplan</Button>
                  </a>
                ) : null}
                <Button type="button" variant="outline" className="w-full" onClick={() => router.push('/login')}>
                  Ir a iniciar sesión
                </Button>
              </div>
            )}

            {debug ? (
              <div className="mt-4 text-xs text-gray-500">
                Supabase ref: {getSupabaseProjectRef() ?? 'desconocido'}
              </div>
            ) : null}

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    O continuar con
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full mt-4"
                onClick={handleGoogleSignIn}
                disabled={loading || status !== 'form'}
              >
                <Mail className="mr-2 h-4 w-4" />
                Google
              </Button>
            </div>

            <div className="mt-6 text-center text-sm text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                Iniciar Sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
