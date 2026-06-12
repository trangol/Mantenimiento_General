'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, SectionHeader, Badge, StatCard, EmptyState } from '@/presentation/components/ui';
import { Invoice, InvoiceStatus, PaymentMethod } from '@/core/domain/Invoice';
import { MaintenanceRecord } from '@/core/domain/MaintenanceRecord';
import { Client } from '@/core/domain/Client';
import { repositories } from '@/infrastructure/firebase/RepositoryFactory';
import { CreateInvoiceUseCase, IVA_RATE } from '@/use-cases/finances/CreateInvoiceUseCase';
import { RegisterPaymentUseCase } from '@/use-cases/finances/RegisterPaymentUseCase';
import { GetMonthlyFinancesUseCase, MonthlyFinances } from '@/use-cases/finances/GetMonthlyFinancesUseCase';

// ── use cases (instanciados a nivel de módulo) ────────────────────────────────
const createInvoiceUC = new CreateInvoiceUseCase(repositories.invoices, repositories.maintenance, repositories.clients);
const registerPaymentUC = new RegisterPaymentUseCase(repositories.invoices);
const monthlyFinancesUC = new GetMonthlyFinancesUseCase(repositories.invoices, repositories.maintenance);

// ── helpers / constantes ──────────────────────────────────────────────────────
/** Formato peso chileno: $1.234.567 */
const fmtCLP = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const fmtDate = (d: Date) => d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });

type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'cyan';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: 'Pendiente', partial: 'Pago parcial', paid: 'Pagado', overdue: 'Vencido', cancelled: 'Anulado',
};
const STATUS_COLORS: Record<InvoiceStatus, BadgeColor> = {
  pending: 'yellow', partial: 'blue', paid: 'green', overdue: 'red', cancelled: 'gray',
};
const METHOD_LABELS: Record<PaymentMethod, string> = {
  transfer: 'Transferencia', cash: 'Efectivo', card: 'Tarjeta', cheque: 'Cheque',
};
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** Estado efectivo: pendiente/parcial con vencimiento pasado se muestra como vencido */
function effectiveStatus(inv: Invoice): InvoiceStatus {
  if ((inv.status === 'pending' || inv.status === 'partial') && inv.dueDate < new Date()) return 'overdue';
  return inv.status;
}

const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '10px 14px', whiteSpace: 'nowrap' };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' };
const errBoxStyle: React.CSSProperties = { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px', fontSize: '13px', color: 'var(--error-400)', marginBottom: '14px' };

type Tab = 'summary' | 'invoices';

// ── NewInvoiceModal (nuevo cobro desde OTs completadas) ───────────────────────
function NewInvoiceModal({ clients, onClose, onCreated }: {
  clients: Client[]; onClose: () => void; onCreated: (inv: Invoice) => void;
}) {
  const [clientId, setClientId] = useState('');
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); // vencimiento por defecto: 30 días
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // Al elegir cliente: cargar OTs completadas que aún no han sido facturadas
  useEffect(() => {
    if (!clientId) { setRecords([]); setSelected(new Set()); return; }
    let cancelled = false;
    const load = async () => {
      setLoadingRecords(true); setErr('');
      try {
        const [clientRecords, clientInvoices] = await Promise.all([
          repositories.maintenance.getByClientId(clientId),
          repositories.invoices.getByClient(clientId),
        ]);
        // IDs de OTs ya incluidas en alguna factura no anulada
        const billed = new Set(
          clientInvoices.filter(i => i.status !== 'cancelled').flatMap(i => i.maintenanceRecordIds)
        );
        const available = clientRecords.filter(r => r.status === 'completed' && !billed.has(r.id));
        if (!cancelled) { setRecords(available); setSelected(new Set()); }
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Error al cargar mantenimientos');
      } finally { if (!cancelled) setLoadingRecords(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [clientId]);

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Totales calculados en vivo
  const subtotal = records.filter(r => selected.has(r.id)).reduce((s, r) => s + (r.totalCost ?? 0), 0);
  const iva = Math.round(subtotal * IVA_RATE);
  const total = subtotal + iva;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      const created = await createInvoiceUC.execute({
        clientId,
        maintenanceRecordIds: [...selected],
        dueDate: new Date(`${dueDate}T12:00:00`),
        notes: notes || undefined,
        createdBy: 'admin',
      });
      onCreated(created);
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al crear el cobro');
    } finally { setSaving(false); }
  };

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Nuevo Cobro</h2>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        {err && <div style={errBoxStyle}>{err}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="form-label">Cliente *</label>
            <select className="form-select" value={clientId} onChange={e => setClientId(e.target.value)} required>
              <option value="">Selecciona un cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.businessName}</option>)}
            </select>
          </div>

          {clientId && (
            <div>
              <label className="form-label">Mantenimientos completados sin facturar</label>
              {loadingRecords ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>⏳ Cargando mantenimientos...</div>
              ) : records.length === 0 ? (
                <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '14px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Este cliente no tiene mantenimientos completados pendientes de facturar.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', maxHeight: '220px', overflowY: 'auto' }}>
                  {records.map(r => (
                    <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderBottom: '1px solid var(--bg-border)', cursor: 'pointer', background: selected.has(r.id) ? 'var(--bg-surface)' : 'transparent' }}>
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.assetName ?? 'Servicio de mantenimiento'}</div>
                        <div className="text-xs text-muted">
                          {fmtDate(r.completedAt ?? r.scheduledDate)}{r.technicianName ? ` · ${r.technicianName}` : ''}
                        </div>
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' }}>{fmtCLP(r.totalCost ?? 0)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="form-label">Fecha de vencimiento *</label>
            <input className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
          </div>
          <div>
            <label className="form-label">Notas</label>
            <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones del cobro (opcional)" />
          </div>

          {/* Totales en vivo */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-secondary">Subtotal ({selected.size} servicio{selected.size === 1 ? '' : 's'})</span>
              <span>{fmtCLP(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-secondary">IVA (19%)</span>
              <span>{fmtCLP(iva)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px', borderTop: '1px solid var(--bg-border)', paddingTop: '6px' }}>
              <span>Total</span>
              <span>{fmtCLP(total)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving || selected.size === 0}>
              {saving ? 'Creando...' : `Crear cobro ${total > 0 ? fmtCLP(total) : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PaymentModal (registrar pago + historial) ─────────────────────────────────
function PaymentModal({ invoice, onClose, onPaid }: {
  invoice: Invoice; onClose: () => void; onPaid: (inv: Invoice) => void;
}) {
  const [amount, setAmount] = useState(invoice.pendingAmount);
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const remaining = invoice.pendingAmount - (Number.isFinite(amount) ? amount : 0);
  const canPay = invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.pendingAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      const updated = await registerPaymentUC.execute({
        invoiceId: invoice.id, amount, method,
        reference: reference || undefined, notes: notes || undefined,
        registeredBy: 'admin',
      });
      onPaid(updated);
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al registrar el pago');
    } finally { setSaving(false); }
  };

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Registrar Pago</h2>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Resumen de la factura */}
        <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: '16px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="font-mono" style={{ color: 'var(--brand-400)' }}>{invoice.invoiceNumber}</span>
            <Badge color={STATUS_COLORS[effectiveStatus(invoice)]}>{STATUS_LABELS[effectiveStatus(invoice)]}</Badge>
          </div>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>{invoice.clientName}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-secondary">Total: <strong style={{ color: 'var(--text-primary)' }}>{fmtCLP(invoice.total)}</strong></span>
            <span className="text-secondary">Saldo: <strong style={{ color: invoice.pendingAmount > 0 ? 'var(--error-400)' : 'var(--success-500)' }}>{fmtCLP(invoice.pendingAmount)}</strong></span>
          </div>
        </div>

        {err && <div style={errBoxStyle}>{err}</div>}

        {canPay && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
            <div>
              <label className="form-label">Monto del pago ({fmtCLP(amount || 0)}) *</label>
              <input className="form-input" type="number" min={1} max={invoice.pendingAmount} value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))} required />
              <div className="text-xs text-muted" style={{ marginTop: '4px' }}>
                Saldo restante tras el pago: <strong style={{ color: remaining <= 0 ? 'var(--success-500)' : 'var(--text-primary)' }}>{fmtCLP(Math.max(0, remaining))}</strong>
                {remaining <= 0 && ' · La factura quedará pagada'}
              </div>
            </div>
            <div>
              <label className="form-label">Método de pago *</label>
              <select className="form-select" value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
                {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map(m => (
                  <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Referencia</label>
              <input className="form-input" value={reference} onChange={e => setReference(e.target.value)} placeholder="N° transferencia, cheque..." />
            </div>
            <div>
              <label className="form-label">Notas</label>
              <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones (opcional)" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving || amount <= 0 || amount > invoice.pendingAmount}>
              {saving ? 'Registrando...' : `Registrar pago de ${fmtCLP(amount || 0)}`}
            </button>
          </form>
        )}

        {/* Historial de pagos */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Historial de pagos ({invoice.payments.length})</div>
          {invoice.payments.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '10px 0' }}>Sin pagos registrados.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[...invoice.payments].sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime()).map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--bg-border)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{METHOD_LABELS[p.method]}{p.reference ? ` · ${p.reference}` : ''}</div>
                    <div className="text-xs text-muted">{fmtDate(p.paidAt)}{p.notes ? ` · ${p.notes}` : ''}</div>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--success-500)', whiteSpace: 'nowrap' }}>+{fmtCLP(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SummaryTab (resumen del mes) ──────────────────────────────────────────────
function SummaryTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<MonthlyFinances | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    monthlyFinancesUC.execute(year, month)
      .then(d => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year, month]);

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  return (
    <div>
      {/* Selector de período */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="text-sm text-secondary">Período:</span>
        <select className="form-select" style={{ width: 'auto', fontSize: '13px', height: '36px' }} value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto', fontSize: '13px', height: '36px' }} value={year} onChange={e => setYear(Number(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>Calculando finanzas del mes...
        </div>
      ) : data && (
        <>
          <div className="grid-4 stagger" style={{ marginBottom: '24px' }}>
            <StatCard label="Facturado en el mes" value={fmtCLP(data.totalFacturado)} icon="🧾" color="blue" />
            <StatCard label="Cobrado" value={fmtCLP(data.totalCobrado)} icon="💰" color="green" />
            <StatCard label="Por cobrar" value={fmtCLP(data.totalPendiente)} icon="⏳" color="yellow" />
            <StatCard label="Facturas vencidas" value={data.facturasVencidas} icon="⚠️" color="red" />
          </div>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 16px 0' }}>
              <SectionHeader title={`Rendimiento por técnico — ${MONTH_NAMES[month - 1]} ${year}`} />
            </div>
            {data.porTecnico.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Sin mantenimientos completados en este período.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--bg-border)', background: 'var(--bg-surface)' }}>
                      <th style={thStyle}>Técnico</th>
                      <th style={thStyle}>Servicios realizados</th>
                      <th style={thStyle}>Monto generado</th>
                      <th style={thStyle}>Promedio por servicio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.porTecnico.map(t => (
                      <tr key={t.technicianId} style={{ borderBottom: '1px solid var(--bg-border)' }}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{t.technicianName}</td>
                        <td style={tdStyle}><Badge color="cyan">{t.servicios}</Badge></td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{fmtCLP(t.monto)}</td>
                        <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{fmtCLP(t.servicios > 0 ? t.monto / t.servicios : 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function FinancesPage() {
  const [tab, setTab] = useState<Tab>('summary');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invs, clis] = await Promise.all([
        repositories.invoices.getAll(),
        repositories.clients.getAll(),
      ]);
      setInvoices(invs);
      setClients(clis);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (inv: Invoice) => setInvoices(prev => [inv, ...prev]);
  const handlePaid = (inv: Invoice) => setInvoices(prev => prev.map(i => i.id === inv.id ? inv : i));

  const filtered = useMemo(() => invoices.filter(inv => {
    const st = effectiveStatus(inv);
    const matchStatus = statusFilter === 'all' || st === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = q === '' ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.clientName.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }), [invoices, statusFilter, search]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Finanzas</h1>
          <p className="page-desc">Cobros, pagos y rendimiento financiero del mes</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={load}>🔄 Actualizar</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewInvoice(true)}>+ Nuevo Cobro</button>
        </div>
      </div>

      {/* Placeholder pasarela de pagos */}
      <div style={{ background: 'var(--bg-surface)', border: '1px dashed var(--bg-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>💳</span>
        <span><strong>Pasarela de pagos online (Transbank/Khipu):</strong> próxima fase. Por ahora los pagos se registran manualmente.</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-surface)', padding: '4px', borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
        {([['summary', '📊 Resumen del mes'], ['invoices', `🧾 Cobros (${invoices.length})`]] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '6px 16px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: 600,
            background: tab === t ? 'var(--bg-card)' : 'transparent',
            color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
            boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {/* ── RESUMEN TAB ── */}
      {tab === 'summary' && <SummaryTab />}

      {/* ── COBROS TAB ── */}
      {tab === 'invoices' && (
        <>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-input-wrap" style={{ flex: 1, minWidth: '200px' }}>
              <span className="search-icon">🔍</span>
              <input type="text" className="form-input" placeholder="Buscar por número o cliente..." value={search}
                onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', fontSize: '13px', height: '36px' }} />
            </div>
            <select className="form-select" style={{ width: 'auto', fontSize: '13px', height: '36px' }}
              value={statusFilter} onChange={e => setStatusFilter(e.target.value as InvoiceStatus | 'all')}>
              <option value="all">Todos los estados</option>
              {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>Cargando cobros...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="🧾" title="Sin cobros" description="Crea tu primer cobro a partir de mantenimientos completados."
              action={<button className="btn btn-primary btn-sm" onClick={() => setShowNewInvoice(true)}>+ Nuevo Cobro</button>} />
          ) : (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--bg-border)', background: 'var(--bg-surface)' }}>
                      {['Número', 'Cliente', 'Emisión', 'Vencimiento', 'Total', 'Pagado', 'Saldo', 'Estado', ''].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(inv => {
                      const st = effectiveStatus(inv);
                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--bg-border)', transition: 'background var(--transition-fast)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px', color: 'var(--brand-400)' }}>{inv.invoiceNumber}</td>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{inv.clientName}</td>
                          <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{fmtDate(inv.createdAt)}</td>
                          <td style={{ ...tdStyle, color: st === 'overdue' ? 'var(--error-400)' : 'var(--text-secondary)' }}>{fmtDate(inv.dueDate)}</td>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{fmtCLP(inv.total)}</td>
                          <td style={{ ...tdStyle, color: 'var(--success-500)' }}>{fmtCLP(inv.paidAmount)}</td>
                          <td style={{ ...tdStyle, fontWeight: 600, color: inv.pendingAmount > 0 ? 'var(--error-400)' : 'var(--text-muted)' }}>{fmtCLP(inv.pendingAmount)}</td>
                          <td style={tdStyle}><Badge color={STATUS_COLORS[st]}>{STATUS_LABELS[st]}</Badge></td>
                          <td style={tdStyle}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setPaymentInvoice(inv)}>
                              {st === 'paid' || st === 'cancelled' ? '📋 Detalle' : '💵 Registrar pago'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modales */}
      {showNewInvoice && (
        <NewInvoiceModal clients={clients} onClose={() => setShowNewInvoice(false)} onCreated={handleCreated} />
      )}
      {paymentInvoice && (
        <PaymentModal invoice={paymentInvoice} onClose={() => setPaymentInvoice(null)} onPaid={handlePaid} />
      )}
    </div>
  );
}
