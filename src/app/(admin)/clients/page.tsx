import type { Metadata } from 'next';
import { ClientsPage } from '@/presentation/components/clients/ClientsPage';

export const metadata: Metadata = { title: 'Clientes y Activos' };

export default function Page() {
  return <ClientsPage />;
}
