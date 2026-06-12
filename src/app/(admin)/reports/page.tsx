import type { Metadata } from 'next';
import { ReportsPage } from '@/presentation/components/reports/ReportsPage';

export const metadata: Metadata = { title: 'Estadísticas' };

export default function Page() {
  return <ReportsPage />;
}
