'use client';

/**
 * SyncStatusBadge — Indicador visual de conectividad/sincronización.
 * Verde: en línea y sincronizado. Amarillo: sincronizando cola offline.
 * Rojo: sin conexión (los datos se guardan localmente y se volcarán solos).
 */

import { useSyncStatus } from '@/infrastructure/sync/SyncService';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function SyncStatusBadge() {
  const { online, syncing } = useSyncStatus();

  if (!online) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
        style={{ background: 'var(--red-bg, #fee2e2)', color: 'var(--red-text, #b91c1c)' }}
        title="Sin conexión: los registros se guardan en el dispositivo y se sincronizarán automáticamente al volver la red"
      >
        <WifiOff size={13} /> Offline — guardando local
      </span>
    );
  }

  if (syncing) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
        style={{ background: 'var(--yellow-bg, #fef9c3)', color: 'var(--yellow-text, #a16207)' }}
        title="Sincronizando datos pendientes con el servidor"
      >
        <RefreshCw size={13} className="animate-spin" /> Sincronizando…
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: 'var(--green-bg, #dcfce7)', color: 'var(--green-text, #15803d)' }}
      title="Conectado y sincronizado"
    >
      <Wifi size={13} /> En línea
    </span>
  );
}
