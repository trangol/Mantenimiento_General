'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, SectionHeader, Badge, StatCard, EmptyState } from '@/presentation/components/ui';
import { InventoryItem, InventoryCategory, StockMovement } from '@/core/domain/InventoryItem';
import { repositories } from '@/infrastructure/firebase/RepositoryFactory';
import { CreateInventoryItemUseCase } from '@/use-cases/inventory/CreateInventoryItemUseCase';
import { AdjustStockUseCase } from '@/use-cases/inventory/AdjustStockUseCase';

// ── use cases ─────────────────────────────────────────────────────────────────
const createItemUC = new CreateInventoryItemUseCase(repositories.inventory);
const adjustStockUC = new AdjustStockUseCase(repositories.inventory);

// ── constants ─────────────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  chemical: 'Químico', equipment: 'Equipo', tool: 'Herramienta',
  spare_part: 'Repuesto', consumable: 'Consumible', other: 'Otro',
};
const CATEGORY_COLORS: Record<InventoryCategory, string> = {
  chemical: 'blue', equipment: 'purple', tool: 'cyan',
  spare_part: 'yellow', consumable: 'green', other: 'gray',
};

type Tab = 'catalog' | 'alerts' | 'movements';

// ── ItemModal (crear / editar) ────────────────────────────────────────────────
type ItemFormData = {
  sku: string; name: string; description: string; category: InventoryCategory;
  unit: string; brand: string; currentStock: number; minimumStock: number;
  unitCost: number; unitPrice: number; supplierName: string; location: string;
};
const EMPTY_FORM: ItemFormData = {
  sku: '', name: '', description: '', category: 'consumable', unit: 'unidad',
  brand: '', currentStock: 0, minimumStock: 5, unitCost: 0, unitPrice: 0,
  supplierName: '', location: '',
};

function ItemModal({ item, onClose, onSave }: {
  item?: InventoryItem; onClose: () => void; onSave: (i: InventoryItem) => void;
}) {
  const [form, setForm] = useState<ItemFormData>(
    item ? {
      sku: item.sku, name: item.name, description: item.description ?? '',
      category: item.category, unit: item.unit, brand: item.brand ?? '',
      currentStock: item.currentStock, minimumStock: item.minimumStock,
      unitCost: item.unitCost, unitPrice: item.unitPrice,
      supplierName: item.supplierName ?? '', location: item.location ?? '',
    } : EMPTY_FORM
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof ItemFormData, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      let saved: InventoryItem;
      if (item) {
        saved = await repositories.inventory.update(item.id, {
          ...form,
          description: form.description || undefined,
          brand: form.brand || undefined,
          supplierName: form.supplierName || undefined,
          location: form.location || undefined,
        });
      } else {
        saved = await createItemUC.execute({
          ...form,
          description: form.description || undefined,
          brand: form.brand || undefined,
          supplierName: form.supplierName || undefined,
          location: form.location || undefined,
        });
      }
      onSave(saved);
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{item ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        {err && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px', fontSize: '13px', color: 'var(--error-400)', marginBottom: '14px' }}>{err}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label">SKU *</label>
              <input className="form-input" value={form.sku} onChange={e => set('sku', e.target.value.toUpperCase())} placeholder="CHEM-001" required />
            </div>
            <div>
              <label className="form-label">Categoría *</label>
              <select className="form-select" value={form.category} onChange={e => set('category', e.target.value as InventoryCategory)}>
                {(Object.keys(CATEGORY_LABELS) as InventoryCategory[]).map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Nombre *</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Cloro Granulado" required />
          </div>
          <div>
            <label className="form-label">Descripción</label>
            <input className="form-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Descripción opcional" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label">Unidad *</label>
              <input className="form-input" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="kg, litro, un." required />
            </div>
            <div>
              <label className="form-label">Marca</label>
              <input className="form-input" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Marca" />
            </div>
            <div>
              <label className="form-label">Ubicación</label>
              <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Bodega A" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label">Stock inicial</label>
              <input className="form-input" type="number" min={0} value={form.currentStock} onChange={e => set('currentStock', Number(e.target.value))} />
            </div>
            <div>
              <label className="form-label">Stock mínimo</label>
              <input className="form-input" type="number" min={0} value={form.minimumStock} onChange={e => set('minimumStock', Number(e.target.value))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label">Costo unitario ($)</label>
              <input className="form-input" type="number" min={0} value={form.unitCost} onChange={e => set('unitCost', Number(e.target.value))} />
            </div>
            <div>
              <label className="form-label">Precio venta ($)</label>
              <input className="form-input" type="number" min={0} value={form.unitPrice} onChange={e => set('unitPrice', Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="form-label">Proveedor</label>
            <input className="form-input" value={form.supplierName} onChange={e => set('supplierName', e.target.value)} placeholder="Nombre del proveedor" />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Guardando...' : item ? 'Actualizar' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── StockModal (entrada / salida / ajuste) ────────────────────────────────────
function StockModal({ item, onClose, onDone }: {
  item: InventoryItem; onClose: () => void; onDone: () => void;
}) {
  const [type, setType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('compra');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      await adjustStockUC.execute({
        itemId: item.id, type, quantity: qty, reason,
        unitCost: item.unitCost, performedBy: 'admin',
      });
      onDone();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al ajustar stock');
    } finally { setLoading(false); }
  };

  const TYPE_LABELS = { in: 'Entrada de stock', out: 'Salida de stock', adjustment: 'Ajuste de inventario' };
  const REASON_OPTIONS = {
    in: ['compra', 'devolución', 'ajuste_positivo'],
    out: ['uso_ot', 'merma', 'ajuste_negativo'],
    adjustment: ['conteo_físico', 'corrección'],
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Movimiento de Stock</h2>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '16px', fontSize: '13px' }}>
          <div style={{ fontWeight: 600 }}>{item.name}</div>
          <div className="text-secondary">Stock actual: <strong>{item.currentStock} {item.unit}</strong></div>
        </div>
        {err && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px', fontSize: '13px', color: 'var(--error-400)', marginBottom: '14px' }}>{err}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="form-label">Tipo de movimiento</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['in', 'out', 'adjustment'] as const).map(t => (
                <button key={t} type="button" onClick={() => { setType(t); setReason(REASON_OPTIONS[t][0]); }} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                  background: type === t ? (t === 'in' ? 'var(--success-500)' : t === 'out' ? 'var(--error-500)' : 'var(--brand-500)') : 'var(--bg-surface)',
                  color: type === t ? 'white' : 'var(--text-secondary)',
                }}>
                  {t === 'in' ? '📥 Entrada' : t === 'out' ? '📤 Salida' : '⚖️ Ajuste'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">Cantidad ({item.unit})</label>
            <input className="form-input" type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))} required />
          </div>
          <div>
            <label className="form-label">Motivo</label>
            <select className="form-select" value={reason} onChange={e => setReason(e.target.value)}>
              {REASON_OPTIONS[type].map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Stock resultante: <strong style={{ color: 'var(--text-primary)' }}>
              {type === 'in' ? item.currentStock + qty : Math.max(0, item.currentStock - qty)} {item.unit}
            </strong>
            {type === 'out' && item.currentStock - qty < 0 && (
              <span style={{ color: 'var(--error-400)', marginLeft: '8px' }}>⚠ Stock insuficiente</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading || (type === 'out' && item.currentStock - qty < 0)}>
              {loading ? 'Procesando...' : TYPE_LABELS[type]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── MovementsPanel ─────────────────────────────────────────────────────────────
function MovementsPanel({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repositories.inventory.getMovements(item.id)
      .then(setMovements)
      .finally(() => setLoading(false));
  }, [item.id]);

  const TYPE_ICON = { in: '📥', out: '📤', adjustment: '⚖️' };
  const TYPE_COLOR = { in: 'green', out: 'red', adjustment: 'blue' };

  return (
    <Card className="animate-fade-in" style={{ alignSelf: 'start' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>{item.name}</div>
          <div className="text-xs text-secondary">Historial de movimientos</div>
        </div>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
      </div>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-border)', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
        <span className="text-sm text-secondary">Stock actual</span>
        <span style={{ fontWeight: 700, fontSize: '16px' }}>{item.currentStock} <span className="text-xs text-muted">{item.unit}</span></span>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>⏳ Cargando...</div>
      ) : movements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>Sin movimientos registrados</div>
      ) : (
        <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
          {movements.map(m => (
            <div key={m.id} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--bg-border)', alignItems: 'center' }}>
              <span style={{ fontSize: '16px' }}>{TYPE_ICON[m.type]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{m.reason.replace('_', ' ')}</div>
                <div className="text-xs text-muted">{m.createdAt.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Badge color={TYPE_COLOR[m.type] as 'green' | 'red' | 'blue'}>
                  {m.type === 'in' ? '+' : m.type === 'out' ? '-' : '±'}{m.quantity} {item.unit}
                </Badge>
                <div className="text-xs text-muted" style={{ marginTop: '2px' }}>
                  ${(m.totalCost).toLocaleString('es-CL')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function InventoryPage() {
  const [tab, setTab] = useState<Tab>('catalog');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | 'all'>('all');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>();
  const [stockItem, setStockItem] = useState<InventoryItem | null>(null);
  const [movementsItem, setMovementsItem] = useState<InventoryItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [all, low] = await Promise.all([
        repositories.inventory.getAll(),
        repositories.inventory.getLowStock(),
      ]);
      setItems(all);
      setLowStock(low);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveItem = (saved: InventoryItem) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === saved.id);
      return idx >= 0 ? prev.map(i => i.id === saved.id ? saved : i) : [...prev, saved];
    });
    setLowStock(prev => {
      const updated = prev.filter(i => i.id !== saved.id);
      if (saved.currentStock <= saved.minimumStock) return [...updated, saved];
      return updated;
    });
  };

  const filtered = items.filter(i => {
    const matchSearch = search === '' ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      (i.brand ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || i.category === categoryFilter;
    return matchSearch && matchCat && i.isActive;
  });

  const totalValue = items.reduce((s, i) => s + i.currentStock * i.unitCost, 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventario General</h1>
          <p className="page-desc">Control de stock, insumos y movimientos en bodega</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={load}>🔄 Actualizar</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingItem(undefined); setShowItemModal(true); }}>
            + Nuevo Producto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4 stagger" style={{ marginBottom: '24px' }}>
        <StatCard label="Total Productos" value={items.filter(i => i.isActive).length} icon="📦" color="blue" />
        <StatCard label="Stock Crítico" value={lowStock.length} icon="⚠️" color="red" />
        <StatCard label="Valor en Bodega" value={`$${Math.round(totalValue / 1000)}k`} icon="💰" color="green" />
        <StatCard label="Categorías" value={new Set(items.map(i => i.category)).size} icon="🗂️" color="cyan" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-surface)', padding: '4px', borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
        {([['catalog', '📦 Catálogo'], ['alerts', `⚠️ Alertas${lowStock.length > 0 ? ` (${lowStock.length})` : ''}`], ['movements', '📋 Movimientos']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '6px 16px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: 600,
            background: tab === t ? 'var(--bg-card)' : 'transparent',
            color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
            boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {/* ── CATALOG TAB ── */}
      {tab === 'catalog' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-input-wrap" style={{ flex: 1, minWidth: '200px' }}>
              <span className="search-icon">🔍</span>
              <input type="text" className="form-input" placeholder="Buscar por nombre, SKU, marca..." value={search}
                onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', fontSize: '13px', height: '36px' }} />
            </div>
            <select className="form-select" style={{ width: 'auto', fontSize: '13px', height: '36px' }}
              value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as InventoryCategory | 'all')}>
              <option value="all">Todas las categorías</option>
              {(Object.keys(CATEGORY_LABELS) as InventoryCategory[]).map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>Cargando inventario...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="📦" title="Sin productos" description="Agrega tu primer producto al inventario."
              action={<button className="btn btn-primary btn-sm" onClick={() => { setEditingItem(undefined); setShowItemModal(true); }}>+ Nuevo Producto</button>} />
          ) : (
            <div className={`list-detail-grid${movementsItem ? ' has-panel' : ''}`}>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--bg-border)', background: 'var(--bg-surface)' }}>
                        {['SKU', 'Producto', 'Categoría', 'Stock', 'Costo', 'P. Venta', ''].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(item => {
                        const isLow = item.currentStock <= item.minimumStock;
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid var(--bg-border)', transition: 'background var(--transition-fast)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '11px' }}>{item.sku}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontWeight: 600 }}>{item.name}</div>
                              {item.brand && <div className="text-xs text-muted">{item.brand}{item.location ? ` · ${item.location}` : ''}</div>}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <Badge color={CATEGORY_COLORS[item.category] as 'blue' | 'purple' | 'cyan' | 'yellow' | 'green' | 'gray'}>
                                {CATEGORY_LABELS[item.category]}
                              </Badge>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 600, color: isLow ? 'var(--error-400)' : 'var(--text-primary)' }}>
                                  {isLow ? '⚠ ' : ''}{item.currentStock}
                                </span>
                                <span className="text-xs text-muted">{item.unit}</span>
                                <span className="text-xs text-muted">/ mín {item.minimumStock}</span>
                              </div>
                            </td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                              ${item.unitCost.toLocaleString('es-CL')}
                            </td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                              ${item.unitPrice.toLocaleString('es-CL')}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn btn-ghost btn-sm" title="Movimiento de stock" onClick={() => setStockItem(item)}>📥</button>
                                <button className="btn btn-ghost btn-sm" title="Ver movimientos" onClick={() => setMovementsItem(movementsItem?.id === item.id ? null : item)}>📋</button>
                                <button className="btn btn-ghost btn-sm" title="Editar" onClick={() => { setEditingItem(item); setShowItemModal(true); }}>✏️</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {movementsItem && (
                <MovementsPanel item={movementsItem} onClose={() => setMovementsItem(null)} />
              )}
            </div>
          )}
        </>
      )}

      {/* ── ALERTS TAB ── */}
      {tab === 'alerts' && (
        <>
          {lowStock.length === 0 ? (
            <EmptyState icon="✅" title="Stock en orden" description="Todos los productos están sobre el mínimo requerido." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lowStock.map(item => {
                const pct = item.minimumStock > 0 ? Math.round((item.currentStock / item.minimumStock) * 100) : 0;
                return (
                  <Card key={item.id} style={{ borderLeft: '3px solid var(--error-400)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontWeight: 700, marginBottom: '2px' }}>{item.name}</div>
                        <div className="text-xs text-secondary">{item.sku} · {CATEGORY_LABELS[item.category]}</div>
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span className="text-xs text-secondary">Stock actual</span>
                            <span className="text-xs" style={{ color: 'var(--error-400)', fontWeight: 600 }}>
                              {item.currentStock} / {item.minimumStock} {item.unit}
                            </span>
                          </div>
                          <div style={{ height: '5px', background: 'var(--bg-border)', borderRadius: '100px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: pct < 50 ? 'var(--error-500)' : 'var(--warning-500)', borderRadius: '100px' }} />
                          </div>
                        </div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => setStockItem(item)}>
                        📥 Reponer stock
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── MOVEMENTS TAB ── */}
      {tab === 'movements' && (
        <RecentMovementsTab items={items} />
      )}

      {/* Modals */}
      {showItemModal && (
        <ItemModal
          item={editingItem}
          onClose={() => setShowItemModal(false)}
          onSave={handleSaveItem}
        />
      )}
      {stockItem && (
        <StockModal
          item={stockItem}
          onClose={() => setStockItem(null)}
          onDone={load}
        />
      )}
    </div>
  );
}

// ── RecentMovementsTab ────────────────────────────────────────────────────────
function RecentMovementsTab({ items }: { items: InventoryItem[] }) {
  const [movements, setMovements] = useState<(StockMovement & { itemName: string; itemUnit: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const targets = selectedItemId === 'all'
          ? items.slice(0, 10)
          : items.filter(i => i.id === selectedItemId);
        const all = await Promise.all(
          targets.map(async item => {
            const movs = await repositories.inventory.getMovements(item.id);
            return movs.map(m => ({ ...m, itemName: item.name, itemUnit: item.unit }));
          })
        );
        const flat = all.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setMovements(flat.slice(0, 50));
      } finally { setLoading(false); }
    };
    if (items.length > 0) load();
    else setLoading(false);
  }, [items, selectedItemId]);

  const TYPE_ICON = { in: '📥', out: '📤', adjustment: '⚖️' };
  const TYPE_COLOR = { in: 'green', out: 'red', adjustment: 'blue' };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <select className="form-select" style={{ width: 'auto', fontSize: '13px' }}
          value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)}>
          <option value="all">Últimos movimientos (todos)</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>⏳ Cargando...</div>
        ) : movements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>Sin movimientos registrados</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bg-border)', background: 'var(--bg-surface)' }}>
                {['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Motivo', 'Costo Total'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                    {m.createdAt.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{m.itemName}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: '14px' }}>{TYPE_ICON[m.type]}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <Badge color={TYPE_COLOR[m.type] as 'green' | 'red' | 'blue'}>
                      {m.type === 'in' ? '+' : m.type === 'out' ? '-' : '±'}{m.quantity} {m.itemUnit}
                    </Badge>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{m.reason.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>${m.totalCost.toLocaleString('es-CL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
