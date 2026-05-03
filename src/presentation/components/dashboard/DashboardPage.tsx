'use client';

import React from 'react';
import {
  StatCard, Card, SectionHeader, StatusBadge, ProgressBar, Badge,
} from '@/presentation/components/ui';

// ─── Datos Mock (se reemplazarán por llamadas a Firebase) ─────────────────────
const kpis = [
  { label: 'Clientes Activos',    value: 300, icon: '🏢', color: 'blue'  as const, trend: { value: '+12 este mes', up: true } },
  { label: 'OTs Hoy',             value: 47,  icon: '🔧', color: 'cyan'  as const, trend: { value: '8 en progreso', up: true } },
  { label: 'Ingresos del Mes',    value: '$4.2M', icon: '💰', color: 'green' as const, trend: { value: '+18% vs anterior', up: true } },
  { label: 'Cobros Pendientes',   value: '$820K', icon: '⚠️', color: 'yellow' as const, trend: { value: '23 facturas', up: false } },
];

const recentOTs = [
  { id: 'OT-2841', client: 'Club de Campo Las Araucarias', asset: 'Piscina Olímpica', technician: 'Juan Pérez',     status: 'in_progress' as const, time: '08:45', cost: '$24.000' },
  { id: 'OT-2840', client: 'Condominio Los Pinos',         asset: 'Piscina Temperada', technician: 'Carlos Muñoz',   status: 'completed'  as const, time: '09:10', cost: '$18.500' },
  { id: 'OT-2839', client: 'Hotel Costanera',              asset: 'Piscina Principal',  technician: 'Pedro Soto',    status: 'completed'  as const, time: '07:30', cost: '$31.000' },
  { id: 'OT-2838', client: 'Residencial El Bosque',        asset: 'Piscina Infantil',   technician: 'Miguel Torres', status: 'pending'    as const, time: '11:00', cost: '—' },
  { id: 'OT-2837', client: 'Centro Deportivo Malloco',     asset: 'Piscina Semi-Olímp', technician: 'Juan Pérez',    status: 'pending'    as const, time: '12:30', cost: '—' },
];

const technicianPerf = [
  { name: 'Juan Pérez',     otsHoy: 4, completadas: 2, avg: 82 },
  { name: 'Carlos Muñoz',   otsHoy: 5, completadas: 5, avg: 100 },
  { name: 'Pedro Soto',     otsHoy: 4, completadas: 4, avg: 100 },
  { name: 'Miguel Torres',  otsHoy: 5, completadas: 1, avg: 20 },
  { name: 'Roberto Díaz',   otsHoy: 4, completadas: 3, avg: 75 },
];

const vehicles = [
  { plate: 'HJKL-52', driver: 'Juan Pérez',   ots: 4, status: 'active' },
  { plate: 'MNPQ-71', driver: 'Carlos Muñoz', ots: 5, status: 'active' },
  { plate: 'RSTU-33', driver: 'Pedro Soto',   ots: 4, status: 'active' },
  { plate: 'ABCD-90', driver: 'Miguel Torres',ots: 5, status: 'warning' },
];

// ─── Componente Principal ──────────────────────────────────────────────────────
export function DashboardPage() {
  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-desc" style={{ textTransform: 'capitalize' }}>{today}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm">📤 Exportar Reporte</button>
          <button className="btn btn-primary btn-sm">+ Nueva OT</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-4 stagger" style={{ marginBottom: '28px' }}>
        {kpis.map((kpi) => (
          <StatCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>

        {/* OTs Recientes */}
        <Card className="animate-fade-up">
          <SectionHeader
            title="Órdenes de Trabajo — Hoy"
            subtitle="Vista en tiempo real de las OTs activas"
            action={<button className="btn btn-ghost btn-sm">Ver todas →</button>}
          />
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>OT</th>
                  <th>Cliente / Activo</th>
                  <th>Técnico</th>
                  <th>Hora</th>
                  <th>Estado</th>
                  <th>Costo</th>
                </tr>
              </thead>
              <tbody>
                {recentOTs.map((ot) => (
                  <tr key={ot.id} style={{ cursor: 'pointer' }}>
                    <td>
                      <span className="font-mono text-sm" style={{ color: 'var(--brand-400)' }}>
                        {ot.id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{ot.client}</div>
                      <div className="text-sm text-secondary">{ot.asset}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="avatar avatar-sm">
                          {ot.technician.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-sm">{ot.technician}</span>
                      </div>
                    </td>
                    <td className="text-sm text-secondary">{ot.time}</td>
                    <td><StatusBadge status={ot.status} /></td>
                    <td className="font-semibold">{ot.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Rendimiento Técnicos */}
        <Card className="animate-fade-up" style={{ animationDelay: '80ms' }}>
          <SectionHeader
            title="Rendimiento Técnicos"
            subtitle="OTs completadas hoy"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {technicianPerf.map((tech) => (
              <div key={tech.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="avatar avatar-sm">
                      {tech.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{tech.name}</span>
                  </div>
                  <span className="text-sm text-secondary">
                    {tech.completadas}/{tech.otsHoy}
                  </span>
                </div>
                <ProgressBar
                  value={tech.avg}
                  color={tech.avg === 100 ? 'var(--success-500)' : tech.avg < 50 ? 'var(--warning-500)' : 'var(--gradient-brand)'}
                  showLabel
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Segunda fila */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Flota de Vehículos */}
        <Card className="animate-fade-up">
          <SectionHeader
            title="Flota en Terreno"
            subtitle="8 vehículos desplegados"
            action={<button className="btn btn-ghost btn-sm">Logística →</button>}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {vehicles.map((v) => (
              <div key={v.plate} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 14px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--bg-border)',
              }}>
                <span style={{ fontSize: '20px' }}>🚐</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="font-mono font-semibold" style={{ fontSize: '13px' }}>
                      {v.plate}
                    </span>
                    <Badge color={v.status === 'active' ? 'green' : 'yellow'}>
                      {v.status === 'active' ? 'Activo' : 'Atención'}
                    </Badge>
                  </div>
                  <div className="text-sm text-secondary">{v.driver}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="font-semibold" style={{ fontSize: '18px' }}>{v.ots}</div>
                  <div className="text-xs text-muted">OTs hoy</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Alertas y Próximos Mantenimientos */}
        <Card className="animate-fade-up" style={{ animationDelay: '80ms' }}>
          <SectionHeader
            title="Alertas del Sistema"
            subtitle="Requieren atención inmediata"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { icon: '💳', title: 'Cobros vencidos', desc: '7 clientes con facturas >30 días', color: 'var(--danger-500)' },
              { icon: '📦', title: 'Stock bajo', desc: 'Cloro granulado: 3 unidades restantes', color: 'var(--warning-500)' },
              { icon: '🔧', title: 'Mantención atrasada', desc: '4 activos sin visita en +30 días', color: 'var(--warning-500)' },
              { icon: '📋', title: 'Cotizaciones sin respuesta', desc: '6 cotizaciones emitidas sin cierre', color: 'var(--brand-400)' },
            ].map((alert) => (
              <div key={alert.title} style={{
                display: 'flex', gap: '12px', padding: '12px 14px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${alert.color}28`,
                cursor: 'pointer',
                transition: 'border-color var(--transition-fast)',
              }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{alert.icon}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: alert.color }}>
                    {alert.title}
                  </div>
                  <div className="text-xs text-secondary">{alert.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
