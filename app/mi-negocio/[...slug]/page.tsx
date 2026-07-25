import { BusinessFuturePage } from '@/features/business/business-pages';

export const dynamic = 'force-dynamic';

export default function MiNegocioFuturePage({ params }: { params: { slug: string[] } }) {
  return <BusinessFuturePage slug={params.slug} />;
}
