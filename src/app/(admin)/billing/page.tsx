import { redirect } from 'next/navigation';

/**
 * /billing (Cobros) — Los cobros viven dentro del módulo Finanzas
 * (pestaña "Cobros" de FinancesPage). Redirigimos para no duplicar UI.
 */
export default function Page() {
  redirect('/finances');
}
