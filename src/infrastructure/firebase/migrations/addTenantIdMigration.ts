/**
 * addTenantIdMigration — Migración de datos legados a multi-tenant.
 *
 * Recorre las colecciones operativas y a todo documento SIN campo `tenantId`
 * le estampa el tenant activo (getCurrentTenantId()). Idempotente: los docs
 * que ya tienen tenantId no se tocan, por lo que puede ejecutarse varias veces.
 *
 * Buenas prácticas Firestore aplicadas:
 *  - writeBatch en lotes de 400 (límite duro: 500 operaciones por batch).
 *  - try/catch por colección: una colección inexistente o sin permisos no
 *    aborta la migración completa.
 */

import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/infrastructure/firebase/firebaseConfig';
import { getCurrentTenantId } from '@/infrastructure/tenant/TenantContext';

/** Colecciones operativas a migrar. */
const COLLECTIONS = [
  'clients',
  'assets',
  'maintenance_records',
  'inventory',
  'stock_movements',
  'quotes',
  'invoices',
  'vehicles',
  'routes',
  'team',
] as const;

/** Tamaño de lote (margen bajo el límite de 500 de Firestore). */
const BATCH_SIZE = 400;

export interface MigrationResult {
  collection: string;
  updated: number;
}

/**
 * Ejecuta la migración y devuelve un resumen por colección.
 * Las colecciones que fallen (no existen / sin permisos) se reportan con 0.
 */
export async function runAddTenantIdMigration(): Promise<MigrationResult[]> {
  const tenantId = getCurrentTenantId();
  const results: MigrationResult[] = [];

  for (const colName of COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, colName));
      // Solo documentos legados sin tenantId
      const pending = snap.docs.filter(d => d.data().tenantId === undefined);

      let updated = 0;
      // Escribir en lotes de BATCH_SIZE
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = pending.slice(i, i + BATCH_SIZE);
        chunk.forEach(d => {
          batch.update(doc(db, colName, d.id), { tenantId });
        });
        await batch.commit();
        updated += chunk.length;
      }

      results.push({ collection: colName, updated });
    } catch (err) {
      // Colección inexistente o error puntual: no abortar la migración global
      console.warn(`[migración tenantId] colección "${colName}" omitida:`, err);
      results.push({ collection: colName, updated: 0 });
    }
  }

  return results;
}
