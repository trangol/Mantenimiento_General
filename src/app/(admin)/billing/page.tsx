import { redirect } from 'next/navigation';

/**
 * /billing — Redirige al flujo de Preparación (paso 3 del flujo de cobros)
 */
export default function Page() {
  redirect('/billing/prepare');
}
