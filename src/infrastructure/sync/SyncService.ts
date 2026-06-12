'use client';

/**
 * SyncService — Estado de conectividad y sincronización offline.
 *
 * Firestore (persistentLocalCache) ya encola escrituras offline y las
 * vuelca automáticamente al volver la red. Este servicio expone ese estado
 * a la UI:
 *  - online/offline (navigator.onLine + eventos)
 *  - hasPendingWrites: hay escrituras locales aún no confirmadas por servidor
 *  - waitForSync(): promesa que resuelve cuando la cola está vacía
 */

import { useSyncExternalStore } from 'react';
import { waitForPendingWrites, onSnapshotsInSync } from 'firebase/firestore';
import { db } from '@/infrastructure/firebase/firebaseConfig';

export interface SyncState {
  online: boolean;
  /** true mientras existan escrituras locales pendientes de subir */
  syncing: boolean;
  lastSyncAt: Date | null;
}

let state: SyncState = { online: true, syncing: false, lastSyncAt: null };
const listeners = new Set<() => void>();
let initialized = false;

function emit(partial: Partial<SyncState>) {
  state = { ...state, ...partial };
  listeners.forEach(l => l());
}

function init() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  state = { ...state, online: navigator.onLine };

  window.addEventListener('online', () => {
    emit({ online: true, syncing: true });
    // Al volver la red, esperar a que Firestore vuelque la cola
    waitForPendingWrites(db)
      .then(() => emit({ syncing: false, lastSyncAt: new Date() }))
      .catch(() => emit({ syncing: false }));
  });

  window.addEventListener('offline', () => emit({ online: false }));

  // Cada vez que los snapshots quedan en sync con el servidor.
  // IMPORTANTE: este evento dispara con mucha frecuencia; solo emitimos
  // cuando hay un cambio real de estado (evita tormentas de re-render
  // que interfieren con formularios abiertos).
  onSnapshotsInSync(db, () => {
    if (state.online && state.syncing) {
      emit({ syncing: false, lastSyncAt: new Date() });
    }
  });
}

function subscribe(cb: () => void): () => void {
  init();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getSnapshot = () => state;
const serverSnapshot: SyncState = { online: true, syncing: false, lastSyncAt: null };
const getServerSnapshot = () => serverSnapshot;

/** Hook React: estado de sincronización en vivo. */
export function useSyncStatus(): SyncState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Espera a que todas las escrituras pendientes lleguen al servidor. */
export async function waitForSync(): Promise<void> {
  await waitForPendingWrites(db);
}
