'use client';

/**
 * TechJornadaPage — Portal del técnico en terreno (mobile-first, offline-first).
 *
 * Muestra SOLO las OTs del técnico logueado para hoy.
 * Permite iniciar, completar, agregar observaciones e insumos.
 * Funciona offline: Firestore caché IndexedDB → sincroniza al reconectar.
 */

import React, { useState, useEffect, useCallback } from 'react';
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

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', in_progress: 'En curso', completed: 'Completada', cancelled: 'Cancelada',
};
const STATUS_COLOR: Record<string, 'gray' | 'yellow' | 'green' | 'red'> = {
  pending: 'gray', in_progress: 'yellow', completed: 'green', cancelled: 'red',
};

// ── OT Detail Modal ───────────────────────────────────────────────────────────

interface OTModalProps {
  ot: MaintenanceRecord;
  inventory: InventoryItem[];
  onClose: () => void;
  onUpdated: (updated: MaintenanceRecord) => void;
}

function OTModal({ ot, inventory, onClose, onUpdated }: OTModalProps) {
  const [observations, setObservations] = useState(ot.observations ?? '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(ot.checklist ?? []);
  const [supplies, setSupplies] = useState<SupplyUsage[]>(ot.suppliesUsed ?? []);
  const [addingSupply, setAddingSupply] = useState(false);
  const [supplySearch, setSupplySearch] = useState('');
  const [supplyQty, setSupplyQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const session = getSession();
  const allRequired = checklist.filter(c => c.required);
  const allRequiredDone = allRequired.every(c => !!c.completedAt);

  const toggleCheck = (id: string) => {
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

  const handleStart = async () => {
    setSaving(true); setError('');
    try {
      const now = new Date();
      await updateDoc(doc(collection(db, 'maintenance_records'), ot.id), stripUndefined({
        status: 'in_progress',
        startedAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.now(),
      }));
      onUpdated({ ...ot, status: 'in_progress', startedAt: now });
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleComplete = async () => {
    if (!allRequiredDone) { setError('Debes completar todos los pasos obligatorios del protocolo.'); return; }
    setSaving(true); setError('');
    try {
      const now = new Date();
      const totalCost = supplies.reduce((sum, s) => sum + s.quantity * s.unitCost, 0);
      const serialized = checklist.map(c => ({
        ...c,
        completedAt: c.completedAt ? Timestamp.fromDate(c.completedAt) : null,
      }));
      await updateDoc(doc(collection(db, 'maintenance_records'), ot.id), stripUndefined({
        status: 'completed',
        completedAt: Timestamp.fromDate(now),
        checklist: serialized,
        checklistCompleted: true,
        observations,
        suppliesUsed: supplies,
        totalCost,
        updatedAt: Timestamp.now(),
      }));
      onUpdated({ ...ot, status: 'completed', completedAt: now, checklist, checklistCompleted: true, observations, suppliesUsed: supplies, totalCost });
      onClose();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleSaveDraft = async () => {
    setSaving(true); setError('');
    try {
      const totalCost = supplies.reduce((sum, s) => sum + s.quantity * s.unitCost, 0);
      const serialized = checklist.map(c => ({
        ...c,
        completedAt: c.completedAt ? Timestamp.fromDate(c.completedAt) : null,
      }));
      await updateDoc(doc(collection(db, 'maintenance_records'), ot.id), stripUndefined({
        checklist: serialized,
        observations,
        suppliesUsed: supplies,
        totalCost,
        updatedAt: Timestamp.now(),
      }));
      onUpdated({ ...ot, checklist, observations, suppliesUsed: supplies, totalCost });
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const filteredInventory = inventory.filter(i =>
    i.name.toLowerCase().includes(supplySearch.toLowerCase()) && i.currentStock > 0
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 1000, display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
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
        </div>

        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px', fontSize: '13px', color: 'var(--error-400)' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Botón iniciar */}
          {ot.status === 'pending' && (
            <button className="btn btn-primary" style={{ fontSize: '16px', padding: '14px' }} onClick={handleStart} disabled={saving}>
              {saving ? '⏳...' : '▶ Iniciar servicio'}
            </button>
          )}

          {/* Protocolo / Checklist */}
          {checklist.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '10px' }}>
                ✅ Protocolo ({checklist.filter(c => !!c.completedAt).length}/{checklist.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {checklist.map(item => (
                  <button key={item.id} onClick={() => ot.status !== 'completed' && toggleCheck(item.id)} style={{
                    display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px',
                    borderRadius: 'var(--radius-sm)', border: `1px solid ${item.completedAt ? 'rgba(16,185,129,0.4)' : 'var(--bg-border)'}`,
                    background: item.completedAt ? 'rgba(16,185,129,0.06)' : 'var(--bg-card)',
                    cursor: ot.status === 'completed' ? 'default' : 'pointer', textAlign: 'left', width: '100%',
                  }}>
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
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
          )}

          {/* Observaciones */}
          {(ot.status === 'in_progress' || ot.status === 'completed') && (
            <div>
              <label className="form-label">Observaciones</label>
              <textarea
                className="form-input"
                rows={3}
                value={observations}
                onChange={e => setObservations(e.target.value)}
                placeholder="Condición inicial, anomalías, trabajos realizados..."
                disabled={ot.status === 'completed'}
                style={{ resize: 'none', fontSize: '14px' }}
              />
            </div>
          )}

          {/* Insumos utilizados */}
          {(ot.status === 'in_progress' || ot.status === 'completed') && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>🧴 Insumos utilizados</div>
                {ot.status !== 'completed' && (
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
                      {ot.status !== 'completed' && (
                        <button onClick={() => removeSupply(s.inventoryItemId)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error-400)', fontSize: '16px', padding: '4px',
                        }}>×</button>
                      )}
                    </div>
                  ))}
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right', paddingTop: '4px' }}>
                    Total insumos: ${supplies.reduce((sum, s) => sum + s.quantity * s.unitCost, 0).toLocaleString('es-CL')}
                  </div>
                </div>
              )}

              {/* Buscador de insumos */}
              {addingSupply && (
                <div style={{ marginTop: '10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      className="form-input"
                      placeholder="Buscar insumo..."
                      value={supplySearch}
                      onChange={e => setSupplySearch(e.target.value)}
                      autoFocus
                      style={{ flex: 1, fontSize: '14px' }}
                    />
                    <input
                      type="number"
                      className="form-input"
                      value={supplyQty}
                      onChange={e => setSupplyQty(Math.max(1, Number(e.target.value)))}
                      style={{ width: '70px', fontSize: '14px' }}
                      min={1}
                    />
                    <button onClick={() => setAddingSupply(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px' }}>✕</button>
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {filteredInventory.slice(0, 20).map(item => (
                      <button key={item.id} onClick={() => addSupply(item)} style={{
                        display: 'flex', justifyContent: 'space-between', padding: '8px 10px',
                        background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left', width: '100%',
                      }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Stock: {item.currentStock} · ${item.unitCost.toLocaleString('es-CL')}
                        </span>
                      </button>
                    ))}
                    {filteredInventory.length === 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px' }}>Sin resultados</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {ot.status === 'in_progress' && (
          <div style={{ padding: '16px', borderTop: '1px solid var(--bg-border)', display: 'flex', gap: '10px', background: 'var(--bg-card)', position: 'sticky', bottom: 0 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleSaveDraft} disabled={saving}>
              {saving ? '⏳...' : '💾 Guardar avance'}
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleComplete} disabled={saving || !allRequiredDone}>
              {saving ? '⏳...' : '✅ Completar OT'}
            </button>
          </div>
        )}
      </div>
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

  // Protección: si no hay sesión de técnico, redirigir al login
  useEffect(() => {
    if (!session || session.role !== 'tech') {
      router.replace('/login');
    }
  }, [session, router]);

  const loadOTs = useCallback(async () => {
    if (!session?.userId) return;
    setLoading(true);
    try {
      const all = await repositories.maintenance.getByTechnicianId(session.userId);
      // Filtrar solo las de hoy
      const todayStr = dateToInputValue(today);
      const todayOTs = all.filter(ot => {
        const d = ot.scheduledDate instanceof Date ? ot.scheduledDate : new Date(ot.scheduledDate);
        return dateToInputValue(d) === todayStr;
      });
      // Orden: in_progress primero, luego pending, luego completed
      todayOTs.sort((a, b) => {
        const order = { in_progress: 0, pending: 1, completed: 2, cancelled: 3 };
        return order[a.status] - order[b.status];
      });
      setOts(todayOTs);
    } finally {
      setLoading(false);
    }
  }, [session?.userId, today]);

  useEffect(() => { loadOTs(); }, [loadOTs]);
  useEffect(() => { repositories.inventory.getAll().then(setInventory); }, []);

  const handleOTUpdated = (updated: MaintenanceRecord) => {
    setOts(prev => prev.map(o => o.id === updated.id ? updated : o));
    if (selectedOT?.id === updated.id) setSelectedOT(updated);
  };

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  const pendingCount = ots.filter(o => o.status === 'pending').length;
  const doneCount = ots.filter(o => o.status === 'completed').length;
  const inProgressOT = ots.find(o => o.status === 'in_progress');

  if (!session || session.role !== 'tech') return null;

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      maxWidth: '480px', margin: '0 auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-card)', borderBottom: '1px solid var(--bg-border)',
        padding: '16px', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>PORTAL TÉCNICO</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>👋 {session.userName}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {today.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <button onClick={handleLogout} style={{
            background: 'none', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)',
            padding: '6px 12px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)',
          }}>
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
                Checklist: {inProgressOT.checklist.filter(c => !!c.completedAt).length}/{inProgressOT.checklist.length}
              </span>
              <span style={{ color: 'var(--brand-400)', fontWeight: 600 }}>Ver detalles →</span>
            </div>
          </div>
        </div>
      )}

      {/* Lista de OTs */}
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
              if (ot.status === 'in_progress') return null; // Ya se muestra arriba
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

      {/* OT Modal */}
      {selectedOT && (
        <OTModal
          ot={selectedOT}
          inventory={inventory}
          onClose={() => setSelectedOT(null)}
          onUpdated={handleOTUpdated}
        />
      )}
    </div>
  );
}
