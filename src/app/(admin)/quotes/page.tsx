import type { Metadata } from 'next';
import { QuotesPage } from '@/presentation/components/quotes/QuotesPage';

export const metadata: Metadata = { title: 'Cotizaciones' };

export default function Page() {
  return <QuotesPage />;
}
