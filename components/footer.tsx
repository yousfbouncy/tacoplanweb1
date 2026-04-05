import Link from 'next/link';
import { Truck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Truck className="h-8 w-8 text-blue-500" />
              <span className="text-xl font-bold text-white">Tacoplan</span>
            </Link>
            <p className="text-sm text-gray-400">
              La app profesional para conductores de camión y tráiler. Control completo de tu jornada laboral.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Producto</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-blue-400 transition">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/planes" className="hover:text-blue-400 transition">
                  Planes y Precios
                </Link>
              </li>
              <li>
                <Link href="/soporte" className="hover:text-blue-400 transition">
                  Soporte
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Soporte</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/contacto" className="hover:text-blue-400 transition">
                  Contacto
                </Link>
              </li>
              <li>
                <Link href="/soporte" className="hover:text-blue-400 transition">
                  Ayuda
                </Link>
              </li>
              <li>
                <a href="mailto:soporte@tacoplan.es" className="hover:text-blue-400 transition">
                  soporte@tacoplan.es
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/politica-privacidad" className="hover:text-blue-400 transition">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link href="/terminos-condiciones" className="hover:text-blue-400 transition">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link href="/eliminar-cuenta" className="hover:text-blue-400 transition">
                  Eliminar Cuenta
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Tacoplan. Desarrollado por Youssef. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
