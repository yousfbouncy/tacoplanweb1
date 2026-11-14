'use client';
import { trackWebsiteEvent } from '@/components/web-analytics-tracker';

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
import { Menu, X } from 'lucide-react';
import { TacoplanBrand } from '@/components/tacoplan-brand';
import { useState } from 'react';

function DownloadApkDialogButton({ className }: { className?: string }) {
  const appStoreHref = 'https://apps.apple.com/es/app/tacoplan/id6767099789';
  const apkHref = process.env.NEXT_PUBLIC_APK_URL?.trim();

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
                <p className="text-sm">Tacoplan está disponible en App Store. Si hay un APK vigente, aparecerá aquí la descarga Android.</p>
                <p className="text-sm">En Android es normal ver un aviso de seguridad al descargar/instalar.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild className="w-full sm:w-auto">
                  <a href={appStoreHref} onClick={() => trackWebsiteEvent("store_click_ios")} target="_blank" rel="noreferrer">
                    Descargar en App Store
                  </a>
                </Button>
                {apkHref ? (<Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href={apkHref} onClick={() => trackWebsiteEvent("store_click_android")} target="_blank" rel="noreferrer">
                    Descargar APK (Android)
                  </a>
                </Button>) : null}
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
                Tacoplan sigue mejorando. Si encuentras un error o tienes una sugerencia, contacta con soporte.
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
          Disponible en App Store. La descarga Android se mostrará cuando se configure un enlace APK actualizado.
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
          <Link href="/" aria-label="Tacoplan - inicio" className="flex items-center shrink-0">
            <TacoplanBrand />
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
                <Link href="/mi-tacoplan" className="text-gray-700 hover:text-blue-600 transition">
                  Mi Tacoplan
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
                <Link href="/mi-tacoplan">
                  <Button variant="outline">Mi Tacoplan · Entrar</Button>
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
                  href="/mi-tacoplan"
                  className="block text-gray-700 hover:text-blue-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Mi Tacoplan
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
                <Link href="/mi-tacoplan" className="block" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Mi Tacoplan · Entrar
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
