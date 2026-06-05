'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, SectionHeader, Badge, StatCard, EmptyState } from '@/presentation/components/ui';
import { Vehicle, VehicleStatus } from '@/core/domain/Vehicle';
import { repositories } from '@/infrastructure/firebase/RepositoryFactory';

// ── helpers ───────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<VehicleStatus, string> = {
  active: 'Activo', maintenance: 'En Mantención', inactive: 'Inactivo',
};
const STATUS_COLOR: Record<VehicleStatus, 'green' | 'yellow' | 'red'> = {
  active: 'green', maintenance: 'yellow', inactive: 'red',
};

type VehicleFormData = {
  plate: string; brand: string; model: string; year: number;
  type: Vehicle['type']; status: VehicleStatus;
  assignedDriverName: string; currentKm: number; nextMaintenanceKm: number; notes: string;
};

const EMPTY_FORM: VehicleFormData = {
  plate: '', brand: '', model: '', year: new Date().getFullYear(),
  type: 'furgón', status: 'active',
  assignedDriverName: '', currentKm: 0, nextMaintenanceKm: 10000, notes: '',
};

// ── VehicleModal ──────────────────────────────────────────────────────────────

function VehicleModal({ vehicle, onClose, onSave }: {
  vehicle?: Vehicle; onClose: () => void; onSave: (v: Vehicle) => void;
}) {
  const [form, setForm] = useState<VehicleFormData>(
    vehicle
      ? {
          plate: vehicle.plate, brand: vehicle.brand, model: vehicle.model,
          year: vehicle.year, type: vehicle.type, status: vehicle.status,
          assignedDriverName: vehicle.assignedDriverName ?? '',
          currentKm: vehicle.currentKm ?? 0,
          nextMaintenanceKm: vehicle.nextMaintenanceKm ?? 10000,
          notes: vehicle.notes ?? '',
        }
      : EMPTY_FORM
  );
  const [loading, setLoading] = useState(false);
  const set = (k: keyof VehicleFormData, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        plate: form.plate.toUpperCase(), brand: form.brand, model: form.model,
        year: form.year, type: form.type, status: form.status,
        assignedDriverName: form.assignedDriverName || undefined,
        currentKm: form.currentKm, nextMaintenanceKm: form.nextMaintenanceKm,
        notes: form.notes || undefined,
      };
      const saved = vehicle
        ? await repositories.vehicles.update(vehicle.id, data)
        : await repositories.vehicles.create(data);
      onSave(saved);
      onClose();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '90vh',
        overflowY: 'auto', boxShadow: 'var(--shadow-xl)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{vehicle ? 'Editar Vehículo' : 'Agregar Vehículo'}</h2>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label">Patente *</label>
              <input className="form-input" value={form.plate} onChange={e => set('plate', e.target.value)} placeholder="ABCD-12" required />
            </div>
            <div>
              <label className="form-label">Tipo *</label>
              <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="furgón">Furgón</option>
                <option value="camioneta">Camioneta</option>
                <option value="sedan">Sedán</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '10px' }}>
            <div>
              <label className="form-label">Marca *</label>
              <input className="form-input" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Ford" required />
            </div>
            <div>
              <label className="form-label">Modelo *</label>
              <input className="form-input" value={form.model} onChange={e => set('model', e.target.value)} placeholder="Transit" required />
            </div>
            <div>
              <label className="form-label">Año</label>
              <input className="form-input" type="number" value={form.year} onChange={e => set('year', Number(e.target.value))} min={2000} max={2030} />
            </div>
          </div>
          <div>
            <label className="form-label">Conductor / Técnico asignado</label>
            <input className="form-input" value={form.assignedDriverName} onChange={e => set('assignedDriverName', e.target.value)} placeholder="Nombre del conductor" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label">Km actuales</label>
              <input className="form-input" type="number" min={0} value={form.currentKm} onChange={e => set('currentKm', Number(e.target.value))} />
            </div>
            <div>
              <label className="form-label">Km próxima mantención</label>
              <input className="form-input" type="number" min={0} value={form.nextMaintenanceKm} onChange={e => set('nextMaintenanceKm', Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="form-label">Estado</label>
            <select className="form-select" value={form.status} onChange={e => set('status', e.target.value as VehicleStatus)}>
              <option value="active">Activo</option>
              <option value="maintenance">En Mantención</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
          <div>
            <label className="form-label">Notas</label>
            <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Guardando...' : vehicle ? 'Actualizar' : 'Agregar Vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);

  const vehicle = vehicles.find(v => v.id === selected);

  const load = useCallback(async () => {
    setLoading(true);
    try { setVehicles(await repositories.vehicles.getAll()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = (saved: Vehicle) => {
    setVehicles(prev => {
      const idx = prev.findIndex(v => v.id === saved.id);
      return idx >= 0 ? prev.map(v => v.id === saved.id ? saved : v) : [...prev, saved];
    });
  };

  const openEdit = (v: Vehicle) => { setEditingVehicle(v); setShowModal(true); };
  const openNew  = () => { setEditingVehicle(undefined); setShowModal(true); };

  const active   = vehicles.filter(v => v.status === 'active').length;
  const inMaint  = vehicles.filter(v => v.status === 'maintenance').length;
  const nearMaint = vehicles.filter(v =>
    v.currentKm !== undefined && v.nextMaintenanceKm !== undefined
    && (v.nextMaintenanceKm - v.currentKm) < 5000
  ).length;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehículos</h1>
          <p className="page-desc">Gestión de flota, asignaciones y mantención vehicular</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={load}>🔄 Actualizar</button>
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Agregar Vehículo</button>
        </div>
      </div>

      <div className="grid-4 stagger" style={{ marginBottom: '24px' }}>
        <StatCard label="Flota Total" value={vehicles.length} icon="🚐" color="blue" />
        <StatCard label="Activos" value={active} icon="✅" color="green" />
        <StatCard label="En Mantención" value={inMaint} icon="🔧" color="yellow" />
        <StatCard label="Mantención Próxima" value={nearMaint} icon="⚠️" color="red" />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>Cargando flota...
        </div>
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon="🚐"
          title="Sin vehículos registrados"
          description="Agrega los vehículos de tu flota para comenzar a planificar rutas."
          action={<button className="btn btn-primary btn-sm" onClick={openNew}>+ Agregar Vehículo</button>}
        />
      ) : (
        <div className={`list-detail-grid${selected ? ' has-panel' : ''}`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', alignContent: 'start' }}>
            {vehicles.map(v => {
              const kmToMaint = (v.nextMaintenanceKm ?? 0) - (v.currentKm ?? 0);
              const maintPct  = v.nextMaintenanceKm
                ? Math.min(100, Math.round(((v.currentKm ?? 0) / v.nextMaintenanceKm) * 100))
                : 0;
              const isNearMaint = kmToMaint > 0 && kmToMaint < 5000;

              return (
                <div
                  key={v.id}
                  onClick={() => setSelected(selected === v.id ? null : v.id)}
                  style={{
                    background: selected === v.id ? 'rgba(59,130,246,0.08)' : 'var(--gradient-card)',
                    border: `1px solid ${selected === v.id ? 'rgba(59,130,246,0.4)' : isNearMaint ? 'rgba(234,179,8,0.3)' : 'var(--bg-border)'}`,
                    borderRadius: 'var(--radius-md)', padding: '18px', cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '26px' }}>{v.type === 'camioneta' ? '🚙' : '🚐'}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px' }}>{v.plate}</div>
                        <div className="text-sm text-secondary">{v.brand} {v.model} {v.year}</div>
                      </div>
                    </div>
                    <Badge color={STATUS_COLOR[v.status]} dot>{STATUS_LABEL[v.status]}</Badge>
                  </div>

                  {v.assignedDriverName && (
                    <div className="text-sm text-secondary" style={{ marginBottom: '10px' }}>
                      👤 {v.assignedDriverName}
                    </div>
                  )}

                  {v.currentKm !== undefined && v.nextMaintenanceKm !== undefined && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span className="text-xs text-secondary">Kilometraje</span>
                        <span className="text-xs" style={{ color: isNearMaint ? 'var(--warning-400)' : 'var(--text-muted)' }}>
                          {isNearMaint ? '⚠ ' : ''}{kmToMaint.toLocaleString('es-CL')} km restantes
                        </span>
                      </div>
                      <div style={{ height: '5px', background: 'var(--bg-border)', borderRadius: '100px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${maintPct}%`,
                          background: isNearMaint ? 'var(--warning-500)' : 'var(--gradient-brand)',
                          borderRadius: '100px',
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                        <span className="text-xs text-muted">{v.currentKm.toLocaleString('es-CL')} km</span>
                        <span className="text-xs text-muted">Meta: {v.nextMaintenanceKm.toLocaleString('es-CL')} km</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {vehicle && (
            <Card className="animate-fade-in" style={{ alignSelf: 'start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '28px' }}>{vehicle.type === 'camioneta' ? '🚙' : '🚐'}</span>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 700 }}>{vehicle.plate}</div>
                      <div className="text-sm text-secondary">{vehicle.brand} {vehicle.model} {vehicle.year}</div>
                    </div>
                  </div>
                  <Badge color={STATUS_COLOR[vehicle.status]}>{STATUS_LABEL[vehicle.status]}</Badge>
                </div>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelected(null)}>✕</button>
              </div>

              <SectionHeader title="Detalles" />
              <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-border)', padding: '14px', marginBottom: '16px' }}>
                {[
                  vehicle.assignedDriverName ? { icon: '👤', label: vehicle.assignedDriverName } : null,
                  vehicle.currentKm !== undefined ? { icon: '🔢', label: `${vehicle.currentKm.toLocaleString('es-CL')} km actuales` } : null,
                  vehicle.nextMaintenanceKm !== undefined ? { icon: '🔧', label: `Próxima mantención: ${vehicle.nextMaintenanceKm.toLocaleString('es-CL')} km` } : null,
                  { icon: '🚗', label: `Tipo: ${vehicle.type}` },
                  vehicle.notes ? { icon: '📝', label: vehicle.notes } : null,
                ].filter(Boolean).map((info, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '6px 0', fontSize: '13px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--bg-border)' }}>
                    <span>{(info as {icon:string}).icon}</span>
                    <span>{(info as {label:string}).label}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => openEdit(vehicle)}>
                  ✏️ Editar
                </button>
                <button
                  className="btn btn-secondary" style={{ flex: 1 }}
                  disabled={vehicle.status === 'maintenance'}
                  onClick={async () => {
                    await repositories.vehicles.update(vehicle.id, { status: 'maintenance' });
                    setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...v, status: 'maintenance' } : v));
                  }}
                >
                  🔧 En Mantención
                </button>
              </div>
            </Card>
          )}
        </div>
      )}

      {showModal && (
        <VehicleModal
          vehicle={editingVehicle}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
