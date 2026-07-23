'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Truck, Menu, X } from 'lucide-react';
import { useState } from 'react';

function DownloadApkDialogButton({ className }: { className?: string }) {
  const appStoreHref = 'https://apps.apple.com/es/app/tacoplan/id6767099789';
  const apkHref =
    process.env.NEXT_PUBLIC_APK_URL ||
    'https://dutgxjwfjtqxmqonnjlp.supabase.co/storage/v1/object/public/apk/tacoplan%20version%202.2.2.apk';

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className={className}>Descargar app</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Descargar Tacoplan</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm">Tacoplan está disponible en App Store. En Android se descarga como APK.</p>
                <p className="text-sm">En Android es normal ver un aviso de seguridad al descargar/instalar.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild className="w-full sm:w-auto">
                  <a href={appStoreHref} target="_blank" rel="noreferrer">
                    Descargar en App Store
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href={apkHref} target="_blank" rel="noreferrer">
                    Descargar APK (Android)
                  </a>
                </Button>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-foreground">📲 Cómo instalar en Android</div>
                <ol className="list-decimal pl-5 space-y-1 text-sm">
                  <li>Pulsa en “Descargar APK (Android)”.</li>
                  <li>Si aparece un aviso del navegador, pulsa “Descargar de todos modos”.</li>
                  <li>Abre el archivo descargado.</li>
                  <li>Si te lo pide, permite “instalar apps desconocidas”.</li>
                  <li>Instala la app.</li>
                </ol>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-foreground">🔐 Dentro de la app</div>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Pulsa “Registrarse con Google”.</li>
                  <li>Tu cuenta se crea automáticamente.</li>
                </ul>
              </div>

              <div className="text-sm">
                App en prueba pero funcional. Tus datos se guardan de forma segura. CUALQUIER ERROR, O COSAS A MEJORAR Y CORREGIR, HAGAMELO SABER CONTACTADOME.
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href="mailto:soporte@tacoplan.es">Email soporte</a>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href="https://wa.me/34614314054" target="_blank" rel="noreferrer">
                    WhatsApp soporte
                  </a>
                </Button>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogFooter>
        <div className="pt-2 text-center text-xs text-muted-foreground">
          Disponible en App Store. Android disponible por APK (próximamente en Google Play).
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showPlanes = false;

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Truck className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Tacoplan</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition">
              Inicio
            </Link>
            {showPlanes ? (
              <Link href="/planes" className="text-gray-700 hover:text-blue-600 transition">
                Planes
              </Link>
            ) : null}
            <Link href="/contacto" className="text-gray-700 hover:text-blue-600 transition">
              Contacto
            </Link>
            <Link href="/soporte" className="text-gray-700 hover:text-blue-600 transition">
              Soporte
            </Link>

            {loading ? (
              <div className="w-[240px] h-10" />
            ) : user ? (
              <div className="flex items-center space-x-4">
                <Link href="/mi-negocio" className="text-gray-700 hover:text-blue-600 transition">
                  Mi negocio
                </Link>
                <Link href="/perfil" className="text-gray-700 hover:text-blue-600 transition">
                  Perfil
                </Link>
                <DownloadApkDialogButton />
                <Button onClick={signOut} variant="outline">
                  Cerrar Sesión
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <Button variant="outline">Iniciar Sesión</Button>
                </Link>
                <DownloadApkDialogButton />
              </div>
            )}
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            <Link
              href="/"
              className="block text-gray-700 hover:text-blue-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Inicio
            </Link>
            {showPlanes ? (
              <Link
                href="/planes"
                className="block text-gray-700 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Planes
              </Link>
            ) : null}
            <Link
              href="/contacto"
              className="block text-gray-700 hover:text-blue-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contacto
            </Link>
            <Link
              href="/soporte"
              className="block text-gray-700 hover:text-blue-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Soporte
            </Link>
            {loading ? null : user ? (
              <>
                <Link
                  href="/mi-negocio"
                  className="block text-gray-700 hover:text-blue-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Mi negocio
                </Link>
                <Link
                  href="/perfil"
                  className="block text-gray-700 hover:text-blue-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Perfil
                </Link>
                <DownloadApkDialogButton className="w-full" />
                <Button onClick={signOut} variant="outline" className="w-full">
                  Cerrar Sesión
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full">
                    Iniciar Sesión
                  </Button>
                </Link>
                <DownloadApkDialogButton className="w-full" />
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
