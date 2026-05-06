'use client';

import React, { useState } from 'react';
import { Card, SectionHeader, Badge, EmptyState, StatCard, ProgressBar } from '@/presentation/components/ui';

const mockTeam = [
  { id: 'T1', fullName: 'Juan Pérez', rut: '12.345.678-9', role: 'technician', email: 'jperez@mantos.cl', phone: '+56 9 8765 4321', specialties: ['piscinas', 'bombas'], vehiclePlate: 'HJKL-52', isActive: true, ots: 42, rating: 91, hireDate: '2021-03-01' },
  { id: 'T2', fullName: 'Carlos Muñoz', rut: '13.456.789-0', role: 'technician', email: 'cmunoz@mantos.cl', phone: '+56 9 7654 3210', specialties: ['piscinas', 'filtros', 'química'], vehiclePlate: 'MNPQ-71', isActive: true, ots: 48, rating: 97, hireDate: '2020-06-15' },
  { id: 'T3', fullName: 'Pedro Soto', rut: '14.567.890-1', role: 'technician', email: 'psoto@mantos.cl', phone: '+56 9 6543 2109', specialties: ['piscinas', 'automatización'], vehiclePlate: 'RSTU-33', isActive: true, ots: 44, rating: 95, hireDate: '2021-01-10' },
  { id: 'T4', fullName: 'Miguel Torres', rut: '15.678.901-2', role: 'technician', email: 'mtorres@mantos.cl', phone: '+56 9 5432 1098', specialties: ['piscinas'], vehiclePlate: 'ABCD-90', isActive: true, ots: 29, rating: 72, hireDate: '2023-08-01' },
  { id: 'T5', fullName: 'Roberto Díaz', rut: '16.789.012-3', role: 'technician', email: 'rdiaz@mantos.cl', phone: '+56 9 4321 0987', specialties: ['piscinas', 'equipos'], vehiclePlate: 'EFGH-11', isActive: true, ots: 38, rating: 88, hireDate: '2022-02-14' },
  { id: 'T6', fullName: 'Claudia Vergara', rut: '17.890.123-4', role: 'admin', email: 'cvergara@mantos.cl', phone: '+56 9 3210 9876', specialties: ['administración', 'finanzas'], vehiclePlate: undefined, isActive: true, ots: 0, rating: 0, hireDate: '2019-11-01' },
];

const roleLabel: Record<string, string> = { admin: 'Administrador', supervisor: 'Supervisor', technician: 'Técnico', driver: 'Conductor' };
const roleColor: Record<string, 'blue' | 'cyan' | 'green' | 'yellow'> = { admin: 'blue', supervisor: 'cyan', technician: 'green', driver: 'yellow' };

export function TeamPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = mockTeam.filter(m =>
    search === '' || m.fullName.toLowerCase().includes(search.toLowerCase()) || m.role.includes(search.toLowerCase())
  );
  const selectedMember = mockTeam.find(m => m.id === selected);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Equipo</h1>
          <p className="page-desc">Gestión del personal técnico, roles y rendimiento</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm">📊 Reporte Equipo</button>
          <button className="btn btn-primary btn-sm">+ Agregar Miembro</button>
        </div>
      </div>

      <div className="grid-4 stagger" style={{ marginBottom: '24px' }}>
        <StatCard label="Personal Activo" value={mockTeam.filter(m => m.isActive).length} icon="👥" color="blue" />
        <StatCard label="Técnicos" value={mockTeam.filter(m => m.role === 'technician').length} icon="🔧" color="cyan" />
        <StatCard label="OTs Este Mes" value={mockTeam.reduce((s, m) => s + m.ots, 0)} icon="📋" color="green" />
        <StatCard label="Rating Promedio" value={`${Math.round(mockTeam.filter(m => m.rating > 0).reduce((s, m) => s + m.rating, 0) / mockTeam.filter(m => m.rating > 0).length)}%`} icon="⭐" color="yellow" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap: '20px' }}>
        <Card>
          <SectionHeader
            title="Personal"
            subtitle={`${mockTeam.length} miembros registrados`}
            action={
              <input type="text" className="form-input" placeholder="Buscar..." value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ fontSize: '13px', height: '34px', width: '200px' }} />
            }
          />
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            {filtered.length === 0 ? (
              <EmptyState icon="👥" title="Sin resultados" description="No hay miembros que coincidan." />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Especialidades</th>
                    <th>Vehículo</th>
                    <th>OTs Mes</th>
                    <th>Rating</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => (
                    <tr key={m.id} onClick={() => setSelected(selected === m.id ? null : m.id)}
                      style={{ cursor: 'pointer', background: selected === m.id ? 'rgba(59,130,246,0.08)' : undefined }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar avatar-sm" style={{ fontSize: '12px' }}>{m.fullName.split(' ').map(n => n[0]).join('')}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{m.fullName}</div>
                            <div className="text-xs text-muted">{m.rut}</div>
                          </div>
                        </div>
                      </td>
                      <td><Badge color={roleColor[m.role]}>{roleLabel[m.role]}</Badge></td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {m.specialties.slice(0, 2).map(s => <Badge key={s} color="gray">{s}</Badge>)}
                          {m.specialties.length > 2 && <Badge color="gray">+{m.specialties.length - 2}</Badge>}
                        </div>
                      </td>
                      <td>{m.vehiclePlate ? <span className="font-mono text-sm" style={{ color: 'var(--brand-400)' }}>{m.vehiclePlate}</span> : <span className="text-muted text-sm">—</span>}</td>
                      <td className="font-semibold">{m.ots > 0 ? m.ots : '—'}</td>
                      <td>
                        {m.rating > 0
                          ? <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '50px' }}><ProgressBar value={m.rating} height={4} /></div>
                              <span className="text-sm" style={{ color: m.rating >= 90 ? 'var(--success-400)' : 'var(--warning-400)' }}>{m.rating}%</span>
                            </div>
                          : <span className="text-muted text-sm">—</span>}
                      </td>
                      <td><Badge color={m.isActive ? 'green' : 'red'} dot>{m.isActive ? 'Activo' : 'Inactivo'}</Badge></td>
                      <td><button className="btn btn-ghost btn-sm btn-icon" onClick={e => e.stopPropagation()}>✏️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {selectedMember && (
          <Card className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="avatar avatar-lg">{selectedMember.fullName.split(' ').map(n => n[0]).join('')}</div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{selectedMember.fullName}</div>
                  <div className="text-sm text-secondary">{selectedMember.rut}</div>
                  <Badge color={roleColor[selectedMember.role]}>{roleLabel[selectedMember.role]}</Badge>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-border)', padding: '14px', marginBottom: '16px' }}>
              {[
                { icon: '📧', val: selectedMember.email },
                { icon: '📞', val: selectedMember.phone },
                { icon: '🚐', val: selectedMember.vehiclePlate ?? 'Sin vehículo asignado' },
                { icon: '📅', val: `Desde: ${new Date(selectedMember.hireDate).toLocaleDateString('es-CL')}` },
              ].map(info => (
                <div key={info.val} style={{ display: 'flex', gap: '10px', padding: '5px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span>{info.icon}</span><span>{info.val}</span>
                </div>
              ))}
            </div>

            {selectedMember.rating > 0 && (
              <>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '12px' }}>Rendimiento del Mes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  {[
                    { label: 'OTs Completadas', value: selectedMember.ots, max: 50 },
                    { label: 'Rating General', value: selectedMember.rating, max: 100, suffix: '%' },
                  ].map(stat => (
                    <div key={stat.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span className="text-sm">{stat.label}</span>
                        <span className="font-semibold text-sm">{stat.value}{stat.suffix ?? ''}</span>
                      </div>
                      <ProgressBar value={Math.round((stat.value / stat.max) * 100)} height={6} />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>Especialidades</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {selectedMember.specialties.map(s => <Badge key={s} color="cyan">{s}</Badge>)}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
