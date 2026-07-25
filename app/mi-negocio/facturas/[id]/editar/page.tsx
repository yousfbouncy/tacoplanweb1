import { BusinessInvoiceEditPage } from '@/features/business/business-invoices';

export const dynamic = 'force-dynamic';

export default function MiNegocioFacturaEditarPage({ params }: { params: { id: string } }) {
  return <BusinessInvoiceEditPage invoiceId={params.id} />;
}
