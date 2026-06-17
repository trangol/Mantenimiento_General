'use client';

/**
 * TechJornadaPage — Portal del técnico en terreno (mobile-first, offline-first).
 *
 * Flujo obligatorio por OT:
 *  1. Escanear QR físico del activo (QR entrada → registra startedAt)
 *  2. Tomar al menos 1 foto inicial (evidencia estado antes)
 *  3. Completar todos los ítems required del protocolo (checklist)
 *  4. Agregar insumos utilizados
 *  5. Escanear QR de cierre (QR salida → confirma fin del servicio)
 *  6. Tomar al menos 1 foto final (evidencia estado después)
 *  7. Completar OT → se sincroniza y descuenta stock
 *
 * Sin cumplir cada requisito el botón del siguiente paso permanece bloqueado.
 * Funciona offline: Firestore caché IndexedDB → sincroniza al reconectar.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, clearSession } from '@/infrastructure/auth/RoleContext';
import { repositories } from '@/infrastructure/firebase/RepositoryFactory';
import { MaintenanceRecord, ChecklistItem, SupplyUsage } from '@/core/domain/MaintenanceRecord';
import { InventoryItem } from '@/core/domain/InventoryItem';
import { Badge } from '@/presentation/components/ui';
import { Timestamp, doc, updateDoc, collection } from 'firebase/firestore';
import { db } from '@/infrastructure/firebase/firebaseConfig';
import { stampTenant, stripUndefined } from '@/infrastructure/firebase/tenantScope';

// ── helpers ───────────────────────────────────────────────────────────────────

function dateToInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtTime(d?: Date) {
  if (!d) return '—';
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(start?: Date, end?: Date) {
  if (!start) return '—';
  const ms = (end ?? new Date()).getTime() - start.getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

function fmtDate(d?: Date) {
  if (!d) return '—';
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', in_progress: 'En curso', completed: 'Completada', cancelled: 'Cancelada',
};
const STATUS_COLOR: Record<string, 'gray' | 'yellow' | 'green' | 'red'> = {
  pending: 'gray', in_progress: 'yellow', completed: 'green', cancelled: 'red',
};

// ── Simulador de foto (en prod reemplazar con capture="environment") ──────────

interface PhotoCaptureProps {
  label: string;
  photos: string[];
  onAdd: (url: string) => void;
  disabled?: boolean;
}

function PhotoCapture({ label, photos, onAdd, disabled }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // En producción, aquí se subiría a Cloud Storage y se devolvería la URL.
    // Por ahora: URL local para preview.
    const url = URL.createObjectURL(file);
    onAdd(url);
    // Reset input para permitir la misma foto de nuevo si fuera necesario
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '10px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {photos.map((p, i) => (
          <div key={i} style={{
            width: '80px', height: '80px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-hover)', overflow: 'hidden', border: '1px solid var(--bg-border)',
            position: 'relative',
          }}>
            <img src={p} alt={`Foto ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
        {!disabled && (
          <button
            onClick={() => inputRef.current?.click()}
            style={{
              width: '80px', height: '80px', borderRadius: 'var(--radius-sm)',
              border: '2px dashed var(--brand-400)', background: 'rgba(var(--brand-500-rgb, 59,130,246),0.06)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', gap: '4px',
            }}
          >
            <span style={{ fontSize: '24px' }}>📷</span>
            <span style={{ fontSize: '10px', color: 'var(--brand-400)', fontWeight: 600 }}>Agregar</span>
          </button>
        )}
      </div>
      {/* Input real con capture para móvil */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      {photos.length === 0 && !disabled && (
        <div style={{ fontSize: '11px', color: 'var(--error-400)', marginTop: '6px' }}>
          ⚠️ Obligatorio: mínimo 1 foto
        </div>
      )}
    </div>
  );
}

// ── Simulador de escaneo QR ───────────────────────────────────────────────────

interface QRScanProps {
  label: string;
  sublabel: string;
  scanned: boolean;
  onScan: () => void;
  disabled?: boolean;
}

function QRScanButton({ label, sublabel, scanned, onScan, disabled }: QRScanProps) {
  return (
    <button
      onClick={() => !scanned && !disabled && onScan()}
      disabled={disabled || scanned}
      style={{
        width: '100%', padding: '16px', borderRadius: 'var(--radius-md)',
        border: `2px solid ${scanned ? 'rgba(16,185,129,0.5)' : disabled ? 'var(--bg-border)' : 'var(--brand-400)'}`,
        background: scanned ? 'rgba(16,185,129,0.06)' : disabled ? 'var(--bg-surface)' : 'rgba(59,130,246,0.04)',
        cursor: scanned || disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left',
      }}
    >
      <span style={{ fontSize: '32px' }}>{scanned ? '✅' : '📲'}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: '14px', color: scanned ? '#10b981' : disabled ? 'var(--text-muted)' : 'var(--text-primary)' }}>
          {scanned ? `${label} — Escaneado` : label}
        </div>
        <div style={{ fontSize: '12px', color: scanned ? '#10b981' : 'var(--text-secondary)', marginTop: '2px' }}>
          {scanned ? '✓ Registrado correctamente' : sublabel}
        </div>
      </div>
    </button>
  );
}

// ── OT Detail Modal ───────────────────────────────────────────────────────────

interface OTModalProps {
  ot: MaintenanceRecord;
  inventory: InventoryItem[];
  onClose: () => void;
  onUpdated: (updated: MaintenanceRecord) => void;
}

/**
 * Modal de OT con flujo estricto de 6 pasos:
 * 1. QR entrada  2. Fotos iniciales  3. Checklist  4. Insumos
 * 5. QR salida   6. Fotos finales  → Completar OT
 */
function OTModal({ ot, inventory, onClose, onUpdated }: OTModalProps) {
  const session = getSession();

  // ── Estado del flujo ───────────────────────────────────────────────────────
  const [qrEntrada, setQrEntrada] = useState(!!ot.startedAt);
  const [initialPhotos, setInitialPhotos] = useState<string[]>(ot.initialPhotos ?? []);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(ot.checklist ?? []);
  const [supplies, setSupplies] = useState<SupplyUsage[]>(ot.suppliesUsed ?? []);
  const [observations, setObservations] = useState(ot.observations ?? '');
  const [qrSalida, setQrSalida] = useState(false);
  const [finalPhotos, setFinalPhotos] = useState<string[]>(ot.finalPhotos ?? []);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [addingSupply, setAddingSupply] = useState(false);
  const [supplySearch, setSupplySearch] = useState('');
  const [supplyQty, setSupplyQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Validaciones por paso ──────────────────────────────────────────────────
  const allRequiredDone = checklist.filter(c => c.required).every(c => !!c.completedAt);
  const hasInitialPhotos = initialPhotos.length > 0;
  const hasFinalPhotos = finalPhotos.length > 0;

  // Pasos habilitados
  const canDoChecklist = qrEntrada && hasInitialPhotos;
  const canAddSupplies = canDoChecklist;
  const canScanQrSalida = canDoChecklist && allRequiredDone;
  const canTakeFinalPhotos = canScanQrSalida && qrSalida;
  const canComplete = canTakeFinalPhotos && hasFinalPhotos;

  // ── Acciones ───────────────────────────────────────────────────────────────
  const handleScanQrEntrada = async () => {
    // En producción: leer cámara QR. Por ahora simulamos.
    setSaving(true); setError('');
    try {
      const now = new Date();
      if (ot.status === 'pending') {
        await updateDoc(doc(collection(db, 'maintenance_records'), ot.id), stripUndefined({
          status: 'in_progress',
          startedAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.now(),
        }));
        onUpdated({ ...ot, status: 'in_progress', startedAt: now });
      }
      setQrEntrada(true);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const toggleCheck = (id: string) => {
    if (!canDoChecklist || ot.status === 'completed') return;
    setChecklist(prev => prev.map(c => {
      if (c.id !== id) return c;
      if (c.completedAt) return { ...c, completedAt: undefined, completedBy: undefined };
      return { ...c, completedAt: new Date(), completedBy: session?.userName ?? '' };
    }));
  };

  const addSupply = (item: InventoryItem) => {
    setSupplies(prev => {
      const existing = prev.find(s => s.inventoryItemId === item.id);
      if (existing) return prev.map(s => s.inventoryItemId === item.id ? { ...s, quantity: s.quantity + supplyQty } : s);
      return [...prev, { inventoryItemId: item.id, name: item.name, quantity: supplyQty, unitCost: item.unitCost ?? 0 }];
    });
    setAddingSupply(false);
    setSupplySearch('');
    setSupplyQty(1);
  };

  const removeSupply = (id: string) => {
    setSupplies(prev => prev.filter(s => s.inventoryItemId !== id));
  };

  const handleSaveDraft = async () => {
    setSaving(true); setError('');
    try {
      const totalCost = supplies.reduce((sum, s) => sum + s.quantity * s.unitCost, 0);
      const serialized = checklist.map(c => ({
        ...c, completedAt: c.completedAt ? Timestamp.fromDate(c.completedAt) : null,
      }));
      await updateDoc(doc(collection(db, 'maintenance_records'), ot.id), stripUndefined({
        checklist: serialized,
        observations,
        suppliesUsed: supplies,
        totalCost,
        initialPhotos,
        updatedAt: Timestamp.now(),
      }));
      onUpdated({ ...ot, checklist, observations, suppliesUsed: supplies, totalCost, initialPhotos });
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleComplete = async () => {
    if (!canComplete) {
      if (!qrEntrada) { setError('Debes escanear el QR de entrada para iniciar el servicio.'); return; }
      if (!hasInitialPhotos) { setError('Debes tomar al menos una foto inicial del estado del equipo.'); return; }
      if (!allRequiredDone) { setError('Debes completar todos los pasos obligatorios del protocolo.'); return; }
      if (!qrSalida) { setError('Debes escanear el QR de salida para confirmar el cierre del servicio.'); return; }
      if (!hasFinalPhotos) { setError('Debes tomar al menos una foto final del estado del equipo.'); return; }
      return;
    }
    setSaving(true); setError('');
    try {
      const now = new Date();
      const totalCost = supplies.reduce((sum, s) => sum + s.quantity * s.unitCost, 0);
      const serialized = checklist.map(c => ({
        ...c, completedAt: c.completedAt ? Timestamp.fromDate(c.completedAt) : null,
      }));
      await updateDoc(doc(collection(db, 'maintenance_records'), ot.id), stripUndefined({
        status: 'completed',
        completedAt: Timestamp.fromDate(now),
        checklist: serialized,
        checklistCompleted: true,
        observations,
        suppliesUsed: supplies,
        totalCost,
        initialPhotos,
        finalPhotos,
        updatedAt: Timestamp.now(),
      }));
      onUpdated({ ...ot, status: 'completed', completedAt: now, checklist, checklistCompleted: true, observations, suppliesUsed: supplies, totalCost, initialPhotos, finalPhotos });
      onClose();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const filteredInventory = inventory.filter(i =>
    i.name.toLowerCase().includes(supplySearch.toLowerCase()) && i.currentStock > 0
  );

  const isCompleted = ot.status === 'completed';

  // ── Barra de progreso del flujo ────────────────────────────────────────────
  const steps = [
    { label: 'QR Entrada', done: qrEntrada },
    { label: 'Fotos inicio', done: hasInitialPhotos },
    { label: 'Protocolo', done: allRequiredDone },
    { label: 'QR Salida', done: qrSalida || isCompleted },
    { label: 'Fotos fin', done: hasFinalPhotos || isCompleted },
  ];
  const stepsDone = steps.filter(s => s.done).length;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 1000, display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--bg-base)', minHeight: '100vh',
        maxWidth: '480px', width: '100%', margin: '0 auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--bg-border)', padding: '16px', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px' }}>{ot.clientName ?? 'Cliente'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ot.assetName ?? 'Activo'}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Badge color={STATUS_COLOR[ot.status]}>{STATUS_LABEL[ot.status]}</Badge>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>✕</button>
            </div>
          </div>
          {ot.startedAt && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
              ⏱ Iniciado: {fmtTime(ot.startedAt)} · Duración: {fmtDuration(ot.startedAt, ot.completedAt)}
            </div>
          )}
          {ot.workOrderNotes && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', padding: '6px 10px', background: 'rgba(59,130,246,0.06)', borderRadius: 'var(--radius-sm)' }}>
              📋 {ot.workOrderNotes}
            </div>
          )}

          {/* Barra de progreso del flujo */}
          {!isCompleted && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Flujo de servicio</span>
                <span style={{ fontWeight: 700, color: stepsDone === steps.length ? '#10b981' : 'var(--brand-400)' }}>{stepsDone}/{steps.length} pasos</span>
              </div>
              <div style={{ height: '4px', background: 'var(--bg-border)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  background: stepsDone === steps.length ? '#10b981' : 'var(--brand-500)',
                  width: `${(stepsDone / steps.length) * 100}%`,
                  transition: 'width 0.3s',
                }} />
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                {steps.map((s, i) => (
                  <span key={i} style={{
                    fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '100px',
                    background: s.done ? 'rgba(16,185,129,0.12)' : 'var(--bg-surface)',
                    color: s.done ? '#10b981' : 'var(--text-muted)',
                    border: `1px solid ${s.done ? 'rgba(16,185,129,0.3)' : 'var(--bg-border)'}`,
                  }}>
                    {s.done ? '✓' : i + 1} {s.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px', fontSize: '13px', color: 'var(--error-400)' }}>
              ⚠️ {error}
            </div>
          )}

          {/* ─── PASO 1: QR Entrada ─────────────────────────────────────────── */}
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.04em' }}>
              PASO 1 · INICIO DEL SERVICIO
            </div>
            <QRScanButton
              label="Escanear QR de Entrada"
              sublabel="Escanea el QR físico instalado en el activo para registrar hora de inicio"
              scanned={qrEntrada}
              onScan={handleScanQrEntrada}
              disabled={saving || isCompleted}
            />
          </div>

          {/* ─── PASO 2: Fotos Iniciales ────────────────────────────────────── */}
          <div style={{ opacity: qrEntrada ? 1 : 0.45, pointerEvents: qrEntrada ? 'auto' : 'none' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.04em' }}>
              PASO 2 · FOTOS INICIALES
              {!qrEntrada && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>← Escanea QR primero</span>}
            </div>
            <PhotoCapture
              label="Estado inicial del equipo"
              photos={initialPhotos}
              onAdd={url => setInitialPhotos(prev => [...prev, url])}
              disabled={isCompleted}
            />
          </div>

          {/* ─── PASO 3: Protocolo / Checklist ──────────────────────────────── */}
          <div style={{ opacity: canDoChecklist ? 1 : 0.45, pointerEvents: canDoChecklist ? 'auto' : 'none' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.04em' }}>
              PASO 3 · PROTOCOLO DE SERVICIO
              {!canDoChecklist && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>← Completa pasos anteriores</span>}
            </div>
            {checklist.length > 0 ? (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {checklist.filter(c => !!c.completedAt).length}/{checklist.length} completados
                  {checklist.filter(c => c.required && !c.completedAt).length > 0 && (
                    <span style={{ color: 'var(--error-400)', marginLeft: '8px' }}>
                      · {checklist.filter(c => c.required && !c.completedAt).length} obligatorios pendientes
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {checklist.map(item => (
                    <button key={item.id} onClick={() => toggleCheck(item.id)} style={{
                      display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px',
                      borderRadius: 'var(--radius-sm)', border: `1px solid ${item.completedAt ? 'rgba(16,185,129,0.4)' : item.required ? 'rgba(239,68,68,0.3)' : 'var(--bg-border)'}`,
                      background: item.completedAt ? 'rgba(16,185,129,0.06)' : 'var(--bg-card)',
                      cursor: isCompleted ? 'default' : 'pointer', textAlign: 'left', width: '100%',
                    }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                        border: `2px solid ${item.completedAt ? '#10b981' : item.required ? 'var(--error-400)' : 'var(--bg-border)'}`,
                        background: item.completedAt ? '#10b981' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {item.completedAt && <span style={{ color: 'white', fontSize: '11px', fontWeight: 700 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.label}</div>
                        {item.required && !item.completedAt && (
                          <div style={{ fontSize: '11px', color: 'var(--error-400)', marginTop: '2px' }}>Obligatorio</div>
                        )}
                        {item.completedAt && (
                          <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
                            {fmtTime(item.completedAt)} · {item.completedBy}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                Sin protocolo definido para este activo.
              </div>
            )}
          </div>

          {/* ─── PASO 3b: Insumos ────────────────────────────────────────────── */}
          <div style={{ opacity: canAddSupplies ? 1 : 0.45, pointerEvents: canAddSupplies ? 'auto' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                INSUMOS UTILIZADOS
              </div>
              {!isCompleted && (
                <button className="btn btn-secondary btn-sm" onClick={() => setAddingSupply(true)}>+ Agregar</button>
              )}
            </div>
            {supplies.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}>Sin insumos registrados</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {supplies.map(s => (
                  <div key={s.inventoryItemId} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--bg-border)',
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {s.quantity} × ${s.unitCost.toLocaleString('es-CL')} = ${(s.quantity * s.unitCost).toLocaleString('es-CL')}
                      </div>
                    </div>
                    {!isCompleted && (
                      <button onClick={() => removeSupply(s.inventoryItemId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error-400)', fontSize: '18px', padding: '4px' }}>×</button>
                    )}
                  </div>
                ))}
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right', paddingTop: '4px' }}>
                  Total insumos: ${supplies.reduce((sum, s) => sum + s.quantity * s.unitCost, 0).toLocaleString('es-CL')}
                </div>
              </div>
            )}

            {addingSupply && (
              <div style={{ marginTop: '10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input className="form-input" placeholder="Buscar insumo..." value={supplySearch} onChange={e => setSupplySearch(e.target.value)} autoFocus style={{ flex: 1, fontSize: '14px' }} />
                  <input type="number" className="form-input" value={supplyQty} onChange={e => setSupplyQty(Math.max(1, Number(e.target.value)))} style={{ width: '70px', fontSize: '14px' }} min={1} />
                  <button onClick={() => setAddingSupply(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px' }}>✕</button>
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredInventory.slice(0, 20).map(item => (
                    <button key={item.id} onClick={() => addSupply(item)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Stock: {item.currentStock} · ${item.unitCost.toLocaleString('es-CL')}</span>
                    </button>
                  ))}
                  {filteredInventory.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px' }}>Sin resultados</div>}
                </div>
              </div>
            )}
          </div>

          {/* ─── Observaciones ───────────────────────────────────────────────── */}
          {(ot.status !== 'pending' || qrEntrada) && (
            <div>
              <label className="form-label">Observaciones</label>
              <textarea
                className="form-input"
                rows={3}
                value={observations}
                onChange={e => setObservations(e.target.value)}
                placeholder="Condición inicial, anomalías, trabajos realizados..."
                disabled={isCompleted}
                style={{ resize: 'none', fontSize: '14px' }}
              />
            </div>
          )}

          {/* ─── PASO 4: QR Salida ──────────────────────────────────────────── */}
          <div style={{ opacity: canScanQrSalida ? 1 : 0.45, pointerEvents: canScanQrSalida ? 'auto' : 'none' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.04em' }}>
              PASO 4 · CIERRE DEL SERVICIO
              {!canScanQrSalida && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>← Completa el protocolo primero</span>}
            </div>
            <QRScanButton
              label="Escanear QR de Salida"
              sublabel="Escanea el QR del activo para confirmar que terminaste el servicio"
              scanned={qrSalida || isCompleted}
              onScan={() => setQrSalida(true)}
              disabled={isCompleted}
            />
          </div>

          {/* ─── PASO 5: Fotos Finales ──────────────────────────────────────── */}
          <div style={{ opacity: canTakeFinalPhotos || isCompleted ? 1 : 0.45, pointerEvents: canTakeFinalPhotos || isCompleted ? 'auto' : 'none' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.04em' }}>
              PASO 5 · FOTOS FINALES
              {!canTakeFinalPhotos && !isCompleted && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>← Escanea QR de salida primero</span>}
            </div>
            <PhotoCapture
              label="Estado final del equipo"
              photos={finalPhotos}
              onAdd={url => setFinalPhotos(prev => [...prev, url])}
              disabled={isCompleted}
            />
          </div>

          {/* Espaciado inferior para el sticky footer */}
          <div style={{ height: '80px' }} />
        </div>

        {/* Footer actions */}
        {!isCompleted && (
          <div style={{ padding: '16px', borderTop: '1px solid var(--bg-border)', display: 'flex', gap: '10px', background: 'var(--bg-card)', position: 'sticky', bottom: 0 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleSaveDraft} disabled={saving || !qrEntrada}>
              {saving ? '⏳...' : '💾 Guardar avance'}
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, opacity: canComplete ? 1 : 0.5 }}
              onClick={handleComplete}
              disabled={saving}
            >
              {saving ? '⏳...' : '✅ Completar OT'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Historial de mantenimientos ───────────────────────────────────────────────

interface HistorialProps {
  technicianId: string;
  today: Date;
}

function HistorialTrabajador({ technicianId, today }: HistorialProps) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    repositories.maintenance.getByTechnicianId(technicianId).then(all => {
      // Excluir los de hoy (ya se muestran en la jornada) y ordenar desc
      const todayStr = dateToInputValue(today);
      const past = all
        .filter(r => {
          const d = r.scheduledDate instanceof Date ? r.scheduledDate : new Date(r.scheduledDate);
          return dateToInputValue(d) !== todayStr;
        })
        .sort((a, b) => {
          const da = a.scheduledDate instanceof Date ? a.scheduledDate : new Date(a.scheduledDate);
          const db = b.scheduledDate instanceof Date ? b.scheduledDate : new Date(b.scheduledDate);
          return db.getTime() - da.getTime();
        });
      setRecords(past);
      setLoading(false);
    });
  }, [technicianId, today]);

  if (loading) return null;
  if (records.length === 0) return null;

  const visible = expanded ? records : records.slice(0, 5);

  return (
    <div style={{ padding: '0 16px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px' }}>📋 Historial de Servicios</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {records.length} servicio{records.length !== 1 ? 's' : ''} realizados
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {visible.map(r => {
          const d = r.scheduledDate instanceof Date ? r.scheduledDate : new Date(r.scheduledDate);
          return (
            <div key={r.id} style={{
              background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
              border: `1px solid ${r.status === 'completed' ? 'rgba(16,185,129,0.2)' : 'var(--bg-border)'}`,
              padding: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{r.clientName ?? 'Cliente'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.assetName ?? 'Activo'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {fmtDate(d)}
                    {r.startedAt && r.completedAt && (
                      <span style={{ marginLeft: '8px' }}>· Duración: {fmtDuration(r.startedAt, r.completedAt)}</span>
                    )}
                  </div>
                </div>
                <Badge color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge>
              </div>

              {r.suppliesUsed && r.suppliesUsed.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)', padding: '6px 8px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                  🧴 {r.suppliesUsed.map(s => `${s.name} (${s.quantity})`).join(', ')}
                  {r.totalCost > 0 && (
                    <span style={{ marginLeft: '8px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      · ${r.totalCost.toLocaleString('es-CL')}
                    </span>
                  )}
                </div>
              )}

              {r.observations && (
                <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  "{r.observations}"
                </div>
              )}
            </div>
          );
        })}
      </div>

      {records.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ marginTop: '10px', background: 'none', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)', width: '100%' }}
        >
          {expanded ? '▲ Mostrar menos' : `▼ Ver todos (${records.length - 5} más)`}
        </button>
      )}
    </div>
  );
}

// ── Main Tech Page ─────────────────────────────────────────────────────────────

export function TechJornadaPage() {
  const router = useRouter();
  const session = getSession();
  const [ots, setOts] = useState<MaintenanceRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOT, setSelectedOT] = useState<MaintenanceRecord | null>(null);
  const [today] = useState(new Date());

  useEffect(() => {
    if (!session || session.role !== 'tech') router.replace('/login');
  }, [session, router]);

  const loadOTs = useCallback(async () => {
    if (!session?.userId) return;
    setLoading(true);
    try {
      const all = await repositories.maintenance.getByTechnicianId(session.userId);
      const todayStr = dateToInputValue(today);
      const todayOTs = all.filter(ot => {
        const d = ot.scheduledDate instanceof Date ? ot.scheduledDate : new Date(ot.scheduledDate);
        return dateToInputValue(d) === todayStr;
      });
      todayOTs.sort((a, b) => {
        const order: Record<string, number> = { in_progress: 0, pending: 1, completed: 2, cancelled: 3 };
        return order[a.status] - order[b.status];
      });
      setOts(todayOTs);
    } finally { setLoading(false); }
  }, [session?.userId, today]);

  useEffect(() => { loadOTs(); }, [loadOTs]);
  useEffect(() => { repositories.inventory.getAll().then(setInventory); }, []);

  const handleOTUpdated = (updated: MaintenanceRecord) => {
    setOts(prev => prev.map(o => o.id === updated.id ? updated : o));
    if (selectedOT?.id === updated.id) setSelectedOT(updated);
  };

  const handleLogout = () => { clearSession(); router.replace('/login'); };

  const pendingCount = ots.filter(o => o.status === 'pending').length;
  const doneCount = ots.filter(o => o.status === 'completed').length;
  const inProgressOT = ots.find(o => o.status === 'in_progress');

  if (!session || session.role !== 'tech') return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--bg-border)', padding: '16px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>PORTAL TÉCNICO</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>👋 {session.userName}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {today.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Salir
          </button>
        </div>

        {/* Progreso del día */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Progreso del día</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{doneCount}/{ots.length} completadas</span>
          </div>
          <div style={{ height: '6px', background: 'var(--bg-border)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '3px',
              background: doneCount === ots.length && ots.length > 0 ? '#10b981' : 'var(--brand-500)',
              width: `${ots.length > 0 ? (doneCount / ots.length) * 100 : 0}%`,
              transition: 'width 0.4s',
            }} />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>🔵 {pendingCount} pendientes</span>
            <span>🟡 {ots.filter(o => o.status === 'in_progress').length} en curso</span>
            <span>🟢 {doneCount} completadas</span>
          </div>
        </div>
      </div>

      {/* OT en curso destacada */}
      {inProgressOT && (
        <div style={{ padding: '12px 16px' }}>
          <div style={{
            background: 'rgba(234,179,8,0.08)', border: '2px solid rgba(234,179,8,0.4)',
            borderRadius: 'var(--radius-md)', padding: '14px', cursor: 'pointer',
          }} onClick={() => setSelectedOT(inProgressOT)}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#ca8a04', marginBottom: '4px', letterSpacing: '0.05em' }}>EN CURSO AHORA</div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>{inProgressOT.clientName}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{inProgressOT.assetName}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
              ⏱ Iniciada a las {fmtTime(inProgressOT.startedAt)} · {fmtDuration(inProgressOT.startedAt)}
            </div>
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#ca8a04', fontWeight: 600 }}>
                Protocolo: {inProgressOT.checklist.filter(c => !!c.completedAt).length}/{inProgressOT.checklist.length}
              </span>
              <span style={{ color: 'var(--brand-400)', fontWeight: 600 }}>Continuar →</span>
            </div>
          </div>
        </div>
      )}

      {/* Lista de OTs del día */}
      <div style={{ flex: 1, padding: '0 16px 24px' }}>
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Cargando jornada...</div>
        ) : ots.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>Sin servicios asignados hoy</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>El coordinador aún no ha creado tu jornada de hoy.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ots.map((ot, idx) => {
              if (ot.status === 'in_progress') return null;
              return (
                <div key={ot.id} onClick={() => setSelectedOT(ot)} style={{
                  background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
                  border: `1px solid ${ot.status === 'completed' ? 'rgba(16,185,129,0.2)' : 'var(--bg-border)'}`,
                  padding: '14px', cursor: 'pointer',
                  opacity: ot.status === 'completed' ? 0.75 : 1,
                  transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                        background: ot.status === 'completed' ? '#10b981' : 'var(--bg-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 700, color: 'white',
                      }}>
                        {ot.status === 'completed' ? '✓' : idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{ot.clientName ?? 'Cliente'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ot.assetName ?? 'Activo'}</div>
                      </div>
                    </div>
                    <Badge color={STATUS_COLOR[ot.status]}>{STATUS_LABEL[ot.status]}</Badge>
                  </div>
                  {ot.completedAt && (
                    <div style={{ fontSize: '11px', color: '#10b981' }}>
                      ✓ Completada a las {fmtTime(ot.completedAt)} · {fmtDuration(ot.startedAt, ot.completedAt)}
                    </div>
                  )}
                  {ot.status === 'pending' && (
                    <div style={{ fontSize: '12px', color: 'var(--brand-400)', marginTop: '4px' }}>
                      Toca para iniciar →
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de servicios anteriores */}
      {!loading && (
        <HistorialTrabajador technicianId={session.userId} today={today} />
      )}

      {/* OT Modal */}
      {selectedOT && (
        <OTModal
          ot={selectedOT}
          inventory={inventory}
          onClose={() => { setSelectedOT(null); loadOTs(); }}
          onUpdated={handleOTUpdated}
        />
      )}
    </div>
  );
}
