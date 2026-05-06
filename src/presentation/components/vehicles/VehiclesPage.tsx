'use client';

import React, { useState } from 'react';
import { Card, SectionHeader, Badge, StatCard } from '@/presentation/components/ui';

const mockVehicles = [
  { id: 'V1', plate: 'HJKL-52', brand: 'Ford', model: 'Transit', year: 2022, type: 'Furgón', status: 'active' as const, driver: 'Juan Pérez', currentKm: 45230, nextMaintenanceKm: 50000, todayOTs: 4 },
  { id: 'V2', plate: 'MNPQ-71', brand: 'Mercedes', model: 'Sprinter', year: 2021, type: 'Furgón', status: 'active' as const, driver: 'Carlos Muñoz', currentKm: 62100, nextMaintenanceKm: 65000, todayOTs: 5 },
  { id: 'V3', plate: 'RSTU-33', brand: 'Volkswagen', model: 'Crafter', year: 2020, type: 'Furgón', status: 'active' as const, driver: 'Pedro Soto', currentKm: 88400, nextMaintenanceKm: 90000, todayOTs: 4 },
  { id: 'V4', plate: 'ABCD-90', brand: 'Renault', model: 'Master', year: 2023, type: 'Furgón', status: 'active' as const, driver: 'Miguel Torres', currentKm: 21000, nextMaintenanceKm: 30000, todayOTs: 5 },
  { id: 'V5', plate: 'EFGH-11', brand: 'Fiat', model: 'Ducato', year: 2021, type: 'Furgón', status: 'active' as const, driver: 'Roberto Díaz', currentKm: 53700, nextMaintenanceKm: 60000, todayOTs: 4 },
  { id: 'V6', plate: 'IJKL-44', brand: 'Toyota', model: 'Hilux', year: 2022, type: 'Camioneta', status: 'maintenance' as const, driver: 'Sin asignar', currentKm: 31500, nextMaintenanceKm: 35000, todayOTs: 0 },
  { id: 'V7', plate: 'MNOP-77', brand: 'Hyundai', model: 'H350', year: 2020, type: 'Furgón', status: 'active' as const, driver: 'Carlos Pérez (externo)', currentKm: 71200, nextMaintenanceKm: 75000, todayOTs: 3 },
  { id: 'V8', plate: 'QRST-88', brand: 'Citroën', model: 'Jumper', year: 2019, type: 'Furgón', status: 'active' as const, driver: 'Sin asignar', currentKm: 105000, nextMaintenanceKm: 110000, todayOTs: 0 },
];

const statusLabel = { active: 'Activo', maintenance: 'En Mantención', inactive: 'Inactivo' } as const;
const statusColor = { active: 'green', maintenance: 'yellow', inactive: 'red' } as const;

export function VehiclesPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const vehicle = mockVehicles.find(v => v.id === selected);

  const active = mockVehicles.filter(v => v.status === 'active').length;
  const totalOTs = mockVehicles.reduce((s, v) => s + v.todayOTs, 0);
  const nearMaint = mockVehicles.filter(v => v.nextMaintenanceKm - v.currentKm < 5000).length;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehículos</h1>
          <p className="page-desc">Gestión de flota, asignaciones y mantención vehicular</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm">📊 Reporte Flota</button>
          <button className="btn btn-primary btn-sm">+ Agregar Vehículo</button>
        </div>
      </div>

      <div className="grid-4 stagger" style={{ marginBottom: '24px' }}>
        <StatCard label="Flota Total" value={mockVehicles.length} icon="🚐" color="blue" />
        <StatCard label="Activos Hoy" value={active} icon="✅" color="green" />
        <StatCard label="OTs Desplegadas" value={totalOTs} icon="🔧" color="cyan" />
        <StatCard label="Mantención Próxima" value={nearMaint} icon="⚠️" color="yellow" />
      </div>

      <div className={`list-detail-grid${selected ? ' has-panel' : ''}`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', alignContent: 'start' }}>
          {mockVehicles.map(v => {
            const kmToMaint = v.nextMaintenanceKm - v.currentKm;
            const maintPct = Math.round((v.currentKm / v.nextMaintenanceKm) * 100);
            const isNearMaint = kmToMaint < 5000;
            return (
              <div
                key={v.id}
                onClick={() => setSelected(selected === v.id ? null : v.id)}
                style={{
                  background: selected === v.id ? 'rgba(59,130,246,0.08)' : 'var(--gradient-card)',
                  border: `1px solid ${selected === v.id ? 'rgba(59,130,246,0.4)' : isNearMaint ? 'rgba(234,179,8,0.3)' : 'var(--bg-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '18px',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '26px' }}>{v.type === 'Camioneta' ? '🚙' : '🚐'}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{v.plate}</div>
                      <div className="text-sm text-secondary">{v.brand} {v.model} {v.year}</div>
                    </div>
                  </div>
                  <Badge color={statusColor[v.status]} dot>{statusLabel[v.status]}</Badge>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <span className="text-sm text-secondary">👤 {v.driver}</span>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span className="text-xs text-secondary">Kilometraje</span>
                    <span className="text-xs" style={{ color: isNearMaint ? 'var(--warning-400)' : 'var(--text-muted)' }}>
                      {isNearMaint ? '⚠ ' : ''}{kmToMaint.toLocaleString('es-CL')} km para mantención
                    </span>
                  </div>
                  <div style={{ height: '5px', background: 'var(--bg-border)', borderRadius: '100px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${maintPct}%`, background: isNearMaint ? 'var(--warning-500)' : 'var(--gradient-brand)', borderRadius: '100px' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                    <span className="text-xs text-muted">{v.currentKm.toLocaleString('es-CL')} km</span>
                    <span className="text-xs text-muted">Meta: {v.nextMaintenanceKm.toLocaleString('es-CL')} km</span>
                  </div>
                </div>

                {v.todayOTs > 0 && (
                  <div style={{ borderTop: '1px solid var(--bg-border)', paddingTop: '10px', display: 'flex', justifyContent: 'center' }}>
                    <Badge color="blue">🔧 {v.todayOTs} OTs hoy</Badge>
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
                  <span style={{ fontSize: '28px' }}>{vehicle.type === 'Camioneta' ? '🚙' : '🚐'}</span>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>{vehicle.plate}</div>
                    <div className="text-sm text-secondary">{vehicle.brand} {vehicle.model} {vehicle.year}</div>
                  </div>
                </div>
                <Badge color={statusColor[vehicle.status]}>{statusLabel[vehicle.status]}</Badge>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-border)', padding: '14px', marginBottom: '16px' }}>
              {[
                { icon: '👤', label: vehicle.driver },
                { icon: '🔢', label: `${vehicle.currentKm.toLocaleString('es-CL')} km actuales` },
                { icon: '🔧', label: `Próxima mantención: ${vehicle.nextMaintenanceKm.toLocaleString('es-CL')} km` },
                { icon: '🚗', label: `Tipo: ${vehicle.type}` },
              ].map(info => (
                <div key={info.label} style={{ display: 'flex', gap: '10px', padding: '5px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span>{info.icon}</span><span>{info.label}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }}>✏️ Editar</button>
              <button className="btn btn-secondary" style={{ flex: 1 }}>🔧 Mantención</button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
