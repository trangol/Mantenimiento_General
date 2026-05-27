import type { Metadata } from 'next';
import { FinancesPage } from '@/presentation/components/finances/FinancesPage';

export const metadata: Metadata = { title: 'Finanzas' };

export default function Page() {
  return <FinancesPage />;
}
