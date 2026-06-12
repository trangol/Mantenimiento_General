/**
 * tenantScope — Helpers de aislamiento multi-tenant para Firestore.
 *
 * REGLAS OBLIGATORIAS para todo repositorio:
 *  1. Toda query de colección DEBE incluir `tenantWhere()`.
 *  2. Toda escritura (create) DEBE pasar por `stampTenant()`.
 *  3. Toda lectura por id DEBE validarse con `assertTenant()` antes de
 *     devolver el documento (defensa en profundidad: aunque las rules
 *     fallen, el cliente nunca expone datos de otro tenant).
 */

import { where, QueryConstraint } from 'firebase/firestore';
import { getCurrentTenantId } from '@/infrastructure/tenant/TenantContext';

/** Constraint de query: filtra por el tenant activo. */
export function tenantWhere(): QueryConstraint {
  return where('tenantId', '==', getCurrentTenantId());
}

/** Estampa el tenantId activo en datos a escribir. */
export function stampTenant<T extends Record<string, unknown>>(data: T): T & { tenantId: string } {
  return { ...data, tenantId: getCurrentTenantId() };
}

/**
 * Valida que un documento leído por id pertenezca al tenant activo.
 * Documentos legados sin tenantId se aceptan (pre-migración) — ver
 * scripts de migración en src/infrastructure/firebase/migrations/.
 */
export function belongsToTenant(data: Record<string, unknown>): boolean {
  const t = data.tenantId as string | undefined;
  return t === undefined || t === getCurrentTenantId();
}

/** Elimina claves undefined (Firestore las rechaza). */
export function stripUndefined<T extends Record<string, unknown>>(data: T): T {
  const out = { ...data };
  Object.keys(out).forEach(k => {
    if (out[k] === undefined) delete out[k];
  });
  return out;
}
