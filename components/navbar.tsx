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
  const apkHref = process.env.NEXT_PUBLIC_APK_URL || '/tacoplan.apk';

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className={className}>Descargar APK</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Descargar Tacoplan</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                La app de momento es gratuita, en prueba, pero funcional. REGISTRARSE DIRECTAMENTE DANDOLE AL BOTON GOOGLE, REGISTRO CON GOOGLE.
              </p>
              <p>
                Si encuentras cualquier error o tienes alguna mejora/recomendación, escríbenos a{' '}
                <a className="underline" href="mailto:soporte@tacoplan.es">
                  soporte@tacoplan.es
                </a>{' '}
                o por WhatsApp al{' '}
                <a className="underline" href="https://wa.me/34614314054" target="_blank" rel="noreferrer">
                  +34 614 314 054
                </a>
                .
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction asChild>
            <a href={apkHref} download>
              Descargar
            </a>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <Link href="/planes" className="text-gray-700 hover:text-blue-600 transition">
              Planes
            </Link>
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
                <Link href="/perfil" className="text-gray-700 hover:text-blue-600 transition">
                  Perfil
                </Link>
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
            <Link
              href="/planes"
              className="block text-gray-700 hover:text-blue-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Planes
            </Link>
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
                  href="/perfil"
                  className="block text-gray-700 hover:text-blue-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Perfil
                </Link>
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
