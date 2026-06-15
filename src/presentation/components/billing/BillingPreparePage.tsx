'use client';

/**
 * BillingPreparePage — Paso 3 del flujo de cobros
 *
 * Agrupa los mantenimientos completados y sin facturar de un período,
 * permite ajuste manual (excluir ítems), y genera un borrador de factura
 * que avanza al módulo de Cobro.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, SectionHeader, Badge, StatCard, EmptyState } from '@/presentation/components/ui';
import { MaintenanceRecord } from '@/core/domain/MaintenanceRecord';
import { BillingPeriodType } from '@/core/domain/Invoice';
import { repositories } from '@/infrastructure/firebase/RepositoryFactory';
import { IVA_RATE } from '@/use-cases/finances/CreateInvoiceUseCase';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtCLP = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const fmtDate = (d: Date) => d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDatetime = (d?: Date) => d ? d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

type PeriodOption = { value: BillingPeriodType; label: string; days: number };
const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'daily', label: 'Puntual (día)', days: 1 },
  { value: 'weekly', label: 'Semanal (7 días)', days: 7 },
  { value: 'biweekly', label: 'Quincenal (14 días)', days: 14 },
  { value: 'monthly', label: 'Mensual (30 días)', days: 30 },
  { value: 'bimonthly', label: 'Bimensual (60 días)', days: 60 },
  { value: 'quarterly', label: 'Trimestral (90 días)', days: 90 },
  { value: 'semiannual', label: 'Semestral (180 días)', days: 180 },
  { value: 'annual', label: 'Anual (365 días)', days: 365 },
  { value: 'biannual', label: 'Bianual (730 días)', days: 730 },
];

/** Agrupa registros por clientId */
function groupByClient(records: MaintenanceRecord[]): Map<string, MaintenanceRecord[]> {
  const map = new Map<string, MaintenanceRecord[]>();
  for (const r of records) {
    const list = map.get(r.clientId) ?? [];
    list.push(r);
    map.set(r.clientId, list);
  }
  return map;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function BillingPreparePage() {
  const router = useRouter();

  // ── Selector de período
  const [periodType, setPeriodType] = useState<BillingPeriodType>('monthly');
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999); return d;
  });

  const startDate = useMemo(() => {
    const opt = PERIOD_OPTIONS.find(p => p.value === periodType);
    const days = opt?.days ?? 30;
    const d = new Date(endDate);
    d.setDate(d.getDate() - days + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [periodType, endDate]);

  // ── Datos
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set()); // IDs excluidos manualmente
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set()); // clientes en proceso
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setExcluded(new Set());
    try {
      const data = await repositories.maintenance.getCompletedUnbilledInPeriod(startDate, endDate);
      // Ordenar por fecha
      data.sort((a, b) => {
        const da = a.completedAt ?? a.scheduledDate;
        const db2 = b.completedAt ?? b.scheduledDate;
        return da.getTime() - db2.getTime();
      });
      setRecords(data);
      setSearched(true);
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error al cargar mantenimientos');
    } finally { setLoading(false); }
  }, [startDate, endDate]);

  const grouped = useMemo(() => groupByClient(records), [records]);

  // Registros activos (no excluidos)
  const activeRecords = useMemo(() => records.filter(r => !excluded.has(r.id)), [records, excluded]);
  const activeGrouped = useMemo(() => groupByClient(activeRecords), [activeRecords]);

  const totalSubtotal = useMemo(() => activeRecords.reduce((s, r) => s + (r.totalCost ?? 0), 0), [activeRecords]);
  const totalIVA = Math.round(totalSubtotal * IVA_RATE);
  const totalTotal = totalSubtotal + totalIVA;

  const toggleRecord = (id: string) => {
    setExcluded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Genera factura para un cliente
  const generateInvoice = async (clientId: string) => {
    const clientRecords = (activeGrouped.get(clientId) ?? []).filter(r => !excluded.has(r.id));
    if (clientRecords.length === 0) return;
    setGeneratingIds(prev => new Set(prev).add(clientId));
    setError('');
    try {
      const dueDate = new Date(endDate);
      dueDate.setDate(dueDate.getDate() + 30); // vencimiento 30 días
      const invoice = await repositories.invoices.create({
        invoiceNumber: await repositories.invoices.getNextNumber(),
        clientId,
        clientName: clientRecords[0].clientName ?? clientId,
        maintenanceRecordIds: clientRecords.map(r => r.id),
        status: 'draft',
        dueDate,
        subtotal: clientRecords.reduce((s, r) => s + (r.totalCost ?? 0), 0),
        taxAmount: Math.round(clientRecords.reduce((s, r) => s + (r.totalCost ?? 0), 0) * IVA_RATE),
        total: (() => {
          const sub = clientRecords.reduce((s, r) => s + (r.totalCost ?? 0), 0);
          return sub + Math.round(sub * IVA_RATE);
        })(),
        paidAmount: 0,
        pendingAmount: (() => {
          const sub = clientRecords.reduce((s, r) => s + (r.totalCost ?? 0), 0);
          return sub + Math.round(sub * IVA_RATE);
        })(),
        payments: [],
        periodType,
        periodStart: startDate,
        periodEnd: endDate,
        createdBy: 'admin',
      });
      // Marcar OTs como in_preparation
      await Promise.all(clientRecords.map(r => repositories.maintenance.updateBillingStatus(r.id, 'in_preparation', invoice.id)));
      // Quitar de la vista
      setRecords(prev => prev.filter(r => r.clientId !== clientId));
      // Navegar a cobro
      router.push(`/billing/charge?invoiceId=${invoice.id}`);
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error al generar borrador');
    } finally {
      setGeneratingIds(prev => { const next = new Set(prev); next.delete(clientId); return next; });
    }
  };

  // Genera todas las facturas de todos los clientes con servicios activos
  const generateAll = async () => {
    const clients = [...activeGrouped.keys()];
    if (clients.length === 0) return;
    for (const clientId of clients) {
      await generateInvoice(clientId);
    }
  };

  const endDateStr = endDate.toISOString().slice(0, 10);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Preparación de Cobros</h1>
          <p className="page-desc">Agrupa los servicios del período y genera borradores de factura</p>
        </div>
        <div className="page-header-actions">
          <a href="/billing/charge" className="btn btn-secondary btn-sm">💳 Ver Cobros</a>
          <a href="/billing/validate" className="btn btn-secondary btn-sm">✅ Validar Pagos</a>
        </div>
      </div>

      {/* Indicador de pasos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { n: 1, label: 'Planificación', href: '/logistics' },
          { n: 2, label: 'Mantenimientos', href: '/maintenance' },
          { n: 3, label: 'Preparación', href: '/billing/prepare', active: true },
          { n: 4, label: 'Cobro', href: '/billing/charge' },
          { n: 5, label: 'Validación', href: '/billing/validate' },
        ].map((step, i, arr) => (
          <React.Fragment key={step.n}>
            <a href={step.href} style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', flexShrink: 0 }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, background: step.active ? 'var(--brand-500)' : 'var(--bg-surface)', color: step.active ? 'white' : 'var(--text-muted)', border: step.active ? 'none' : '1px solid var(--bg-border)', flexShrink: 0 }}>
                {step.n}
              </div>
              <span style={{ color: step.active ? 'var(--brand-400)' : 'var(--text-muted)', fontWeight: step.active ? 700 : 400 }}>{step.label}</span>
            </a>
            {i < arr.length - 1 && <span style={{ color: 'var(--bg-border)', flexShrink: 0 }}>→</span>}
          </React.Fragment>
        ))}
      </div>

      {/* Selector de período */}
      <Card style={{ marginBottom: '20px' }}>
        <SectionHeader title="Período a totalizar" subtitle="Selecciona el rango de fechas de los servicios a cobrar" />
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '14px' }}>
          <div>
            <label className="form-label">Tipo de período</label>
            <select className="form-select" style={{ width: 'auto' }} value={periodType} onChange={e => setPeriodType(e.target.value as BillingPeriodType)}>
              {PERIOD_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Hasta (inclusive)</label>
            <input className="form-input" type="date" value={endDateStr}
              onChange={e => { const d = new Date(e.target.value + 'T23:59:59'); setEndDate(d); }} />
          </div>
          <div style={{ paddingBottom: '2px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              📅 Desde <strong>{fmtDate(startDate)}</strong> hasta <strong>{fmtDate(endDate)}</strong>
            </div>
            <button className="btn btn-primary btn-sm" onClick={load} disabled={loading}>
              {loading ? '⏳ Buscando...' : '🔍 Buscar servicios del período'}
            </button>
          </div>
        </div>
      </Card>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--error-400)' }}>⚠️ {error}</div>}

      {/* Resultados */}
      {searched && (
        <>
          {/* KPIs del período */}
          <div className="grid-4 stagger" style={{ marginBottom: '20px' }}>
            <StatCard label="Clientes con cobros" value={activeGrouped.size} icon="🏢" color="blue" />
            <StatCard label="Servicios incluidos" value={activeRecords.length} icon="🔧" color="cyan" />
            <StatCard label="Subtotal neto" value={fmtCLP(totalSubtotal)} icon="💵" color="yellow" />
            <StatCard label="Total con IVA" value={fmtCLP(totalTotal)} icon="💰" color="green" />
          </div>

          {activeGrouped.size === 0 ? (
            <EmptyState
              icon="✅"
              title="No hay servicios pendientes de facturar"
              description={`Todos los servicios completados en el período ${fmtDate(startDate)} – ${fmtDate(endDate)} ya están facturados.`}
              action={<a href="/billing/charge" className="btn btn-primary btn-sm">Ver cobros emitidos →</a>}
            />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {excluded.size > 0 && <span>(<strong>{excluded.size}</strong> servicio{excluded.size !== 1 ? 's' : ''} excluido{excluded.size !== 1 ? 's' : ''} manualmente) </span>}
                  {records.length - activeRecords.length > 0 && excluded.size > 0 && '· '}
                </div>
                <button className="btn btn-primary btn-sm" onClick={generateAll} disabled={generatingIds.size > 0 || activeGrouped.size === 0}>
                  {generatingIds.size > 0 ? '⏳ Generando...' : `📋 Generar ${activeGrouped.size} factura${activeGrouped.size !== 1 ? 's' : ''} borrador`}
                </button>
              </div>

              {/* Grupos por cliente */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[...grouped.entries()].map(([clientId, clientRecords]) => {
                  const active = clientRecords.filter(r => !excluded.has(r.id));
                  const sub = active.reduce((s, r) => s + (r.totalCost ?? 0), 0);
                  const iva = Math.round(sub * IVA_RATE);
                  const total = sub + iva;
                  const isGenerating = generatingIds.has(clientId);
                  const clientName = clientRecords[0]?.clientName ?? clientId;

                  return (
                    <Card key={clientId}>
                      {/* Cabecera del cliente */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px' }}>{clientName}</div>
                          <div className="text-xs text-secondary">{active.length}/{clientRecords.length} servicios incluidos · {fmtDate(startDate)} → {fmtDate(endDate)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Subtotal: {fmtCLP(sub)} · IVA: {fmtCLP(iva)}</div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--brand-400)' }}>{fmtCLP(total)}</div>
                          </div>
                          <button className="btn btn-primary btn-sm" disabled={active.length === 0 || isGenerating}
                            onClick={() => generateInvoice(clientId)}>
                            {isGenerating ? '⏳...' : '📋 Generar cobro'}
                          </button>
                        </div>
                      </div>

                      {/* Lista de servicios */}
                      <div style={{ borderTop: '1px solid var(--bg-border)', paddingTop: '12px' }}>
                        {clientRecords.map(r => {
                          const isExcluded = excluded.has(r.id);
                          return (
                            <div key={r.id} style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '8px 0', borderBottom: '1px solid var(--bg-border)',
                              opacity: isExcluded ? 0.45 : 1,
                            }}>
                              <input type="checkbox" checked={!isExcluded} onChange={() => toggleRecord(r.id)} style={{ width: '15px', height: '15px', flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, textDecoration: isExcluded ? 'line-through' : 'none' }}>
                                  {r.assetName ?? 'Servicio de mantenimiento'}
                                </div>
                                <div className="text-xs text-secondary">
                                  {fmtDatetime(r.completedAt ?? r.scheduledDate)} · {r.technicianName}
                                  {r.checklistCompleted && ' · ✅ Protocolo completo'}
                                </div>
                                {r.observations && <div className="text-xs text-muted" style={{ marginTop: '2px', fontStyle: 'italic' }}>{r.observations.slice(0, 80)}{r.observations.length > 80 ? '...' : ''}</div>}
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '13px' }}>{fmtCLP(r.totalCost ?? 0)}</div>
                                {r.serviceRate ? <div className="text-xs text-muted">Serv: {fmtCLP(r.serviceRate)}</div> : null}
                              </div>
                              {isExcluded && <Badge color="gray">Excluido</Badge>}
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {!searched && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>Selecciona el período y haz clic en Buscar</div>
          <div className="text-sm text-secondary">El sistema buscará todos los servicios completados y sin facturar en ese rango de fechas.</div>
        </div>
      )}
    </div>
  );
}
