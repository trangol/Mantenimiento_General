'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, SectionHeader, StatusBadge, Badge, EmptyState, StatCard } from '@/presentation/components/ui';
import { FirestoreMaintenanceRecordRepository } from '@/infrastructure/firebase/repositories/FirestoreMaintenanceRecordRepository';
import { MaintenanceRecord, MaintenanceStatus, BillingStatus, ChecklistItem } from '@/core/domain/MaintenanceRecord';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/infrastructure/firebase/firebaseConfig';
import { tenantWhere } from '@/infrastructure/firebase/tenantScope';

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';

const repo = new FirestoreMaintenanceRecordRepository();

/** Formato peso chileno */
const fmtCLP = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const fmtTime = (d?: Date) => d instanceof Date ? d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDate = (d?: Date | string) => {
  if (!d) return '—';
  if (typeof d === 'string') return d;
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** Duración en minutos entre dos fechas */
function durationMin(start?: Date, end?: Date): string {
  if (!(start instanceof Date) || !(end instanceof Date)) return '—';
  const diff = Math.round((end.getTime() - start.getTime()) / 60000);
  if (diff < 60) return `${diff}min`;
  return `${Math.floor(diff / 60)}h ${diff % 60}min`;
}

const BILLING_STATUS_LABEL: Record<BillingStatus, string> = {
  unbilled: 'Sin facturar',
  in_preparation: 'En preparación',
  billed: 'Facturado',
  paid: 'Pagado',
};
const BILLING_STATUS_COLOR: Record<BillingStatus, 'gray' | 'yellow' | 'blue' | 'green'> = {
  unbilled: 'gray',
  in_preparation: 'yellow',
  billed: 'blue',
  paid: 'green',
};

// ── ChecklistModal ─────────────────────────────────────────────────────────────
function ChecklistModal({ ot, onClose, onSave }: {
  ot: MaintenanceRecord;
  onClose: () => void;
  onSave: (updated: MaintenanceRecord) => void;
}) {
  const [items, setItems] = useState<ChecklistItem[]>(
    ot.checklist?.length > 0 ? ot.checklist : getDefaultChecklist()
  );
  const [saving, setSaving] = useState(false);
  const [serviceRate, setServiceRate] = useState(ot.serviceRate ?? 0);

  function getDefaultChecklist(): ChecklistItem[] {
    return [
      { id: 'c1', label: 'Verificar nivel de agua', required: true },
      { id: 'c2', label: 'Medir pH y cloro', required: true },
      { id: 'c3', label: 'Limpiar filtros y canastillas', required: true },
      { id: 'c4', label: 'Revisar bomba y motor', required: true },
      { id: 'c5', label: 'Limpiar paredes y fondo', required: false },
      { id: 'c6', label: 'Registrar lectura de contador de horas', required: false },
      { id: 'c7', label: 'Fotografías finales tomadas', required: true },
    ];
  }

  const toggle = (id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, completedAt: item.completedAt ? undefined : new Date(), completedBy: 'técnico' }
        : item
    ));
  };

  const allRequired = items.filter(i => i.required).every(i => !!i.completedAt);

  const handleSave = async () => {
    setSaving(true);
    try {
      const checklistCompleted = allRequired;
      const totalCost = (ot.suppliesUsed?.reduce((s, u) => s + u.quantity * u.unitCost, 0) ?? 0) + (serviceRate ?? 0);
      await repo.update(ot.id, {
        checklist: items,
        checklistCompleted,
        serviceRate: serviceRate || undefined,
        totalCost,
      });
      onSave({ ...ot, checklist: items, checklistCompleted, serviceRate, totalCost });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Protocolo de servicio</h2>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {ot.clientName} · {ot.assetName}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
          {items.map(item => (
            <label key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: 'var(--radius-sm)',
              background: item.completedAt ? 'rgba(34,197,94,0.07)' : 'var(--bg-surface)',
              border: `1px solid ${item.completedAt ? 'rgba(34,197,94,0.3)' : 'var(--bg-border)'}`,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={!!item.completedAt}
                onChange={() => toggle(item.id)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ flex: 1, fontSize: '13px', textDecoration: item.completedAt ? 'line-through' : 'none', color: item.completedAt ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                {item.label}
              </span>
              {item.required && <span style={{ fontSize: '10px', color: 'var(--error-400)', fontWeight: 600 }}>REQ</span>}
              {item.completedAt && <span style={{ fontSize: '10px', color: 'var(--success-500)' }}>✓ {fmtTime(item.completedAt)}</span>}
            </label>
          ))}
        </div>

        {/* Tarifa manual del servicio */}
        <div style={{ marginBottom: '16px' }}>
          <label className="form-label">Tarifa del servicio (adicional a insumos)</label>
          <input
            className="form-input"
            type="number"
            min={0}
            step={1000}
            value={serviceRate || ''}
            onChange={e => setServiceRate(Number(e.target.value))}
            placeholder="Ej: 15000"
          />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Costo insumos: {fmtCLP(ot.suppliesUsed?.reduce((s, u) => s + u.quantity * u.unitCost, 0) ?? 0)}
            &nbsp;· Total: {fmtCLP((ot.suppliesUsed?.reduce((s, u) => s + u.quantity * u.unitCost, 0) ?? 0) + (serviceRate ?? 0))}
          </div>
        </div>

        {!allRequired && (
          <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            ⚠️ Faltan {items.filter(i => i.required && !i.completedAt).length} paso(s) obligatorio(s) por completar.
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={saving} onClick={handleSave}>
            {saving ? 'Guardando...' : 'Guardar protocolo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ServiceRateModal ───────────────────────────────────────────────────────────
function ServiceRateModal({ ot, onClose, onSave }: {
  ot: MaintenanceRecord;
  onClose: () => void;
  onSave: (rate: number) => void;
}) {
  const [rate, setRate] = useState(ot.serviceRate ?? 0);
  const [saving, setSaving] = useState(false);
  const suppliesCost = ot.suppliesUsed?.reduce((s, u) => s + u.quantity * u.unitCost, 0) ?? 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const totalCost = suppliesCost + (rate ?? 0);
      await repo.update(ot.id, { serviceRate: rate || undefined, totalCost });
      onSave(rate);
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', width: '100%', maxWidth: '380px', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Tarifa del servicio</h2>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{ marginBottom: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          {ot.clientName} · {ot.assetName}
        </div>
        <label className="form-label">Tarifa del servicio (CLP)</label>
        <input className="form-input" type="number" min={0} step={1000} value={rate || ''} onChange={e => setRate(Number(e.target.value))} placeholder="Ej: 20000" style={{ marginBottom: '8px' }} />
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Costo insumos: {fmtCLP(suppliesCost)} · Total: <strong>{fmtCLP(suppliesCost + rate)}</strong>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={saving} onClick={handleSave}>
            {saving ? '...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function MaintenancePage() {
  const [ots, setOts] = useState<MaintenanceRecord[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [billingFilter, setBillingFilter] = useState<BillingStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checklistOt, setChecklistOt] = useState<MaintenanceRecord | null>(null);
  const [rateOt, setRateOt] = useState<MaintenanceRecord | null>(null);

  useEffect(() => {
    try {
      const q = query(collection(db, 'maintenance_records'), tenantWhere());
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const records = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            scheduledDate: data.scheduledDate?.toDate() ?? new Date(),
            startedAt: data.startedAt?.toDate(),
            completedAt: data.completedAt?.toDate(),
            createdAt: data.createdAt?.toDate() ?? new Date(),
            updatedAt: data.updatedAt?.toDate() ?? new Date(),
            checklist: (data.checklist ?? []).map((c: ChecklistItem & { completedAt?: { toDate?: () => Date } }) => ({
              ...c,
              completedAt: c.completedAt?.toDate ? c.completedAt.toDate() : c.completedAt,
            })),
            billingStatus: data.billingStatus ?? 'unbilled',
            checklistCompleted: data.checklistCompleted ?? false,
          } as MaintenanceRecord;
        });
        setOts(records);
        setLoading(false);
      }, (err) => {
        console.error(err);
        setError('Error al conectar con Firestore. Verifica tu .env.local');
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (err) {
      setError('Falta configuración de Firebase');
      setLoading(false);
    }
  }, []);

  const injectTestOT = async () => {
    try {
      setError(null);
      const randomNum = Math.floor(Math.random() * 10000);
      const newOT: MaintenanceRecord = {
        id: `OT-${randomNum}`,
        assetId: 'ASSET-123',
        assetName: 'Piscina de Prueba',
        clientId: 'CLI-123',
        clientName: 'Cliente Demo',
        technicianId: 'TECH-1',
        technicianName: 'Técnico de Turno',
        status: 'pending',
        scheduledDate: new Date(),
        initialPhotos: [],
        finalPhotos: [],
        observations: 'Prueba desde la UI',
        suppliesUsed: [],
        totalCost: 0,
        checklist: [],
        checklistCompleted: false,
        billingStatus: 'unbilled',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await repo.create(newOT);
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al escribir en Firestore');
    }
  };

  const advanceStatus = async (ot: MaintenanceRecord) => {
    try {
      const nextMap: Record<string, MaintenanceStatus> = {
        pending: 'in_progress',
        in_progress: 'completed',
        completed: 'pending',
      };
      const nextStatus = (nextMap[ot.status] || 'pending') as MaintenanceStatus;
      await repo.updateStatus(ot.id, nextStatus);
      if (nextStatus === 'completed') {
        await repo.update(ot.id, { completedAt: new Date() });
      } else if (nextStatus === 'in_progress') {
        await repo.update(ot.id, { startedAt: new Date(), completedAt: undefined as Date | undefined });
      }
    } catch (err) { console.error(err); }
  };

  const handleChecklistSave = (updated: MaintenanceRecord) => {
    setOts(prev => prev.map(o => o.id === updated.id ? updated : o));
    setChecklistOt(null);
  };

  const handleRateSave = (ot: MaintenanceRecord, rate: number) => {
    const suppliesCost = ot.suppliesUsed?.reduce((s, u) => s + u.quantity * u.unitCost, 0) ?? 0;
    setOts(prev => prev.map(o => o.id === ot.id ? { ...o, serviceRate: rate, totalCost: suppliesCost + rate } : o));
    setRateOt(null);
  };

  const filtered = ots.filter((ot) => {
    const matchStatus = filter === 'all' || ot.status === filter;
    const matchBilling = billingFilter === 'all' || ot.billingStatus === billingFilter;
    const matchSearch =
      search === '' ||
      (ot.clientName || '').toLowerCase().includes(search.toLowerCase()) ||
      ot.id.toLowerCase().includes(search.toLowerCase()) ||
      (ot.technicianName || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchBilling && matchSearch;
  });

  const counts = {
    all: ots.length,
    pending: ots.filter(o => o.status === 'pending').length,
    in_progress: ots.filter(o => o.status === 'in_progress').length,
    completed: ots.filter(o => o.status === 'completed').length,
  };

  const totalPendingBilling = ots.filter(o => o.status === 'completed' && o.billingStatus === 'unbilled').reduce((s, o) => s + (o.totalCost ?? 0), 0);

  return (
    <div className="animate-fade-in">
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error-400)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '14px', fontWeight: 500, border: '1px solid rgba(239,68,68,0.2)' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Mantenimientos</h1>
          <p className="page-desc">Órdenes de trabajo · Protocolos · Registro en tiempo real</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={injectTestOT}>⚡ Crear OT Prueba</button>
          <button className="btn btn-primary btn-sm">+ Nueva OT</button>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid-4 stagger" style={{ marginBottom: '20px' }}>
        <StatCard label="Total OTs" value={ots.length} icon="🔧" color="blue" />
        <StatCard label="En ejecución" value={counts.in_progress} icon="⚙️" color="yellow" />
        <StatCard label="Completadas hoy" value={ots.filter(o => o.status === 'completed' && fmtDate(o.completedAt) === fmtDate(new Date())).length} icon="✅" color="green" />
        <StatCard label="Por facturar" value={fmtCLP(totalPendingBilling)} icon="💰" color="cyan" />
      </div>

      {/* Filtros de estado */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {([
          { key: 'all', label: 'Todas' },
          { key: 'pending', label: 'Pendientes' },
          { key: 'in_progress', label: 'En Progreso' },
          { key: 'completed', label: 'Completadas' },
        ] as { key: StatusFilter; label: string }[]).map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}>
            {f.label}
            <span style={{ background: filter === f.key ? 'rgba(255,255,255,0.25)' : 'var(--bg-border)', borderRadius: '100px', padding: '0 7px', fontSize: '11px', fontWeight: '600' }}>
              {counts[f.key]}
            </span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {/* Filtro cobro */}
        <select className="form-select" style={{ width: 'auto', fontSize: '12px', height: '36px' }} value={billingFilter} onChange={e => setBillingFilter(e.target.value as BillingStatus | 'all')}>
          <option value="all">Todos los estados de cobro</option>
          {(Object.keys(BILLING_STATUS_LABEL) as BillingStatus[]).map(s => (
            <option key={s} value={s}>{BILLING_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <div className="search-input-wrap" style={{ flexGrow: 1, maxWidth: '260px' }}>
          <span className="search-icon">🔍</span>
          <input type="text" className="form-input" placeholder="Buscar cliente, OT, técnico..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '34px', fontSize: '13px', height: '36px' }} />
        </div>
      </div>

      {/* Tabla */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando datos...</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="🔧" title="Sin registros" description="No hay OTs con los filtros seleccionados." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-border)', background: 'var(--bg-surface)' }}>
                  {['OT', 'Cliente / Activo', 'Técnico', 'Fecha', 'Tiempo', 'Tarifa', 'Protocolo', 'Estado', 'Cobro', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '12px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ot) => {
                  const checklist = ot.checklist ?? [];
                  const done = checklist.filter(c => c.completedAt).length;
                  const total = checklist.length;
                  const required = checklist.filter(c => c.required).length;
                  const requiredDone = checklist.filter(c => c.required && c.completedAt).length;
                  return (
                    <tr key={ot.id} style={{ borderBottom: '1px solid var(--bg-border)' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--brand-400)', whiteSpace: 'nowrap' }}>{ot.id}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{ot.clientName || ot.clientId}</div>
                        <div className="text-xs text-secondary">{ot.assetName || ot.assetId}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className="avatar avatar-sm">{(ot.technicianName || 'T')[0]}</div>
                          <span>{ot.technicianName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        <div>{fmtDate(ot.scheduledDate)}</div>
                        {ot.startedAt && <div className="text-xs text-muted">Inicio: {fmtTime(ot.startedAt)}</div>}
                        {ot.completedAt && <div className="text-xs text-muted">Fin: {fmtTime(ot.completedAt)}</div>}
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {ot.startedAt && ot.completedAt
                          ? <Badge color="cyan">{durationMin(ot.startedAt, ot.completedAt)}</Badge>
                          : ot.startedAt ? <Badge color="yellow">En curso...</Badge>
                          : <span className="text-muted text-xs">—</span>}
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700 }}>{fmtCLP(ot.totalCost ?? 0)}</div>
                        {ot.serviceRate ? <div className="text-xs text-muted">Servicio: {fmtCLP(ot.serviceRate)}</div> : null}
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: '10px', padding: '2px 6px', marginTop: '2px' }} onClick={() => setRateOt(ot)}>
                          ✏️ Tarifa
                        </button>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {total === 0 ? (
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }} onClick={() => setChecklistOt(ot)}>
                            📋 Iniciar
                          </button>
                        ) : (
                          <div>
                            <div style={{ fontSize: '11px', marginBottom: '3px', color: requiredDone < required ? 'var(--error-400)' : 'var(--success-500)' }}>
                              {done}/{total} pasos · {requiredDone}/{required} req.
                            </div>
                            <div style={{ height: '4px', background: 'var(--bg-border)', borderRadius: '100px', width: '80px', marginBottom: '4px' }}>
                              <div style={{ height: '100%', width: `${total > 0 ? (done / total) * 100 : 0}%`, background: ot.checklistCompleted ? 'var(--success-500)' : 'var(--brand-500)', borderRadius: '100px' }} />
                            </div>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => setChecklistOt(ot)}>
                              {ot.checklistCompleted ? '✅ Ver' : '📋 Continuar'}
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}><StatusBadge status={ot.status} /></td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge color={BILLING_STATUS_COLOR[ot.billingStatus ?? 'unbilled']}>
                          {BILLING_STATUS_LABEL[ot.billingStatus ?? 'unbilled']}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={() => advanceStatus(ot)} className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }}>
                          Avanzar →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modales */}
      {checklistOt && (
        <ChecklistModal ot={checklistOt} onClose={() => setChecklistOt(null)} onSave={handleChecklistSave} />
      )}
      {rateOt && (
        <ServiceRateModal ot={rateOt} onClose={() => setRateOt(null)} onSave={(rate) => handleRateSave(rateOt, rate)} />
      )}
    </div>
  );
}
