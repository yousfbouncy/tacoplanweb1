import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Tacoplan - App para Camioneros | Control de Jornada y Tacógrafo',
  description: 'Tacoplan es la app profesional para conductores de camión y tráiler. Control de jornada laboral, registro de conducción, gestión de rutas, cálculo de dietas y control de tacógrafo digital.',
  keywords: 'app camioneros, control tacógrafo, registro jornada conductor, tiempos de conducción, descansos camion, app transporte, gestión rutas camión, dietas camioneros, control horas conducción, logística transporte, app para transportistas, tacógrafo digital, registro viajes camión',
  openGraph: {
    title: 'Tacoplan - App para Camioneros',
    description: 'Control profesional de jornada laboral para conductores de camión. Registro de conducción, descansos, rutas y dietas.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tacoplan - App para Camioneros',
    description: 'Control profesional de jornada laboral para conductores de camión',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
