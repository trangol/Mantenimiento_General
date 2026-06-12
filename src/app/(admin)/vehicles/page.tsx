import type { Metadata } from 'next';
import { VehiclesPage } from '@/presentation/components/vehicles/VehiclesPage';

export const metadata: Metadata = { title: 'Vehículos' };

export default function Page() {
  return <VehiclesPage />;
}
