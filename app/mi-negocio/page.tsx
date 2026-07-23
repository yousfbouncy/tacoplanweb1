import type { Metadata } from 'next';
import { BusinessModule } from '@/features/business/business-module';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mi negocio | Tacoplan',
  description:
    'Gestiona la base de tu pequeño negocio: configuración, clientes, categorías de gasto y cuentas financieras.',
};

export default function MiNegocioPage() {
  return <BusinessModule />;
}
