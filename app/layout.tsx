import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Tacoplan - App agenda para conductores | Jornada, conducción, descansos y dietas',
  description:
    'Tacoplan es la agenda para conductores profesionales. Registro de jornadas, tiempos de conducción y disponibilidad, descansos diarios y semanales, resumen semanal/bisemanal y dietas en un clic, sin cálculos manuales.',
  keywords:
    'app conductores, agenda conductor, registro jornadas, tiempos de conducción, disponibilidad, descansos diarios, descansos semanales, descanso reducido, extensión de conducción, dietas en un clic, resumen dietas, resumen semanal, resumen bisemanal, avisos infracciones, informe tacógrafo, app camioneros, chófer, tráiler',
  openGraph: {
    title: 'Tacoplan - Agenda para conductores',
    description:
      'Registro de jornadas, tiempos de conducción, descansos y dietas. Resumen semanal/bisemanal y avisos para cumplir normativa.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tacoplan - Agenda para conductores',
    description: 'Registro de jornadas, conducción, descansos y dietas. Resumen semanal/bisemanal.',
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
