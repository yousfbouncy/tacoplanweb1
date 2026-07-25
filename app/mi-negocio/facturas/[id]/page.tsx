import { BusinessInvoiceDetailPage } from '@/features/business/business-invoices';

export const dynamic = 'force-dynamic';

export default function MiNegocioFacturaDetallePage({ params }: { params: { id: string } }) {
  return <BusinessInvoiceDetailPage invoiceId={params.id} />;
}
