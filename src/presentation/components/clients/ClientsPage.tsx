'use client';

import React, { useState } from 'react';
import {
  Card, SectionHeader, Badge, EmptyState,
} from '@/presentation/components/ui';

const mockClients = [
  {
    id: 'CLI-001', name: 'Club de Campo Las Araucarias', rut: '76.345.123-4',
    contact: 'Rodrigo Herrera', email: 'rherrera@araucarias.cl', phone: '+56 9 8765 4321',
    address: 'Camino Las Araucarias 1250, Lo Barnechea',
    assets: 2, lastMaintenance: '28/04/2026', status: 'active',
  },
  {
    id: 'CLI-002', name: 'Condominio Los Pinos', rut: '72.100.456-2',
    contact: 'Patricia Saavedra', email: 'adm@lospinos.cl', phone: '+56 9 7654 3210',
    address: 'Av. Las Condes 8900, Las Condes',
    assets: 1, lastMaintenance: '30/04/2026', status: 'active',
  },
  {
    id: 'CLI-003', name: 'Hotel Costanera', rut: '96.123.789-5',
    contact: 'Gerencia General', email: 'gcia@hotelcostanera.cl', phone: '+56 2 2988 7600',
    address: 'Av. Costanera Norte 1522, Providencia',
    assets: 3, lastMaintenance: '30/04/2026', status: 'active',
  },
  {
    id: 'CLI-004', name: 'Residencial El Bosque', rut: '75.678.321-8',
    contact: 'Jorge Fuentealba', email: 'jorge.f@elbosque.cl', phone: '+56 9 6543 2109',
    address: 'Pasaje El Bosque 44, La Reina',
    assets: 1, lastMaintenance: '15/03/2026', status: 'attention',
  },
];

export function ClientsPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = mockClients.filter((c) =>
    search === '' ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.rut.includes(search) ||
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  const selectedClient = mockClients.find(c => c.id === selected);

  return (
    <div className="animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes y Activos</h1>
          <p className="page-desc">Gestión de clientes, activos y códigos QR de identificación</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm">📱 Levantamiento Móvil</button>
          <button className="btn btn-primary btn-sm">+ Agregar Cliente</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: '20px', transition: 'all 0.3s ease' }}>

        {/* Lista clientes */}
        <Card>
          <SectionHeader
            title="Clientes Registrados"
            subtitle={`${mockClients.length} clientes en el sistema`}
            action={
              <div style={{ position: 'relative', width: '240px' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--text-muted)' }}>🔍</span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Buscar cliente o RUT..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: '30px', fontSize: '13px', height: '34px' }}
                />
              </div>
            }
          />

          {filtered.length === 0 ? (
            <EmptyState icon="🏢" title="Sin resultados" description="No hay clientes que coincidan con la búsqueda." />
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Contacto</th>
                    <th>Activos</th>
                    <th>Último Mant.</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelected(selected === c.id ? null : c.id)}
                      style={{
                        cursor: 'pointer',
                        background: selected === c.id ? 'rgba(59,130,246,0.08)' : undefined,
                      }}
                    >
                      <td>
                        <span className="font-mono text-sm" style={{ color: 'var(--brand-400)' }}>{c.id}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: '13px' }}>{c.name}</div>
                        <div className="text-xs text-secondary">{c.rut}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px' }}>{c.contact}</div>
                        <div className="text-xs text-muted">{c.email}</div>
                      </td>
                      <td>
                        <Badge color="blue">{c.assets} activo{c.assets !== 1 ? 's' : ''}</Badge>
                      </td>
                      <td className="text-sm text-secondary">{c.lastMaintenance}</td>
                      <td>
                        <Badge color={c.status === 'active' ? 'green' : 'yellow'} dot>
                          {c.status === 'active' ? 'Activo' : 'Atención'}
                        </Badge>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={e => e.stopPropagation()}>
                          ⋯
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Panel Lateral de Activos */}
        {selectedClient && (
          <Card className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {selectedClient.name}
                </div>
                <div className="text-sm text-secondary">{selectedClient.rut}</div>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelected(null)}>✕</button>
            </div>

            {/* Info de contacto */}
            <div style={{
              background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-border)', padding: '14px', marginBottom: '16px',
            }}>
              {[
                { icon: '👤', label: selectedClient.contact },
                { icon: '📧', label: selectedClient.email },
                { icon: '📞', label: selectedClient.phone },
                { icon: '📍', label: selectedClient.address },
              ].map((info) => (
                <div key={info.label} style={{
                  display: 'flex', gap: '10px', padding: '5px 0',
                  fontSize: '13px', color: 'var(--text-secondary)',
                }}>
                  <span>{info.icon}</span>
                  <span>{info.label}</span>
                </div>
              ))}
            </div>

            {/* Activos */}
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '10px', color: 'var(--text-primary)' }}>
              Activos Registrados
            </div>
            {Array.from({ length: selectedClient.assets }).map((_, i) => (
              <div key={i} style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--bg-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                marginBottom: '10px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                    🏊 Piscina {i === 0 ? 'Principal' : i === 1 ? 'Temperada' : 'Infantil'}
                  </div>
                  {/* QR */}
                  <div style={{
                    width: '36px', height: '36px',
                    background: 'white', borderRadius: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', cursor: 'pointer',
                  }} title="Descargar QR">
                    ▦
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <Badge color="gray">Volumen: 50m³</Badge>
                  <Badge color="gray">Motor: Hayward</Badge>
                  <Badge color="gray">Filtro: Arena</Badge>
                  <Badge color="blue">Frec. 7 días</Badge>
                </div>
              </div>
            ))}

            <button className="btn btn-secondary w-full" style={{ marginTop: '6px' }}>
              + Agregar Activo
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}
