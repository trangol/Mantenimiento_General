import type { Metadata } from 'next';
import { InventoryPage } from '@/presentation/components/inventory/InventoryPage';

export const metadata: Metadata = { title: 'Inventario' };

export default function Page() {
  return <InventoryPage />;
}
