'use client';

/**
 * TeamPage — Módulo de Equipo.
 *
 * Lee y escribe en la colección `team_members` de Firestore (multi-tenant).
 * Permite agregar, editar y desactivar miembros.
 * Calcula KPIs de rendimiento desde maintenance_records.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, SectionHeader, Badge, EmptyState, StatCard, ProgressBar } from '@/presentation/components/ui';
import { TeamMember, TeamRole } from '@/core/domain/TeamMember';
import { Vehicle } from '@/core/domain/Vehicle';
import { repositories } from '@/infrastructure/firebase/RepositoryFactory';

// ── constantes ────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<TeamRole, string> = {
  admin: 'Administrador', supervisor: 'Supervisor', technician: 'Técnico', driver: 'Conductor',
};
const ROLE_COLOR: Record<TeamRole, 'blue' | 'cyan' | 'green' | 'yellow'> = {
  admin: 'blue', supervisor: 'cyan', technician: 'green', driver: 'yellow',
};

const SPECIALTY_OPTIONS = [
  'piscinas', 'hvac', 'seguridad electrónica', 'incendio',
  'bombas', 'filtros', 'química', 'automatización',
  'tableros', 'motores', 'generadores', 'administración', 'otro',
];

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// ── Formulario de miembro (nuevo / editar) ────────────────────────────────────

interface MemberFormProps {
  initial?: TeamMember;
  vehicles: Vehicle[];
  onSave: (data: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onClose: () => void;
}

function MemberForm({ initial, vehicles, onSave, onClose }: MemberFormProps) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [rut, setRut] = useState(initial?.rut ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [role, setRole] = useState<TeamRole>(initial?.role ?? 'technician');
  const [vehicleId, setVehicleId] = useState(initial?.vehicleId ?? '');
  const [specialties, setSpecialties] = useState<string[]>(initial?.specialties ?? []);
  const [hireDate, setHireDate] = useState(
    initial?.hireDate
      ? new Date(initial.hireDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleSpecialty = (s: string) => {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !rut.trim()) { setError('Nombre y RUT son obligatorios.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({
        ...(initial?.id ? { id: initial.id } : {}),
        fullName: fullName.trim(),
        rut: rut.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        vehicleId: vehicleId || undefined,
        specialties,
        hireDate: new Date(hireDate + 'T12:00:00'),
        isActive,
        tenantId: initial?.tenantId,
        uid: initial?.uid,
        photoUrl: initial?.photoUrl,
      });
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error al guardar');
    } finally { setSaving(false); }
  };

  const isEdit = !!initial;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '16px',
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: '520px', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '17px' }}>
            {isEdit ? '✏️ Editar miembro' : '👤 Nuevo miembro del equipo'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px', fontSize: '13px', color: 'var(--error-400)' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nombre completo *</label>
              <input className="form-input" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Ej: Juan Pérez González" autoFocus required />
            </div>
            <div>
              <label className="form-label">RUT *</label>
              <input className="form-input" value={rut} onChange={e => setRut(e.target.value)}
                placeholder="12.345.678-9" required />
            </div>
            <div>
              <label className="form-label">Rol</label>
              <select className="form-input" value={role} onChange={e => setRole(e.target.value as TeamRole)}>
                {(Object.keys(ROLE_LABEL) as TeamRole[]).map(r => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="correo@empresa.cl" />
            </div>
            <div>
              <label className="form-label">Teléfono</label>
              <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+56 9 8765 4321" />
            </div>
            <div>
              <label className="form-label">Fecha de ingreso</label>
              <input className="form-input" type="date" value={hireDate} onChange={e => setHireDate(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Vehículo asignado</label>
              <select className="form-input" value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
                <option value="">— Sin vehículo —</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Especialidades */}
          <div>
            <label className="form-label">Especialidades</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {SPECIALTY_OPTIONS.map(s => {
                const active = specialties.includes(s);
                return (
                  <button key={s} type="button" onClick={() => toggleSpecialty(s)} style={{
                    padding: '4px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${active ? 'var(--brand-500)' : 'var(--bg-border)'}`,
                    background: active ? 'rgba(59,130,246,0.12)' : 'var(--bg-surface)',
                    color: active ? 'var(--brand-400)' : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estado activo (solo al editar) */}
          {isEdit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label className="form-label" style={{ margin: 0 }}>Estado</label>
              <button type="button" onClick={() => setIsActive(v => !v)} style={{
                padding: '4px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${isActive ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: isActive ? '#10b981' : 'var(--error-400)',
              }}>
                {isActive ? '● Activo' : '● Inactivo'}
              </button>
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', gap: '10px', flexShrink: 0 }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={saving || !fullName.trim() || !rut.trim()}
            onClick={handleSubmit as unknown as React.MouseEventHandler}
          >
            {saving ? '⏳ Guardando...' : isEdit ? '💾 Guardar cambios' : '✅ Agregar miembro'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<TeamRole | 'all'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | undefined>(undefined);
  const [perf, setPerf] = useState<Record<string, { completed: number; total: number; avgTime: number }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [team, veh] = await Promise.all([
        repositories.team.getAll(),
        repositories.vehicles.getAll(),
      ]);
      setMembers(team);
      setVehicles(veh);
      // KPIs del mes actual para técnicos
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const perfMap: Record<string, { completed: number; total: number; avgTime: number }> = {};
      await Promise.all(
        team.filter(m => m.role === 'technician').map(async m => {
          try { perfMap[m.id] = await repositories.team.getPerformance(m.id, from, to); }
          catch { /* sin historial aún */ }
        })
      );
      setPerf(perfMap);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const filtered = members.filter(m => {
    const matchSearch = !search ||
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      m.rut.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || m.role === filterRole;
    const matchActive = filterActive === 'all' ? true : filterActive === 'active' ? m.isActive : !m.isActive;
    return matchSearch && matchRole && matchActive;
  });

  // ── KPI totales ──────────────────────────────────────────────────────────────
  const activeCount = members.filter(m => m.isActive).length;
  const techCount   = members.filter(m => m.role === 'technician').length;
  const totalOTs    = Object.values(perf).reduce((s, p) => s + p.completed, 0);
  const rates       = Object.values(perf).filter(p => p.total > 0).map(p => Math.round((p.completed / p.total) * 100));
  const avgRate     = rates.length > 0 ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0;

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleCreate = async (data: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const { id: _id, ...rest } = data; void _id;
    const created = await repositories.team.create(rest);
    setMembers(prev => [...prev, created].sort((a, b) => a.fullName.localeCompare(b.fullName)));
  };

  const handleUpdate = async (data: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    if (!data.id) return;
    const { id, ...rest } = data;
    const updated = await repositories.team.update(id, rest);
    setMembers(prev => prev.map(m => m.id === id ? updated : m));
    if (selected?.id === id) setSelected(updated);
  };

  const handleToggleActive = async (member: TeamMember) => {
    const updated = await repositories.team.update(member.id, { isActive: !member.isActive });
    setMembers(prev => prev.map(m => m.id === member.id ? updated : m));
    if (selected?.id === member.id) setSelected(updated);
  };

  const openEdit = (m: TeamMember, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMember(m);
    setShowForm(true);
  };

  const openNew = () => {
    setEditingMember(undefined);
    setShowForm(true);
  };

  const vehicleFor = (id?: string) => vehicles.find(v => v.id === id);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Equipo</h1>
          <p className="page-desc">Personal técnico, roles y rendimiento del mes</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Agregar miembro</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-4 stagger" style={{ marginBottom: '24px' }}>
        <StatCard label="Personal activo" value={loading ? '…' : activeCount} icon="👥" color="blue" />
        <StatCard label="Técnicos" value={loading ? '…' : techCount} icon="🔧" color="cyan" />
        <StatCard label="OTs este mes" value={loading ? '…' : totalOTs} icon="📋" color="green" />
        <StatCard label="Tasa completitud" value={loading ? '…' : avgRate > 0 ? `${avgRate}%` : '—'} icon="⭐" color="yellow" />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="form-input"
          placeholder="Buscar nombre, RUT o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '240px', fontSize: '13px' }}
        />
        <select className="form-input" value={filterRole}
          onChange={e => setFilterRole(e.target.value as TeamRole | 'all')}
          style={{ width: 'auto', fontSize: '13px' }}>
          <option value="all">Todos los roles</option>
          {(Object.keys(ROLE_LABEL) as TeamRole[]).map(r => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
          {(['active', 'all', 'inactive'] as const).map(f => (
            <button key={f} onClick={() => setFilterActive(f)} style={{
              padding: '4px 12px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600,
              background: filterActive === f ? 'var(--bg-card)' : 'transparent',
              color: filterActive === f ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}>
              {f === 'active' ? 'Activos' : f === 'inactive' ? 'Inactivos' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* Layout lista / panel detalle */}
      <div className={`list-detail-grid${selected ? ' has-panel' : ''}`}>
        <Card>
          <SectionHeader
            title="Personal"
            subtitle={`${filtered.length} resultado${filtered.length !== 1 ? 's' : ''} · ${members.length} total`}
          />
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Cargando equipo...</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="👥"
              title={members.length === 0 ? 'Sin personal registrado' : 'Sin resultados'}
              description={members.length === 0
                ? 'Agrega el primer miembro con el botón "+ Agregar miembro".'
                : 'Ajusta los filtros de búsqueda.'}
            />
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Especialidades</th>
                    <th>Vehículo</th>
                    <th>OTs mes</th>
                    <th>Completitud</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => {
                    const p = perf[m.id];
                    const rate = p && p.total > 0 ? Math.round((p.completed / p.total) * 100) : null;
                    const veh  = vehicleFor(m.vehicleId);
                    return (
                      <tr key={m.id}
                        onClick={() => setSelected(selected?.id === m.id ? null : m)}
                        style={{
                          cursor: 'pointer',
                          background: selected?.id === m.id ? 'rgba(59,130,246,0.08)' : undefined,
                          opacity: m.isActive ? 1 : 0.6,
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="avatar avatar-sm" style={{ fontSize: '12px' }}>{initials(m.fullName)}</div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '13px' }}>{m.fullName}</div>
                              <div className="text-xs text-muted">{m.rut}</div>
                            </div>
                          </div>
                        </td>
                        <td><Badge color={ROLE_COLOR[m.role]}>{ROLE_LABEL[m.role]}</Badge></td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {m.specialties.slice(0, 2).map(s => <Badge key={s} color="gray">{s}</Badge>)}
                            {m.specialties.length > 2 && <Badge color="gray">+{m.specialties.length - 2}</Badge>}
                          </div>
                        </td>
                        <td>
                          {veh
                            ? <span className="font-mono text-sm" style={{ color: 'var(--brand-400)' }}>{veh.plate}</span>
                            : <span className="text-muted text-sm">—</span>}
                        </td>
                        <td className="font-semibold">{p ? p.completed : '—'}</td>
                        <td>
                          {rate !== null
                            ? <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '50px' }}><ProgressBar value={rate} height={4} /></div>
                                <span className="text-sm" style={{
                                  color: rate >= 90 ? 'var(--success-400)' : rate >= 70 ? 'var(--warning-400)' : 'var(--error-400)',
                                }}>{rate}%</span>
                              </div>
                            : <span className="text-muted text-sm">—</span>}
                        </td>
                        <td><Badge color={m.isActive ? 'green' : 'red'} dot>{m.isActive ? 'Activo' : 'Inactivo'}</Badge></td>
                        <td>
                          <button className="btn btn-ghost btn-sm btn-icon" title="Editar"
                            onClick={e => openEdit(m, e)}>✏️</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Panel lateral */}
        {selected && (
          <Card className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="avatar avatar-lg">{initials(selected.fullName)}</div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{selected.fullName}</div>
                  <div className="text-sm text-secondary">{selected.rut}</div>
                  <Badge color={ROLE_COLOR[selected.role]}>{ROLE_LABEL[selected.role]}</Badge>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelected(null)}>✕</button>
            </div>

            {/* Contacto */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-border)', padding: '14px', marginBottom: '16px' }}>
              {[
                { icon: '📧', label: selected.email || '—' },
                { icon: '📞', label: selected.phone || '—' },
                { icon: '🚐', label: vehicleFor(selected.vehicleId)?.plate ?? 'Sin vehículo' },
                { icon: '📅', label: selected.hireDate ? `Desde: ${new Date(selected.hireDate).toLocaleDateString('es-CL')}` : '—' },
              ].map(info => (
                <div key={info.label} style={{ display: 'flex', gap: '10px', padding: '5px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span>{info.icon}</span><span>{info.label}</span>
                </div>
              ))}
            </div>

            {/* KPIs del mes */}
            {perf[selected.id] && (
              <>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '10px' }}>Rendimiento del mes</div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  {[
                    { label: 'Asignadas', val: perf[selected.id].total },
                    { label: 'Completadas', val: perf[selected.id].completed },
                    { label: 'T. promedio', val: perf[selected.id].avgTime > 0 ? `${Math.round(perf[selected.id].avgTime)}min` : '—' },
                  ].map(k => (
                    <div key={k.label} style={{
                      flex: 1, textAlign: 'center', background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-sm)', padding: '8px 4px', border: '1px solid var(--bg-border)',
                    }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{k.val}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{k.label}</div>
                    </div>
                  ))}
                </div>
                {perf[selected.id].total > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Tasa de completitud</span>
                      <span style={{ fontWeight: 700 }}>
                        {Math.round((perf[selected.id].completed / perf[selected.id].total) * 100)}%
                      </span>
                    </div>
                    <ProgressBar value={Math.round((perf[selected.id].completed / perf[selected.id].total) * 100)} height={6} />
                  </div>
                )}
              </>
            )}

            {/* Especialidades */}
            {selected.specialties.length > 0 && (
              <>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>Especialidades</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  {selected.specialties.map(s => <Badge key={s} color="cyan">{s}</Badge>)}
                </div>
              </>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={e => openEdit(selected, e)}>
                ✏️ Editar
              </button>
              <button
                className="btn btn-sm"
                style={{
                  flex: 1, cursor: 'pointer',
                  background: selected.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                  border: `1px solid ${selected.isActive ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  color: selected.isActive ? 'var(--error-400)' : '#10b981',
                }}
                onClick={() => handleToggleActive(selected)}
              >
                {selected.isActive ? '🚫 Desactivar' : '✅ Activar'}
              </button>
            </div>
          </Card>
        )}
      </div>

      {/* Modal formulario */}
      {showForm && (
        <MemberForm
          initial={editingMember}
          vehicles={vehicles}
          onSave={editingMember ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditingMember(undefined); }}
        />
      )}
    </div>
  );
}
