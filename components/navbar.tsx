'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Truck, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, signOut } = useAuth();
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

            {user ? (
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
                <Link href="/registro">
                  <Button>Registrarse</Button>
                </Link>
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
            {user ? (
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
                <Link href="/registro" className="block">
                  <Button className="w-full">Registrarse</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
