'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, SectionHeader, Badge, StatCard, EmptyState } from '@/presentation/components/ui';
import { Route, RouteStop, Vehicle, RecurringSchedule, FrequencyType } from '@/core/domain/Vehicle';
import { repositories } from '@/infrastructure/firebase/RepositoryFactory';
import { GetDailyRoutesUseCase } from '@/use-cases/logistics/GetDailyRoutesUseCase';
import { CreateRouteUseCase } from '@/use-cases/logistics/CreateRouteUseCase';
import { ManageRecurringScheduleUseCase } from '@/use-cases/logistics/ManageRecurringScheduleUseCase';

// ── use cases ─────────────────────────────────────────────────────────────────
const getDailyRoutes = new GetDailyRoutesUseCase(repositories.vehicles);
const createRouteUC  = new CreateRouteUseCase(repositories.vehicles);
const scheduleUC     = new ManageRecurringScheduleUseCase(repositories.vehicles);

// ── helpers ───────────────────────────────────────────────────────────────────
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const FREQ_LABELS: Record<FrequencyType, string> = {
  weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual', custom: 'Personalizado',
};
const STATUS_COLOR: Record<Route['status'], string> = {
  planned: 'blue', in_progress: 'yellow', completed: 'green',
};
const STATUS_LABEL: Record<Route['status'], string> = {
  planned: 'Planificada', in_progress: 'En ruta', completed: 'Completada',
};

function dateToInputValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── StopItem ──────────────────────────────────────────────────────────────────

function StopItem({ stop }: { stop: RouteStop }) {
  return (
    <div style={{
      display: 'flex', gap: '12px', alignItems: 'flex-start',
      padding: '10px 0', borderBottom: '1px solid var(--bg-border)',
    }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
        background: stop.status === 'completed' ? 'var(--success-500)'
          : stop.status === 'in_progress' ? 'var(--warning-500)' : 'var(--bg-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 700, color: 'white',
      }}>
        {stop.status === 'completed' ? '✓' : stop.status === 'skipped' ? '✕' : stop.order}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' }}>
          {stop.clientName}
        </div>
        <div className="text-xs text-secondary" style={{ marginBottom: '4px' }}>
          📍 {stop.address}, {stop.commune}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span className="text-xs text-muted">👤 {stop.technicianName}</span>
          <span className="text-xs text-muted">⏱ {stop.estimatedDurationMin} min</span>
          {stop.scheduledTime && <span className="text-xs text-muted">🕐 {stop.scheduledTime}</span>}
        </div>
      </div>
      <Badge color={
        stop.status === 'completed' ? 'green'
          : stop.status === 'in_progress' ? 'yellow'
          : stop.status === 'skipped' ? 'red' : 'gray'
      } dot>
        {stop.status === 'pending' ? 'Pendiente'
          : stop.status === 'in_progress' ? 'En curso'
          : stop.status === 'completed' ? 'Listo' : 'Omitida'}
      </Badge>
    </div>
  );
}

// ── RouteCard ─────────────────────────────────────────────────────────────────

function RouteCard({ route, selected, onClick }: { route: Route; selected: boolean; onClick: () => void }) {
  const completed = route.stops.filter(s => s.status === 'completed').length;
  const pct = route.stops.length > 0 ? Math.round((completed / route.stops.length) * 100) : 0;
  const communes = [...new Set(route.stops.map(s => s.commune))];

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? 'rgba(59,130,246,0.07)' : 'var(--gradient-card)',
        border: `1px solid ${selected ? 'rgba(59,130,246,0.35)' : 'var(--bg-border)'}`,
        borderRadius: 'var(--radius-md)', padding: '16px', cursor: 'pointer',
        transition: 'all var(--transition-fast)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '22px' }}>🚐</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>{route.vehiclePlate}</div>
            <div className="text-xs text-secondary">{route.driverName}</div>
          </div>
        </div>
        <Badge color={STATUS_COLOR[route.status] as 'blue' | 'yellow' | 'green'} dot>
          {STATUS_LABEL[route.status]}
        </Badge>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span className="text-xs text-secondary">Avance</span>
          <span className="text-xs font-semibold">{completed}/{route.stops.length} paradas</span>
        </div>
        <div style={{ height: '5px', background: 'var(--bg-border)', borderRadius: '100px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: pct === 100 ? 'var(--success-500)' : 'var(--gradient-brand)',
            borderRadius: '100px', transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {communes.slice(0, 4).map(c => (
          <span key={c} className="text-xs" style={{
            background: 'var(--bg-surface)', border: '1px solid var(--bg-border)',
            borderRadius: 'var(--radius-sm)', padding: '2px 6px',
          }}>{c}</span>
        ))}
        {communes.length > 4 && <span className="text-xs text-muted">+{communes.length - 4}</span>}
      </div>
    </div>
  );
}

// ── Modal: Nueva Ruta ─────────────────────────────────────────────────────────

function NewRouteModal({ vehicles, date, onClose, onCreate }: {
  vehicles: Vehicle[]; date: Date;
  onClose: () => void; onCreate: (r: Route) => void;
}) {
  const [vehicleId, setVehicleId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const selectedVehicle = vehicles.find(v => v.id === vehicleId);

  // Pre-fill driver name from vehicle
  useEffect(() => {
    if (selectedVehicle?.assignedDriverName) setDriverName(selectedVehicle.assignedDriverName);
  }, [selectedVehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !driverName) return;
    setLoading(true);
    try {
      const route = await createRouteUC.execute({
        vehicleId, vehiclePlate: selectedVehicle?.plate ?? '',
        driverId: selectedVehicle?.assignedDriverId ?? vehicleId,
        driverName, date, notes: notes || undefined,
      });
      onCreate(route);
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
        padding: '28px', width: '100%', maxWidth: '460px', boxShadow: 'var(--shadow-xl)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Nueva Ruta</h2>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="form-label">Vehículo *</label>
            <select className="form-select" value={vehicleId} onChange={e => setVehicleId(e.target.value)} required>
              <option value="">Seleccionar vehículo</option>
              {vehicles.filter(v => v.status === 'active').map(v => (
                <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Conductor / Técnico principal *</label>
            <input className="form-input" value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Nombre" required />
          </div>
          <div>
            <label className="form-label">Notas</label>
            <textarea className="form-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Creando...' : 'Crear Ruta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: Nueva Frecuencia ────────────────────────────────────────────────────

function NewScheduleModal({ vehicles, onClose, onCreate }: {
  vehicles: Vehicle[];
  onClose: () => void;
  onCreate: (s: RecurringSchedule) => void;
}) {
  const [form, setForm] = useState({
    clientId: '', clientName: '', address: '', commune: '',
    assignedTechnicianId: '', assignedTechnicianName: '',
    vehicleId: '', frequency: 'weekly' as FrequencyType,
    daysOfWeek: [] as number[], estimatedDurationMin: 60, notes: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const toggleDay = (d: number) =>
    set('daysOfWeek', form.daysOfWeek.includes(d)
      ? form.daysOfWeek.filter(x => x !== d)
      : [...form.daysOfWeek, d].sort());

  const selectedVehicle = vehicles.find(v => v.id === form.vehicleId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName || !form.vehicleId || form.daysOfWeek.length === 0) return;
    setLoading(true);
    try {
      const s = await scheduleUC.create({
        ...form,
        vehiclePlate: selectedVehicle?.plate ?? '',
        assetId: undefined, assetName: undefined,
      });
      onCreate(s);
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
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Nueva Frecuencia Programada</h2>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="form-label">Cliente *</label>
            <input className="form-input" value={form.clientName} onChange={e => set('clientName', e.target.value)} placeholder="Nombre del cliente" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label">Dirección *</label>
              <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Calle 123" required />
            </div>
            <div>
              <label className="form-label">Comuna *</label>
              <input className="form-input" value={form.commune} onChange={e => set('commune', e.target.value)} placeholder="Las Condes" required />
            </div>
          </div>
          <div>
            <label className="form-label">Técnico asignado *</label>
            <input className="form-input" value={form.assignedTechnicianName} onChange={e => set('assignedTechnicianName', e.target.value)} placeholder="Nombre del técnico" required />
          </div>
          <div>
            <label className="form-label">Vehículo *</label>
            <select className="form-select" value={form.vehicleId} onChange={e => set('vehicleId', e.target.value)} required>
              <option value="">Seleccionar vehículo</option>
              {vehicles.filter(v => v.status === 'active').map(v => (
                <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label">Frecuencia</label>
              <select className="form-select" value={form.frequency} onChange={e => set('frequency', e.target.value as FrequencyType)}>
                {(Object.keys(FREQ_LABELS) as FrequencyType[]).map(f => (
                  <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Duración estimada (min)</label>
              <input className="form-input" type="number" min={15} step={5}
                value={form.estimatedDurationMin}
                onChange={e => set('estimatedDurationMin', Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="form-label">Días de visita *</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {DAY_NAMES.map((d, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)} style={{
                  padding: '5px 10px', borderRadius: 'var(--radius-sm)', fontSize: '12px',
                  fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: form.daysOfWeek.includes(i) ? 'var(--brand-500)' : 'var(--bg-surface)',
                  color: form.daysOfWeek.includes(i) ? 'white' : 'var(--text-secondary)',
                }}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">Notas</label>
            <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Frecuencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PlanningTab: Vista de planificación anticipada ────────────────────────────

function PlanningTab({ schedules, vehicles }: { schedules: RecurringSchedule[]; vehicles: Vehicle[] }) {
  const today = new Date();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [baseDate, setBaseDate] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay() + 1); // Lunes de la semana actual
    return d;
  });

  // Genera los días del período visible
  const days = React.useMemo(() => {
    const result: Date[] = [];
    const count = viewMode === 'week' ? 7 : 28;
    for (let i = 0; i < count; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      result.push(d);
    }
    return result;
  }, [baseDate, viewMode]);

  // Calcula paradas esperadas por día según frecuencias activas
  const stopsByDay = React.useMemo(() => {
    const map = new Map<string, RecurringSchedule[]>();
    days.forEach(day => {
      const key = dateToInputValue(day);
      const dayOfWeek = day.getDay(); // 0=Dom, 1=Lun...
      const expected = schedules.filter(s => s.daysOfWeek.includes(dayOfWeek));
      map.set(key, expected);
    });
    return map;
  }, [days, schedules]);

  const navigate = (dir: -1 | 1) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + dir * (viewMode === 'week' ? 7 : 28));
    setBaseDate(d);
  };

  const fmtDay = (d: Date) => d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
  const isToday = (d: Date) => dateToInputValue(d) === dateToInputValue(today);

  // Resumen de la semana/mes
  const totalPlanned = days.reduce((sum, d) => sum + (stopsByDay.get(dateToInputValue(d))?.length ?? 0), 0);
  const vehiclesInUse = new Set(schedules.map(s => s.vehicleId)).size;

  return (
    <div>
      {/* Controles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
          {(['week', 'month'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)} style={{
              padding: '5px 14px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600,
              background: viewMode === m ? 'var(--bg-card)' : 'transparent',
              color: viewMode === m ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}>{m === 'week' ? 'Semana' : '4 semanas'}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>◀</button>
          <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '200px', textAlign: 'center' }}>
            {fmtDay(days[0])} — {fmtDay(days[days.length - 1])}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(1)}>▶</button>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => {
          const d = new Date(today);
          d.setDate(d.getDate() - d.getDay() + 1);
          setBaseDate(d);
        }}>Hoy</button>
      </div>

      {/* KPIs del período */}
      <div className="grid-4 stagger" style={{ marginBottom: '20px' }}>
        <StatCard label={viewMode === 'week' ? 'Servicios esta semana' : 'Servicios 4 semanas'} value={totalPlanned} icon="🔧" color="blue" />
        <StatCard label="Clientes activos" value={schedules.length} icon="🏢" color="cyan" />
        <StatCard label="Vehículos en uso" value={vehiclesInUse} icon="🚐" color="yellow" />
        <StatCard label="Técnicos asignados" value={new Set(schedules.map(s => s.assignedTechnicianId)).size} icon="👤" color="green" />
      </div>

      {/* Alerta si no hay frecuencias */}
      {schedules.length === 0 && (
        <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 'var(--radius-md)', padding: '14px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          ⚠️ No hay frecuencias programadas. Ve al tab <strong>Frecuencias</strong> para configurar la recurrencia de cada cliente.
        </div>
      )}

      {/* Grilla de días */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${viewMode === 'week' ? 7 : 4}, minmax(0, 1fr))`, gap: '8px' }}>
        {days.map(day => {
          const key = dateToInputValue(day);
          const stops = stopsByDay.get(key) ?? [];
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          return (
            <div key={key} style={{
              border: `1px solid ${isToday(day) ? 'rgba(59,130,246,0.5)' : 'var(--bg-border)'}`,
              borderRadius: 'var(--radius-md)',
              background: isToday(day) ? 'rgba(59,130,246,0.05)' : isWeekend ? 'var(--bg-surface)' : 'var(--bg-card)',
              padding: '8px',
              minHeight: '100px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', color: isToday(day) ? 'var(--brand-400)' : isWeekend ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                {day.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' })}
                {isToday(day) && <span style={{ marginLeft: '4px', fontSize: '10px', background: 'var(--brand-500)', color: 'white', borderRadius: '4px', padding: '1px 4px' }}>Hoy</span>}
              </div>
              {stops.length === 0 ? (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', paddingTop: '16px' }}>—</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {stops.slice(0, viewMode === 'week' ? 8 : 4).map(s => (
                    <div key={s.id} style={{
                      fontSize: '10px', padding: '2px 5px',
                      borderRadius: '4px', background: 'rgba(59,130,246,0.12)',
                      color: 'var(--brand-300)', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }} title={`${s.clientName} · ${s.assignedTechnicianName} · ${s.estimatedDurationMin}min`}>
                      {s.clientName}
                    </div>
                  ))}
                  {stops.length > (viewMode === 'week' ? 8 : 4) && (
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      +{stops.length - (viewMode === 'week' ? 8 : 4)} más
                    </div>
                  )}
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', textAlign: 'right' }}>
                    {stops.length} servicio{stops.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detalle por técnico/vehículo */}
      {schedules.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <SectionHeader title="Asignaciones del período" subtitle="Carga de trabajo por técnico y vehículo" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', marginTop: '12px' }}>
            {Array.from(new Set(schedules.map(s => s.assignedTechnicianId))).map(techId => {
              const techSchedules = schedules.filter(s => s.assignedTechnicianId === techId);
              const techName = techSchedules[0]?.assignedTechnicianName ?? techId;
              const weeklyCount = techSchedules.reduce((sum, s) => sum + s.daysOfWeek.length, 0);
              const vehicle = vehicles.find(v => v.id === techSchedules[0]?.vehicleId);
              return (
                <Card key={techId} style={{ padding: '14px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>👤 {techName}</div>
                  {vehicle && <div className="text-xs text-secondary" style={{ marginBottom: '6px' }}>🚐 {vehicle.plate} — {vehicle.brand} {vehicle.model}</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>Clientes asignados: <strong style={{ color: 'var(--text-primary)' }}>{techSchedules.length}</strong></span>
                    <span>Visitas/sem: <strong style={{ color: 'var(--brand-400)' }}>{weeklyCount}</strong></span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'routes' | 'schedules' | 'planning';

export function LogisticsPage() {
  const [tab, setTab] = useState<Tab>('planning');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewRoute, setShowNewRoute] = useState(false);
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [generating, setGenerating] = useState(false);

  const selectedRoute = routes.find(r => r.id === selectedRouteId);

  const loadRoutes = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const data = await getDailyRoutes.execute(date);
      setRoutes(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSchedules = useCallback(async () => {
    const data = await repositories.vehicles.getSchedules();
    setSchedules(data);
  }, []);

  useEffect(() => { repositories.vehicles.getAll().then(setVehicles); }, []);
  useEffect(() => { loadRoutes(selectedDate); }, [selectedDate, loadRoutes]);
  useEffect(() => { if (tab === 'schedules' || tab === 'planning') loadSchedules(); }, [tab, loadSchedules]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await scheduleUC.generateForDate(selectedDate);
      await loadRoutes(selectedDate);
    } finally { setGenerating(false); }
  };

  const totalStops = routes.reduce((s, r) => s + r.stops.length, 0);
  const completedStops = routes.reduce((s, r) => s + r.stops.filter(st => st.status === 'completed').length, 0);
  const activeRoutes = routes.filter(r => r.status === 'in_progress').length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Logística y Rutas</h1>
          <p className="page-desc">Planificación operativa, flota y asignación de personal</p>
        </div>
        <div className="page-header-actions">
          {tab === 'routes' && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={handleGenerate} disabled={generating}>
                {generating ? '⏳ Generando...' : '🔄 Generar desde frecuencias'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowNewRoute(true)}>+ Nueva Ruta</button>
            </>
          )}
          {tab === 'schedules' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewSchedule(true)}>+ Nueva Frecuencia</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '20px',
        background: 'var(--bg-surface)', padding: '4px',
        borderRadius: 'var(--radius-md)', width: 'fit-content',
      }}>
        {(['planning', 'routes', 'schedules'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '6px 16px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: 600,
            background: tab === t ? 'var(--bg-card)' : 'transparent',
            color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
            boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
          }}>
            {t === 'planning' ? '📆 Planificación' : t === 'routes' ? '🗺️ Rutas Diarias' : '🔁 Frecuencias'}
          </button>
        ))}
      </div>

      {/* ── PLANNING TAB ── */}
      {tab === 'planning' && <PlanningTab schedules={schedules} vehicles={vehicles} />}

      {/* ── ROUTES TAB ── */}
      {tab === 'routes' && (
        <>
          {/* Date picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-md)', padding: '8px 14px', width: 'fit-content' }}>
            <span style={{ fontSize: '16px' }}>📆</span>
            <input
              type="date"
              value={dateToInputValue(selectedDate)}
              onChange={e => setSelectedDate(new Date(e.target.value + 'T12:00:00'))}
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}
            />
          </div>

          <div className="grid-4 stagger" style={{ marginBottom: '24px' }}>
            <StatCard label="Rutas del día" value={routes.length} icon="🚐" color="blue" />
            <StatCard label="En ruta" value={activeRoutes} icon="🟡" color="yellow" />
            <StatCard label="Paradas totales" value={totalStops} icon="📍" color="cyan" />
            <StatCard label="Completadas" value={`${completedStops}/${totalStops}`} icon="✅" color="green" />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>Cargando rutas...
            </div>
          ) : routes.length === 0 ? (
            <EmptyState
              icon="🗺️"
              title="Sin rutas para este día"
              description="Crea una ruta manualmente o genera automáticamente desde las frecuencias programadas."
              action={
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button className="btn btn-secondary btn-sm" onClick={handleGenerate} disabled={generating}>
                    🔄 Generar desde frecuencias
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowNewRoute(true)}>+ Nueva Ruta</button>
                </div>
              }
            />
          ) : (
            <div className={`list-detail-grid${selectedRoute ? ' has-panel' : ''}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {routes.map(route => (
                  <RouteCard
                    key={route.id} route={route}
                    selected={selectedRouteId === route.id}
                    onClick={() => setSelectedRouteId(selectedRouteId === route.id ? null : route.id)}
                  />
                ))}
              </div>

              {selectedRoute && (
                <Card className="animate-fade-in" style={{ alignSelf: 'start' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '2px' }}>
                        🚐 {selectedRoute.vehiclePlate}
                      </div>
                      <div className="text-sm text-secondary">👤 {selectedRoute.driverName}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <Badge color={STATUS_COLOR[selectedRoute.status] as 'blue' | 'yellow' | 'green'}>
                        {STATUS_LABEL[selectedRoute.status]}
                      </Badge>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelectedRouteId(null)}>✕</button>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-border)', padding: '10px 12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span className="text-secondary">
                        📅 {selectedRoute.date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                      {selectedRoute.estimatedDuration && (
                        <span className="text-secondary">
                          ⏱ ~{Math.floor(selectedRoute.estimatedDuration / 60)}h {selectedRoute.estimatedDuration % 60}min
                        </span>
                      )}
                    </div>
                  </div>

                  <SectionHeader title={`Paradas (${selectedRoute.stops.length})`} subtitle="Orden de visita del día" />

                  {selectedRoute.stops.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Sin paradas asignadas
                    </div>
                  ) : (
                    [...selectedRoute.stops]
                      .sort((a, b) => a.order - b.order)
                      .map(stop => <StopItem key={stop.id} stop={stop} />)
                  )}

                  {selectedRoute.notes && (
                    <div style={{ marginTop: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      📝 {selectedRoute.notes}
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* ── SCHEDULES TAB ── */}
      {tab === 'schedules' && (
        <>
          {schedules.length === 0 ? (
            <EmptyState
              icon="📅"
              title="Sin frecuencias programadas"
              description="Las frecuencias permiten generar rutas automáticamente cada día según los días de visita definidos por cliente."
              action={
                <button className="btn btn-primary btn-sm" onClick={() => setShowNewSchedule(true)}>
                  + Nueva Frecuencia
                </button>
              }
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
              {schedules.map(s => (
                <Card key={s.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{s.clientName}</div>
                    <Badge color="blue">{FREQ_LABELS[s.frequency]}</Badge>
                  </div>
                  <div className="text-sm text-secondary" style={{ marginBottom: '6px' }}>📍 {s.address}, {s.commune}</div>
                  <div className="text-sm text-secondary" style={{ marginBottom: '10px' }}>
                    👤 {s.assignedTechnicianName} · 🚐 {s.vehiclePlate}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {DAY_NAMES.map((d, i) => (
                      <span key={i} style={{
                        padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600,
                        background: s.daysOfWeek.includes(i) ? 'var(--brand-500)' : 'var(--bg-surface)',
                        color: s.daysOfWeek.includes(i) ? 'white' : 'var(--text-muted)',
                        border: '1px solid var(--bg-border)',
                      }}>{d}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-xs text-muted">⏱ {s.estimatedDurationMin} min / visita</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '11px', color: 'var(--error-400)' }}
                      onClick={async () => {
                        if (!confirm('¿Desactivar esta frecuencia?')) return;
                        await scheduleUC.deactivate(s.id);
                        setSchedules(prev => prev.filter(x => x.id !== s.id));
                      }}
                    >Desactivar</button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {showNewRoute && (
        <NewRouteModal
          vehicles={vehicles} date={selectedDate}
          onClose={() => setShowNewRoute(false)}
          onCreate={r => setRoutes(prev => [...prev, r])}
        />
      )}
      {showNewSchedule && (
        <NewScheduleModal
          vehicles={vehicles}
          onClose={() => setShowNewSchedule(false)}
          onCreate={s => setSchedules(prev => [...prev, s])}
        />
      )}
    </div>
  );
}
