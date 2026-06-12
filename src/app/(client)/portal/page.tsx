import type { Metadata } from 'next';
import { ClientPortalPage } from '@/presentation/components/portal/ClientPortalPage';

export const metadata: Metadata = {
  title: 'Portal Cliente',
};

export default function Page() {
  return <ClientPortalPage />;
}
