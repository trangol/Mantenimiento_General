'use client';

import React, { useState } from 'react';
import {
  Card, SectionHeader, StatusBadge, Badge, EmptyState,
} from '@/presentation/components/ui';

const mockOTs = [
  {
    id: 'OT-2841', clientName: 'Club de Campo Las Araucarias', assetName: 'Piscina Olímpica',
    technician: 'Juan Pérez', scheduledDate: '30/04/2026', startedAt: '08:45', completedAt: null,
    status: 'in_progress' as const, supplies: 3, totalCost: 0,
  },
  {
    id: 'OT-2840', clientName: 'Condominio Los Pinos', assetName: 'Piscina Temperada',
    technician: 'Carlos Muñoz', scheduledDate: '30/04/2026', startedAt: '09:10', completedAt: '10:55',
    status: 'completed' as const, supplies: 5, totalCost: 18500,
  },
  {
    id: 'OT-2839', clientName: 'Hotel Costanera', assetName: 'Piscina Principal',
    technician: 'Pedro Soto', scheduledDate: '30/04/2026', startedAt: '07:30', completedAt: '09:00',
    status: 'completed' as const, supplies: 4, totalCost: 31000,
  },
  {
    id: 'OT-2838', clientName: 'Residencial El Bosque', assetName: 'Piscina Infantil',
    technician: 'Miguel Torres', scheduledDate: '30/04/2026', startedAt: null, completedAt: null,
    status: 'pending' as const, supplies: 0, totalCost: 0,
  },
  {
    id: 'OT-2837', clientName: 'Centro Deportivo Malloco', assetName: 'Piscina Semi-Olímpica',
    technician: 'Juan Pérez', scheduledDate: '30/04/2026', startedAt: null, completedAt: null,
    status: 'pending' as const, supplies: 0, totalCost: 0,
  },
  {
    id: 'OT-2836', clientName: 'Club Los Dominicos', assetName: 'Piscina Adultos',
    technician: 'Roberto Díaz', scheduledDate: '29/04/2026', startedAt: '08:00', completedAt: '10:20',
    status: 'completed' as const, supplies: 6, totalCost: 27300,
  },
];

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';

export function MaintenancePage() {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = mockOTs.filter((ot) => {
    const matchStatus = filter === 'all' || ot.status === filter;
    const matchSearch =
      search === '' ||
      ot.clientName.toLowerCase().includes(search.toLowerCase()) ||
      ot.id.toLowerCase().includes(search.toLowerCase()) ||
      ot.technician.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    all: mockOTs.length,
    pending: mockOTs.filter(o => o.status === 'pending').length,
    in_progress: mockOTs.filter(o => o.status === 'in_progress').length,
    completed: mockOTs.filter(o => o.status === 'completed').length,
  };

  return (
    <div className="animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Mantenimientos</h1>
          <p className="page-desc">Gestión de Órdenes de Trabajo — registro, seguimiento y cierre</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm">📊 Exportar</button>
          <button className="btn btn-primary btn-sm">+ Nueva OT</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {([
          { key: 'all',         label: 'Todas' },
          { key: 'pending',     label: 'Pendientes' },
          { key: 'in_progress', label: 'En Progreso' },
          { key: 'completed',   label: 'Completadas' },
        ] as { key: StatusFilter; label: string }[]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
          >
            {f.label}
            <span style={{
              background: filter === f.key ? 'rgba(255,255,255,0.25)' : 'var(--bg-border)',
              borderRadius: '100px',
              padding: '0 7px',
              fontSize: '11px',
              fontWeight: '600',
            }}>
              {counts[f.key]}
            </span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Búsqueda */}
        <div style={{ position: 'relative', width: '260px' }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '14px', color: 'var(--text-muted)',
          }}>🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder="Buscar cliente, OT, técnico..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '34px', fontSize: '13px', height: '36px' }}
          />
        </div>
      </div>

      {/* Tabla */}
      <Card>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          {filtered.length === 0 ? (
            <EmptyState
              icon="🔧"
              title="Sin resultados"
              description="No hay órdenes de trabajo que coincidan con el filtro aplicado."
            />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>OT</th>
                  <th>Cliente</th>
                  <th>Activo</th>
                  <th>Técnico</th>
                  <th>Fecha</th>
                  <th>Inicio</th>
                  <th>Término</th>
                  <th>Estado</th>
                  <th>Costo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ot) => (
                  <tr key={ot.id}>
                    <td>
                      <span className="font-mono" style={{ color: 'var(--brand-400)', fontSize: '13px' }}>
                        {ot.id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '13px' }}>{ot.clientName}</div>
                    </td>
                    <td>
                      <div className="text-sm text-secondary">{ot.assetName}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div className="avatar avatar-sm">
                          {ot.technician.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span style={{ fontSize: '13px' }}>{ot.technician}</span>
                      </div>
                    </td>
                    <td className="text-sm text-secondary">{ot.scheduledDate}</td>
                    <td>
                      {ot.startedAt
                        ? <Badge color="cyan">{ot.startedAt}</Badge>
                        : <span className="text-muted text-sm">—</span>}
                    </td>
                    <td>
                      {ot.completedAt
                        ? <Badge color="green">{ot.completedAt}</Badge>
                        : <span className="text-muted text-sm">—</span>}
                    </td>
                    <td><StatusBadge status={ot.status} /></td>
                    <td className="font-semibold" style={{ fontSize: '13px' }}>
                      {ot.totalCost > 0
                        ? `$${ot.totalCost.toLocaleString('es-CL')}`
                        : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Ver detalle">
                        ⋯
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
