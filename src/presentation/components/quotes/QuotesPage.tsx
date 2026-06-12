'use client';

/**
 * QuotesPage — Módulo de Cotizaciones conectado a Firestore
 * Patrón: carga real vía repositories, use cases a nivel de módulo,
 * loading state, filtros, modales y diseño mobile-first.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Badge, EmptyState, StatCard } from '@/presentation/components/ui';
import { Quote, QuoteStatus } from '@/core/domain/Quote';
import { Client } from '@/core/domain/Client';
import { InventoryItem } from '@/core/domain/InventoryItem';
import { repositories } from '@/infrastructure/firebase/RepositoryFactory';
import { CreateQuoteUseCase, CreateQuoteItemInput } from '@/use-cases/quotes/CreateQuoteUseCase';
import { UpdateQuoteStatusUseCase } from '@/use-cases/quotes/UpdateQuoteStatusUseCase';
import { DeleteQuoteUseCase } from '@/use-cases/quotes/DeleteQuoteUseCase';

// ── Use cases (instanciados una sola vez a nivel de módulo) ──────────────────
const createQuoteUC = new CreateQuoteUseCase(repositories.quotes);
const updateStatusUC = new UpdateQuoteStatusUseCase(repositories.quotes, repositories.inventory);
const deleteQuoteUC = new DeleteQuoteUseCase(repositories.quotes);

// ── Constantes ────────────────────────────────────────────────────────────────
type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'cyan';
const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Borrador', sent: 'Enviada', accepted: 'Aceptada', rejected: 'Rechazada', expired: 'Vencida',
};
const STATUS_COLOR: Record<QuoteStatus, BadgeColor> = {
  draft: 'gray', sent: 'blue', accepted: 'green', rejected: 'red', expired: 'yellow',
};

// Formato CLP: $1.234.567
const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const fmtDate = (d: Date) => d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Fila de ítem del formulario de creación ──────────────────────────────────
type ItemRow = {
  inventoryItemId: string; // '' = ítem libre
  description: string;
  quantity: number;
  unitPrice: number;
};
const EMPTY_ROW: ItemRow = { inventoryItemId: '', description: '', quantity: 1, unitPrice: 0 };

// ── Modal de creación ─────────────────────────────────────────────────────────
function CreateQuoteModal({ clients, inventory, onClose, onCreated }: {
  clients: Client[];
  inventory: InventoryItem[];
  onClose: () => void;
  onCreated: (q: Quote) => void;
}) {
  const [clientId, setClientId] = useState('');
  const [rows, setRows] = useState<ItemRow[]>([{ ...EMPTY_ROW }]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const setRow = (idx: number, patch: Partial<ItemRow>) =>
    setRows(rs => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  // Autocompletar descripción y precio de venta al elegir un insumo del inventario
  const handlePickInventory = (idx: number, invId: string) => {
    if (!invId) { setRow(idx, { inventoryItemId: '' }); return; }
    const item = inventory.find(i => i.id === invId);
    if (item) setRow(idx, { inventoryItemId: invId, description: item.name, unitPrice: item.unitPrice });
  };

  // Cálculo en vivo de totales
  const totals = useMemo(() => {
    const subtotal = rows.reduce((s, r) => s + Math.round(r.quantity * r.unitPrice), 0);
    const discountAmount = Math.round(subtotal * (discountPercent / 100));
    const net = subtotal - discountAmount;
    const taxAmount = Math.round(net * 0.19);
    return { subtotal, discountAmount, taxAmount, total: net + taxAmount };
  }, [rows, discountPercent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) throw new Error('Debe seleccionar un cliente');
      const items: CreateQuoteItemInput[] = rows.map(r => ({
        inventoryItemId: r.inventoryItemId || undefined,
        description: r.description,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
      }));
      const quote = await createQuoteUC.execute({
        clientId: client.id,
        clientName: client.businessName,
        validUntil: new Date(validUntil + 'T12:00:00'),
        items,
        discountPercent,
        notes: notes.trim() || undefined,
        createdBy: 'admin',
      });
      onCreated(quote);
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al crear la cotización');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: '720px', maxHeight: '92vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Nueva Cotización</h2>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        {err && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px', fontSize: '13px', color: 'var(--error-400)', marginBottom: '14px' }}>{err}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Cliente y validez */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <div>
              <label className="form-label">Cliente *</label>
              <select className="form-select" value={clientId} onChange={e => setClientId(e.target.value)} required>
                <option value="">Seleccionar cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.businessName}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Válida hasta *</label>
              <input className="form-input" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} required />
            </div>
          </div>

          {/* Ítems */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Ítems de la cotización *</label>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRows(rs => [...rs, { ...EMPTY_ROW }])}>+ Agregar ítem</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rows.map((row, idx) => {
                const invItem = row.inventoryItemId ? inventory.find(i => i.id === row.inventoryItemId) : undefined;
                const insufficientStock = invItem && row.quantity > invItem.currentStock;
                return (
                  <div key={idx} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginBottom: '8px' }}>
                      <select className="form-select" style={{ fontSize: '13px' }} value={row.inventoryItemId}
                        onChange={e => handlePickInventory(idx, e.target.value)}>
                        <option value="">Ítem libre (sin inventario)</option>
                        {inventory.filter(i => i.isActive).map(i => (
                          <option key={i.id} value={i.id}>{i.name} — stock: {i.currentStock} {i.unit}</option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-ghost btn-sm btn-icon" title="Quitar ítem"
                        onClick={() => setRows(rs => rs.length > 1 ? rs.filter((_, i) => i !== idx) : rs)}>🗑</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                      <input className="form-input" style={{ fontSize: '13px' }} placeholder="Descripción *" value={row.description}
                        onChange={e => setRow(idx, { description: e.target.value })} required />
                      <input className="form-input" style={{ fontSize: '13px' }} type="number" min={1} step="any" title="Cantidad"
                        value={row.quantity} onChange={e => setRow(idx, { quantity: Number(e.target.value) })} required />
                      <input className="form-input" style={{ fontSize: '13px' }} type="number" min={0} title="Precio unitario"
                        value={row.unitPrice} onChange={e => setRow(idx, { unitPrice: Number(e.target.value) })} required />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px' }}>
                      <span>
                        {invItem && (
                          <span style={{ color: insufficientStock ? 'var(--error-400)' : 'var(--text-muted)' }}>
                            {insufficientStock ? '⚠ ' : ''}Stock disponible: {invItem.currentStock} {invItem.unit}
                            {insufficientStock ? ' (se descontará hasta 0 al aceptar)' : ''}
                          </span>
                        )}
                      </span>
                      <span className="text-secondary">Subtotal: <strong style={{ color: 'var(--text-primary)' }}>{clp(row.quantity * row.unitPrice)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Descuento y notas */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
            <div>
              <label className="form-label">Descuento (%)</label>
              <input className="form-input" type="number" min={0} max={100} value={discountPercent}
                onChange={e => setDiscountPercent(Number(e.target.value))} />
            </div>
            <div>
              <label className="form-label">Notas</label>
              <input className="form-input" placeholder="Condiciones, plazos de entrega, etc." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          {/* Totales en vivo */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-secondary">Subtotal</span><span>{clp(totals.subtotal)}</span></div>
            {totals.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-secondary">Descuento ({discountPercent}%)</span><span style={{ color: 'var(--error-400)' }}>-{clp(totals.discountAmount)}</span></div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-secondary">IVA (19%)</span><span>{clp(totals.taxAmount)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--bg-border)', paddingTop: '6px', marginTop: '2px', fontWeight: 700, fontSize: '15px' }}>
              <span>Total</span><span style={{ color: 'var(--brand-400)' }}>{clp(totals.total)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Creando...' : 'Crear Cotización'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal de confirmación de aceptación (resumen de insumos a descontar) ─────
function AcceptConfirmModal({ quote, inventory, onClose, onConfirm, loading }: {
  quote: Quote;
  inventory: InventoryItem[];
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const stockItems = quote.items.filter(i => i.inventoryItemId);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: '480px', boxShadow: 'var(--shadow-xl)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>Aceptar {quote.quoteNumber}</h2>
        <p className="text-sm text-secondary" style={{ marginBottom: '14px' }}>
          Al aceptar se descontará el stock de los siguientes insumos:
        </p>
        {stockItems.length === 0 ? (
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Esta cotización no tiene ítems vinculados a inventario. No se descontará stock.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            {stockItems.map((item, idx) => {
              const inv = inventory.find(i => i.id === item.inventoryItemId);
              const insufficient = inv && item.quantity > inv.currentStock;
              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 500 }}>{item.description}</span>
                  <span style={{ color: insufficient ? 'var(--error-400)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    -{item.quantity}{inv ? ` / ${inv.currentStock} disp.` : ''}{insufficient ? ' ⚠' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onConfirm} disabled={loading}>
            {loading ? 'Procesando...' : '✅ Confirmar aceptación'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Panel de detalle ──────────────────────────────────────────────────────────
function QuoteDetailModal({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div className="font-mono" style={{ color: 'var(--brand-400)', fontSize: '15px', fontWeight: 700 }}>{quote.quoteNumber}</div>
            <div style={{ fontWeight: 600, fontSize: '16px', marginTop: '2px' }}>{quote.clientName}</div>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', fontSize: '12px', alignItems: 'center' }}>
          <Badge color={STATUS_COLOR[quote.status]} dot>{STATUS_LABEL[quote.status]}</Badge>
          <span className="text-secondary">Creada: {fmtDate(quote.createdAt)}</span>
          <span className="text-secondary">· Válida hasta: {fmtDate(quote.validUntil)}</span>
          {quote.sentAt && <span className="text-secondary">· Enviada: {fmtDate(quote.sentAt)}</span>}
        </div>

        <div style={{ border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '14px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                {['Descripción', 'Cant.', 'P. Unit.', 'Subtotal'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Descripción' ? 'left' : 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  <td style={{ padding: '8px 12px' }}>
                    {item.description}
                    {item.inventoryItemId && <span title="Vinculado a inventario" style={{ marginLeft: '6px' }}>📦</span>}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{clp(item.unitPrice)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{clp(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-secondary">Subtotal</span><span>{clp(quote.subtotal)}</span></div>
          {quote.discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-secondary">Descuento</span><span style={{ color: 'var(--error-400)' }}>-{clp(quote.discountAmount)}</span></div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-secondary">IVA ({Math.round(quote.taxRate * 100)}%)</span><span>{clp(quote.taxAmount)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--bg-border)', paddingTop: '6px', fontWeight: 700, fontSize: '15px' }}>
            <span>Total</span><span style={{ color: 'var(--brand-400)' }}>{clp(quote.total)}</span>
          </div>
        </div>

        {quote.notes && (
          <div style={{ fontSize: '13px' }}>
            <div className="form-label">Notas</div>
            <div className="text-secondary">{quote.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | QuoteStatus>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detailQuote, setDetailQuote] = useState<Quote | null>(null);
  const [acceptQuote, setAcceptQuote] = useState<Quote | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'warn'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qs, cs, inv] = await Promise.all([
        repositories.quotes.getAll(),
        repositories.clients.getAll(),
        repositories.inventory.getAll(),
      ]);
      setQuotes(qs);
      setClients(cs);
      setInventory(inv);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Acciones por cotización ──
  const handleSend = async (q: Quote) => {
    setActionLoading(true);
    try {
      const { quote } = await updateStatusUC.execute(q.id, 'sent');
      setQuotes(prev => prev.map(x => x.id === quote.id ? quote : x));
      setBanner({ type: 'ok', text: `${quote.quoteNumber} marcada como enviada.` });
    } catch (e: unknown) {
      setBanner({ type: 'warn', text: e instanceof Error ? e.message : 'Error al enviar' });
    } finally { setActionLoading(false); }
  };

  const handleAcceptConfirm = async () => {
    if (!acceptQuote) return;
    setActionLoading(true);
    try {
      const { quote, warnings } = await updateStatusUC.execute(acceptQuote.id, 'accepted');
      setQuotes(prev => prev.map(x => x.id === quote.id ? quote : x));
      // Refrescar inventario tras el descuento de stock
      repositories.inventory.getAll().then(setInventory);
      setBanner(warnings.length > 0
        ? { type: 'warn', text: `${quote.quoteNumber} aceptada con advertencias: ${warnings.join(' ')}` }
        : { type: 'ok', text: `${quote.quoteNumber} aceptada. Stock de insumos descontado.` });
      setAcceptQuote(null);
    } catch (e: unknown) {
      setBanner({ type: 'warn', text: e instanceof Error ? e.message : 'Error al aceptar' });
    } finally { setActionLoading(false); }
  };

  const handleReject = async (q: Quote) => {
    if (!confirm(`¿Rechazar la cotización ${q.quoteNumber}?`)) return;
    setActionLoading(true);
    try {
      const { quote } = await updateStatusUC.execute(q.id, 'rejected');
      setQuotes(prev => prev.map(x => x.id === quote.id ? quote : x));
      setBanner({ type: 'ok', text: `${quote.quoteNumber} rechazada.` });
    } catch (e: unknown) {
      setBanner({ type: 'warn', text: e instanceof Error ? e.message : 'Error al rechazar' });
    } finally { setActionLoading(false); }
  };

  const handleDelete = async (q: Quote) => {
    if (!confirm(`¿Eliminar el borrador ${q.quoteNumber}? Esta acción no se puede deshacer.`)) return;
    setActionLoading(true);
    try {
      await deleteQuoteUC.execute(q.id);
      setQuotes(prev => prev.filter(x => x.id !== q.id));
      setBanner({ type: 'ok', text: `Borrador ${q.quoteNumber} eliminado.` });
    } catch (e: unknown) {
      setBanner({ type: 'warn', text: e instanceof Error ? e.message : 'Error al eliminar' });
    } finally { setActionLoading(false); }
  };

  // ── Filtros y stats ──
  const filtered = quotes.filter(q => {
    const matchStatus = filter === 'all' || q.status === filter;
    const term = search.trim().toLowerCase();
    const matchSearch = term === '' ||
      q.clientName.toLowerCase().includes(term) ||
      q.quoteNumber.toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  const now = new Date();
  const acceptedThisMonth = quotes
    .filter(q => {
      if (q.status !== 'accepted') return false;
      const d = q.respondedAt ?? q.updatedAt;
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, q) => s + q.total, 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Cotizaciones</h1>
          <p className="page-desc">Gestión de propuestas comerciales con descuento de inventario</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={load}>🔄 Actualizar</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Nueva Cotización</button>
        </div>
      </div>

      {/* Banner de feedback */}
      {banner && (
        <div style={{
          background: banner.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
          border: `1px solid ${banner.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)'}`,
          borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '13px', marginBottom: '16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
        }}>
          <span>{banner.type === 'ok' ? '✅' : '⚠️'} {banner.text}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setBanner(null)}>✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid-4 stagger" style={{ marginBottom: '24px' }}>
        <StatCard label="Total Cotizaciones" value={quotes.length} icon="📋" color="blue" />
        <StatCard label="Enviadas" value={quotes.filter(q => q.status === 'sent').length} icon="📨" color="cyan" />
        <StatCard label="Aceptadas" value={quotes.filter(q => q.status === 'accepted').length} icon="✅" color="green" />
        <StatCard label="Monto Aceptado (mes)" value={clp(acceptedThisMonth)} icon="💰" color="yellow" />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-input-wrap" style={{ flex: 1, minWidth: '200px' }}>
          <span className="search-icon">🔍</span>
          <input type="text" className="form-input" placeholder="Buscar por cliente o número..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', fontSize: '13px', height: '36px' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['all', 'draft', 'sent', 'accepted', 'rejected', 'expired'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
              {f === 'all' ? 'Todas' : STATUS_LABEL[f as QuoteStatus]}
              <span style={{ background: filter === f ? 'rgba(255,255,255,0.25)' : 'var(--bg-border)', borderRadius: '100px', padding: '0 6px', fontSize: '11px', fontWeight: 600 }}>
                {f === 'all' ? quotes.length : quotes.filter(q => q.status === f).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>Cargando cotizaciones...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="📋" title="Sin cotizaciones" description={quotes.length === 0 ? 'Crea tu primera cotización para comenzar.' : 'No hay cotizaciones que coincidan con los filtros.'}
          action={quotes.length === 0 ? <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Nueva Cotización</button> : undefined} />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-border)', background: 'var(--bg-surface)' }}>
                  {['N° Cotización', 'Cliente', 'Ítems', 'Total', 'Válida Hasta', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id} style={{ borderBottom: '1px solid var(--bg-border)', transition: 'background var(--transition-fast)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="font-mono text-sm" style={{ color: 'var(--brand-400)', cursor: 'pointer' }} onClick={() => setDetailQuote(q)}>{q.quoteNumber}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{q.clientName}</td>
                    <td style={{ padding: '10px 14px' }}><Badge color="gray">{q.items.length} ítems</Badge></td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{clp(q.total)}</td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }} className="text-secondary">{fmtDate(q.validUntil)}</td>
                    <td style={{ padding: '10px 14px' }}><Badge color={STATUS_COLOR[q.status]} dot>{STATUS_LABEL[q.status]}</Badge></td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-ghost btn-sm" title="Ver detalle" onClick={() => setDetailQuote(q)}>👁</button>
                        {q.status === 'draft' && (
                          <>
                            <button className="btn btn-ghost btn-sm" title="Enviar" disabled={actionLoading} onClick={() => handleSend(q)}>📨</button>
                            <button className="btn btn-ghost btn-sm" title="Eliminar borrador" disabled={actionLoading} onClick={() => handleDelete(q)}>🗑</button>
                          </>
                        )}
                        {q.status === 'sent' && (
                          <>
                            <button className="btn btn-ghost btn-sm" title="Aceptar (descuenta stock)" disabled={actionLoading} onClick={() => setAcceptQuote(q)}>✅</button>
                            <button className="btn btn-ghost btn-sm" title="Rechazar" disabled={actionLoading} onClick={() => handleReject(q)}>❌</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modales */}
      {showCreate && (
        <CreateQuoteModal
          clients={clients}
          inventory={inventory}
          onClose={() => setShowCreate(false)}
          onCreated={q => { setQuotes(prev => [q, ...prev]); setBanner({ type: 'ok', text: `Cotización ${q.quoteNumber} creada como borrador.` }); }}
        />
      )}
      {detailQuote && <QuoteDetailModal quote={detailQuote} onClose={() => setDetailQuote(null)} />}
      {acceptQuote && (
        <AcceptConfirmModal
          quote={acceptQuote}
          inventory={inventory}
          loading={actionLoading}
          onClose={() => setAcceptQuote(null)}
          onConfirm={handleAcceptConfirm}
        />
      )}
    </div>
  );
}
