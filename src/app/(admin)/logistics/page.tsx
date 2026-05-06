import type { Metadata } from 'next';
import { LogisticsPage } from '@/presentation/components/logistics/LogisticsPage';

export const metadata: Metadata = { title: 'Logística' };

export default function Page() {
  return <LogisticsPage />;
}
