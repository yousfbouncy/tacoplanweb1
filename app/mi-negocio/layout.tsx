import type { Metadata } from 'next';
import { BusinessDataProvider } from '@/features/business/business-context';
import { BusinessShell } from '@/features/business/business-shell';

export const metadata: Metadata = {
  title: 'Mi negocio | Tacoplan',
  description:
    'Panel de gestión para autónomos y pequeños negocios: configuración, clientes, categorías y caja y bancos.',
};

export default function MiNegocioLayout({ children }: { children: React.ReactNode }) {
  return (
    <BusinessDataProvider>
      <BusinessShell>{children}</BusinessShell>
    </BusinessDataProvider>
  );
}
