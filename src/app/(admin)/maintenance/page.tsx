import type { Metadata } from 'next';
import { MaintenancePage } from '@/presentation/components/maintenance/MaintenancePage';

export const metadata: Metadata = { title: 'Mantenimientos' };

export default function Page() {
  return <MaintenancePage />;
}
