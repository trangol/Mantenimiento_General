'use client';

/**
 * BillingChargePage — Paso 4 del flujo de cobros
 *
 * Muestra las facturas en estado 'draft' o 'pending', permite:
 * - Revisar el detalle completo con los servicios incluidos
 * - Enviar informe por correo y/o WhatsApp
 * - Generar link público para el portal del cliente
 * - Registrar pagos manuales
 * - Pasar la factura de draft → pending (emitida)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, SectionHeader, Badge, StatCard, EmptyState } from '@/presentation/components/ui';
import { Invoice, InvoiceStatus, PaymentMethod } from '@/core/domain/Invoice';
import { MaintenanceRecord } from '@/core/domain/MaintenanceRecord';
import { repositories } from '@/infrastructure/firebase/RepositoryFactory';
import { RegisterPaymentUseCase } from '@/use-cases/finances/RegisterPaymentUseCase';
import { IVA_RATE } from '@/use-cases/finances/CreateInvoiceUseCase';

const registerPaymentUC = new RegisterPaymentUseCase(repositories.invoices);

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtCLP = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const fmtDate = (d?: Date | null) => d ? d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fmtDatetime = (d?: Date | null) => d ? d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'cyan';
const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Borrador', pending: 'Emitido', partial: 'Pago parcial', paid: 'Pagado', overdue: 'Vencido', cancelled: 'Anulado',
};
const STATUS_COLORS: Record<InvoiceStatus, BadgeColor> = {
  draft: 'gray', pending: 'yellow', partial: 'blue', paid: 'green', overdue: 'red', cancelled: 'gray',
};
const METHOD_LABELS: Record<PaymentMethod, string> = {
  transfer: 'Transferencia', cash: 'Efectivo', card: 'Tarjeta', cheque: 'Cheque',
};

function effectiveStatus(inv: Invoice): InvoiceStatus {
  if ((inv.status === 'pending' || inv.status === 'partial') && inv.dueDate < new Date()) return 'overdue';
  return inv.status;
}

// ── InvoiceDetailModal ────────────────────────────────────────────────────────
function InvoiceDetailModal({ invoice, records, onClose, onStatusChange, onPaid }: {
  invoice: Invoice;
  records: MaintenanceRecord[];
  onClose: () => void;
  onStatusChange: (inv: Invoice) => void;
  onPaid: (inv: Invoice) => void;
}) {
  const [paymentAmount, setPaymentAmount] = useState(invoice.pendingAmount);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [err, setErr] = useState('');
  const [emailSent, setEmailSent] = useState(invoice.sentByEmail ?? false);

  // Generar token público para link si no existe
  const publicToken = invoice.publicToken ?? invoice.id.slice(-8).toUpperCase();
  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/invoice/${publicToken}`;
  const waMessage = encodeURIComponent(`Estimado/a ${invoice.clientName}, adjuntamos su cobro ${invoice.invoiceNumber} por ${fmtCLP(invoice.total)} con vencimiento ${fmtDate(invoice.dueDate)}. Puede revisarlo aquí: ${publicUrl}`);
  const waLink = `https://wa.me/?text=${waMessage}`;

  // Emitir (draft → pending)
  const emitInvoice = async () => {
    setEmitting(true); setErr('');
    try {
      const updated = await repositories.invoices.update(invoice.id, {
        status: 'pending',
        publicToken,
        updatedAt: new Date(),
      });
      onStatusChange(updated);
    } catch (e: unknown) { setErr((e as Error).message); }
    finally { setEmitting(false); }
  };

  // Simular envío por email (placeholder — integración real requiere backend)
  const sendEmail = async () => {
    setSendingEmail(true); setErr('');
    try {
      // En la versión actual sin backend de envío: se marca como enviado y se registra la fecha
      await repositories.invoices.update(invoice.id, {
        sentByEmail: true,
        sentEmailAt: new Date(),
        sentAt: new Date(),
      });
      setEmailSent(true);
      onStatusChange({ ...invoice, sentByEmail: true, sentEmailAt: new Date(), sentAt: new Date() });
    } catch (e: unknown) { setErr((e as Error).message); }
    finally { setSendingEmail(false); }
  };

  // Registrar pago
  const registerPayment = async () => {
    setSavingPayment(true); setErr('');
    try {
      await registerPaymentUC.execute({
        invoiceId: invoice.id,
        amount: paymentAmount,
        method: paymentMethod,
        reference: paymentRef || undefined,
        registeredBy: 'admin',
      });
      const updated = await repositories.invoices.getById(invoice.id);
      if (updated) onPaid(updated);
      onClose();
    } catch (e: unknown) { setErr((e as Error).message); }
    finally { setSavingPayment(false); }
  };

  const canPay = invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.pendingAmount > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: '680px', marginTop: '16px', boxShadow: 'var(--shadow-xl)' }}>
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 700, color: 'var(--brand-400)' }}>{invoice.invoiceNumber}</span>
              <Badge color={STATUS_COLORS[effectiveStatus(invoice)]}>{STATUS_LABELS[effectiveStatus(invoice)]}</Badge>
            </div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>{invoice.clientName}</div>
            <div className="text-xs text-secondary">Emitido: {fmtDate(invoice.createdAt)} · Vencimiento: {fmtDate(invoice.dueDate)}</div>
            {invoice.periodStart && invoice.periodEnd && (
              <div className="text-xs text-secondary">Período: {fmtDate(invoice.periodStart)} – {fmtDate(invoice.periodEnd)}</div>
            )}
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>

        {err && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px', fontSize: '13px', color: 'var(--error-400)', marginBottom: '14px' }}>⚠️ {err}</div>}

        {/* Servicios incluidos */}
        <SectionHeader title={`Servicios incluidos (${records.length})`} />
        <div style={{ border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', maxHeight: '220px', overflowY: 'auto' }}>
          {records.length === 0 ? (
            <div style={{ padding: '14px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>Sin detalles de servicios disponibles</div>
          ) : records.map((r, i) => (
            <div key={r.id} style={{ padding: '10px 12px', borderBottom: i < records.length - 1 ? '1px solid var(--bg-border)' : 'none', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.assetName ?? 'Servicio'}</div>
                <div className="text-xs text-secondary">{fmtDatetime(r.completedAt ?? r.scheduledDate)} · {r.technicianName}</div>
                {r.observations && <div className="text-xs text-muted" style={{ fontStyle: 'italic' }}>{r.observations.slice(0, 80)}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{fmtCLP(r.totalCost ?? 0)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: '20px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-secondary">Subtotal neto</span><span>{fmtCLP(invoice.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-secondary">IVA (19%)</span><span>{fmtCLP(invoice.taxAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-secondary">Total</span><span style={{ fontWeight: 700 }}>{fmtCLP(invoice.total)}</span>
          </div>
          {invoice.paidAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--success-500)' }}>
              <span>Pagado</span><span>-{fmtCLP(invoice.paidAmount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px', borderTop: '1px solid var(--bg-border)', paddingTop: '6px', color: invoice.pendingAmount > 0 ? 'var(--error-400)' : 'var(--success-500)' }}>
            <span>Saldo pendiente</span><span>{fmtCLP(invoice.pendingAmount)}</span>
          </div>
        </div>

        {/* Acciones de envío */}
        <SectionHeader title="Envío y cobro" />
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', marginTop: '12px' }}>

          {/* Emitir (solo desde draft) */}
          {invoice.status === 'draft' && (
            <button className="btn btn-primary btn-sm" onClick={emitInvoice} disabled={emitting}>
              {emitting ? '⏳...' : '📤 Emitir cobro'}
            </button>
          )}

          {/* Enviar por email */}
          <button className="btn btn-secondary btn-sm" onClick={sendEmail} disabled={sendingEmail} style={{ position: 'relative' }}>
            {sendingEmail ? '⏳...' : emailSent ? '✅ Email enviado' : '📧 Enviar por email'}
          </button>
          {invoice.sentEmailAt && <div className="text-xs text-muted" style={{ alignSelf: 'center' }}>Enviado: {fmtDatetime(invoice.sentEmailAt)}</div>}

          {/* Link público */}
          <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(publicUrl).then(() => alert('Link copiado'))}>
            🔗 Copiar link
          </button>

          {/* WhatsApp */}
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            💬 WhatsApp
          </a>
        </div>

        {/* Link visible */}
        <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span>🔗 Link del cliente:</span>
          <code style={{ flex: 1, color: 'var(--brand-300)', wordBreak: 'break-all' }}>{publicUrl}</code>
        </div>

        {/* Historial de pagos */}
        {invoice.payments.length > 0 && (
          <>
            <SectionHeader title={`Historial de pagos (${invoice.payments.length})`} />
            <div style={{ marginBottom: '16px' }}>
              {invoice.payments.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--bg-border)', gap: '10px', fontSize: '13px' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{METHOD_LABELS[p.method]}{p.reference ? ` · ${p.reference}` : ''}</div>
                    <div className="text-xs text-muted">{fmtDate(p.paidAt)}</div>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--success-500)' }}>+{fmtCLP(p.amount)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Registrar pago */}
        {canPay && (
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '14px', marginTop: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>Registrar pago</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <div style={{ flex: '1 1 120px' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Monto</label>
                <input className="form-input" type="number" min={1} max={invoice.pendingAmount} value={paymentAmount || ''}
                  onChange={e => setPaymentAmount(Number(e.target.value))} style={{ fontSize: '13px', height: '36px' }} />
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Método</label>
                <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} style={{ fontSize: '13px', height: '36px' }}>
                  {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Referencia</label>
                <input className="form-input" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="N° transferencia..." style={{ fontSize: '13px', height: '36px' }} />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" disabled={savingPayment || paymentAmount <= 0 || paymentAmount > invoice.pendingAmount} onClick={registerPayment}>
              {savingPayment ? 'Registrando...' : `💵 Registrar pago de ${fmtCLP(paymentAmount || 0)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function BillingChargePage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('invoiceId');

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'active'>('active');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<MaintenanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await repositories.invoices.getAll();
      setInvoices(all);
      // Si venimos desde preparación con un invoiceId, abrir directamente
      if (highlightId) {
        const inv = all.find(i => i.id === highlightId);
        if (inv) setSelected(inv);
      }
    } finally { setLoading(false); }
  }, [highlightId]);

  useEffect(() => { load(); }, [load]);

  // Cargar registros de mantenimiento cuando se selecciona una factura
  useEffect(() => {
    if (!selected) { setSelectedRecords([]); return; }
    setLoadingRecords(true);
    Promise.all(selected.maintenanceRecordIds.map(id => repositories.maintenance.getById(id)))
      .then(recs => setSelectedRecords(recs.filter(Boolean) as MaintenanceRecord[]))
      .finally(() => setLoadingRecords(false));
  }, [selected]);

  const filtered = useMemo(() => invoices.filter(inv => {
    const st = effectiveStatus(inv);
    const matchStatus = statusFilter === 'active'
      ? (st === 'draft' || st === 'pending' || st === 'partial' || st === 'overdue')
      : st === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = q === '' || inv.invoiceNumber.toLowerCase().includes(q) || inv.clientName.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }), [invoices, statusFilter, search]);

  const statCounts = useMemo(() => ({
    draft: invoices.filter(i => i.status === 'draft').length,
    pending: invoices.filter(i => effectiveStatus(i) === 'pending').length,
    overdue: invoices.filter(i => effectiveStatus(i) === 'overdue').length,
    paid: invoices.filter(i => i.status === 'paid').length,
  }), [invoices]);

  const handleStatusChange = (inv: Invoice) => {
    setInvoices(prev => prev.map(i => i.id === inv.id ? inv : i));
    setSelected(inv);
  };
  const handlePaid = (inv: Invoice) => {
    setInvoices(prev => prev.map(i => i.id === inv.id ? inv : i));
    setSelected(null);
  };

  const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '12px' };
  const tdStyle: React.CSSProperties = { padding: '10px 12px', whiteSpace: 'nowrap' };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Cobros</h1>
          <p className="page-desc">Facturas emitidas, envío y registro de pagos</p>
        </div>
        <div className="page-header-actions">
          <a href="/billing/prepare" className="btn btn-secondary btn-sm">📋 Preparar cobros</a>
          <a href="/billing/validate" className="btn btn-secondary btn-sm">✅ Validar pagos</a>
          <button className="btn btn-ghost btn-sm" onClick={load}>🔄</button>
        </div>
      </div>

      {/* Pasos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '12px', overflowX: 'auto' }}>
        {[
          { n: 1, label: 'Planificación', href: '/logistics' },
          { n: 2, label: 'Mantenimientos', href: '/maintenance' },
          { n: 3, label: 'Preparación', href: '/billing/prepare' },
          { n: 4, label: 'Cobro', href: '/billing/charge', active: true },
          { n: 5, label: 'Validación', href: '/billing/validate' },
        ].map((step, i, arr) => (
          <React.Fragment key={step.n}>
            <a href={step.href} style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', flexShrink: 0 }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, background: step.active ? 'var(--brand-500)' : 'var(--bg-surface)', color: step.active ? 'white' : 'var(--text-muted)', border: step.active ? 'none' : '1px solid var(--bg-border)', flexShrink: 0 }}>{step.n}</div>
              <span style={{ color: step.active ? 'var(--brand-400)' : 'var(--text-muted)', fontWeight: step.active ? 700 : 400 }}>{step.label}</span>
            </a>
            {i < arr.length - 1 && <span style={{ color: 'var(--bg-border)', flexShrink: 0 }}>→</span>}
          </React.Fragment>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid-4 stagger" style={{ marginBottom: '20px' }}>
        <StatCard label="Borradores" value={statCounts.draft} icon="📄" color="gray" />
        <StatCard label="Emitidos" value={statCounts.pending} icon="📤" color="yellow" />
        <StatCard label="Vencidos" value={statCounts.overdue} icon="⚠️" color="red" />
        <StatCard label="Pagados" value={statCounts.paid} icon="✅" color="green" />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {([
          { key: 'active', label: 'Activos' },
          { key: 'draft', label: 'Borradores' },
          { key: 'pending', label: 'Emitidos' },
          { key: 'overdue', label: 'Vencidos' },
          { key: 'paid', label: 'Pagados' },
        ] as { key: InvoiceStatus | 'active'; label: string }[]).map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)} className={`btn btn-sm ${statusFilter === f.key ? 'btn-primary' : 'btn-secondary'}`}>
            {f.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div className="search-input-wrap" style={{ maxWidth: '240px' }}>
          <span className="search-icon">🔍</span>
          <input type="text" className="form-input" placeholder="Buscar número o cliente..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', fontSize: '13px', height: '36px' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>⏳ Cargando cobros...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="💳" title="Sin cobros" description="Ve a Preparar cobros para generar facturas desde los mantenimientos completados."
          action={<a href="/billing/prepare" className="btn btn-primary btn-sm">📋 Preparar cobros</a>} />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-border)', background: 'var(--bg-surface)' }}>
                  {['Número', 'Cliente', 'Período', 'Total', 'Pagado', 'Saldo', 'Estado', 'Email', ''].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const st = effectiveStatus(inv);
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--bg-border)', background: inv.id === highlightId ? 'rgba(59,130,246,0.04)' : 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                      onMouseLeave={e => (e.currentTarget.style.background = inv.id === highlightId ? 'rgba(59,130,246,0.04)' : 'transparent')}>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px', color: 'var(--brand-400)' }}>{inv.invoiceNumber}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{inv.clientName}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {inv.periodStart ? `${fmtDate(inv.periodStart)} – ${fmtDate(inv.periodEnd)}` : fmtDate(inv.createdAt)}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{fmtCLP(inv.total)}</td>
                      <td style={{ ...tdStyle, color: 'var(--success-500)' }}>{fmtCLP(inv.paidAmount)}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: inv.pendingAmount > 0 ? 'var(--error-400)' : 'var(--text-muted)' }}>{fmtCLP(inv.pendingAmount)}</td>
                      <td style={tdStyle}><Badge color={STATUS_COLORS[st]}>{STATUS_LABELS[st]}</Badge></td>
                      <td style={tdStyle}>
                        {inv.sentByEmail
                          ? <span className="text-xs" style={{ color: 'var(--success-500)' }}>✅ {fmtDate(inv.sentEmailAt)}</span>
                          : <span className="text-xs text-muted">No enviado</span>}
                      </td>
                      <td style={tdStyle}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(inv)} style={{ fontSize: '12px' }}>
                          Ver / Cobrar →
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

      {selected && (
        <InvoiceDetailModal
          invoice={selected}
          records={loadingRecords ? [] : selectedRecords}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onPaid={handlePaid}
        />
      )}
    </div>
  );
}
