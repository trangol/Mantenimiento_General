import type { Metadata } from 'next';
import { TeamPage } from '@/presentation/components/team/TeamPage';

export const metadata: Metadata = { title: 'Equipo' };

export default function Page() {
  return <TeamPage />;
}
