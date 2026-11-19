import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { Navbar } from '@/components/navbar';
import { WebAnalyticsTracker } from '@/components/web-analytics-tracker';
import { DriverPortalOAuthReturn } from '@/components/driver-portal-oauth-return';
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
        {/* Recovery URLs from older app versions may fall back to the Site URL.
            Intercept only recovery fragments, before client-side auth initializes. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{
          var locationPath=window.location.pathname;
          if(locationPath!=='/'&&locationPath!=='/auth/callback'&&locationPath!=='/auth/confirm')return;
          var hash=window.location.hash;
          var hp=new URLSearchParams(hash.slice(1));
          var qs=new URLSearchParams(window.location.search);
          var type=hp.get('type')||qs.get('type');
          if(type!=='recovery')return;
          if(!hp.has('access_token')&&!hp.has('error')&&!qs.has('token_hash')&&!qs.has('code')&&!qs.has('error'))return;
          window.location.replace('/restablecer-contrasena'+window.location.search+hash);
        }catch(e){}})();` }} />
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <WebAnalyticsTracker />
            <DriverPortalOAuthReturn />
            <Navbar />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
