import type { Metadata } from 'next';
import { DashboardPage } from '@/presentation/components/dashboard/DashboardPage';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function Page() {
  return <DashboardPage />;
}
