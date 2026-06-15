import type { Metadata } from 'next';
import { ScanPage } from '@/presentation/components/tech/ScanPage';

export const metadata: Metadata = { title: 'Escanear Activo' };

export default function Page() {
  return <ScanPage />;
}
