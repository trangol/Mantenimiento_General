'use client';

import React, { useEffect, useState } from 'react';
import {
  StatCard, Card, SectionHeader, StatusBadge, EmptyState,
} from '@/presentation/components/ui';
import { repositories } from '@/infrastructure/firebase/RepositoryFactory';
import { GetDashboardKpisUseCase, DashboardKpis } from '@/use-cases/dashboard/GetDashboardKpisUseCase';

// ─── Use case instanciado a nivel de módulo (DIP) ────────────────────────────
const getDashboardKpisUC = new GetDashboardKpisUseCase(
  repositories.maintenance,
  repositories.clients,
  repositories.inventory,
);

// ─── Helpers de formato ───────────────────────────────────────────────────────
const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

function initials(name?: string): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Skeleton de carga ────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div>
      <div className="grid-4" style={{ marginBottom: '20px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            height: '96px', background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)', opacity: 1 - i * 0.12,
          }} />
        ))}
      </div>
      {[1, 2].map(i => (
        <div key={i} style={{
          height: '180px', background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)', marginBottom: '16px', opacity: 0.6,
        }} />
      ))}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDashboardKpisUC.execute()
      .then(data => { if (!cancelled) setKpis(data); })
      .catch(err => {
        console.error('Error cargando KPIs del dashboard:', err);
        if (!cancelled) setError('No se pudieron cargar los indicadores. Intenta nuevamente.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

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
      </div>

      {loading && <LoadingSkeleton />}

      {!loading && error && (
        <Card>
          <EmptyState icon="⚠️" title="Error al cargar" description={error} />
        </Card>
      )}

      {!loading && !error && kpis && (
        <>
          {/* KPIs */}
          <div className="grid-4 stagger" style={{ marginBottom: '20px' }}>
            <StatCard
              label="Mantenimientos del Mes"
              value={`${kpis.monthCompleted}/${kpis.monthTotal}`}
              icon="🔧"
              color="blue"
              trend={{ value: 'completados / programados', up: kpis.monthCompleted > 0 }}
            />
            <StatCard
              label="Clientes Activos"
              value={kpis.activeClients}
              icon="🏢"
              color="cyan"
            />
            <StatCard
              label="Ingresos del Mes"
              value={CLP.format(kpis.monthRevenue)}
              icon="💰"
              color="green"
              trend={{ value: 'servicios completados', up: kpis.monthRevenue > 0 }}
            />
            <StatCard
              label="Tasa de Cumplimiento"
              value={`${kpis.complianceRate}%`}
              icon="📈"
              color={kpis.complianceRate >= 80 ? 'green' : kpis.complianceRate >= 50 ? 'yellow' : 'red'}
            />
          </div>

          {/* Fila principal: Recientes + Rendimiento */}
          <div className="dash-main-grid" style={{ marginBottom: '16px' }}>

            {/* Mantenimientos Recientes */}
            <Card className="animate-fade-up">
              <SectionHeader
                title="Mantenimientos Recientes"
                subtitle="Últimos 10 servicios registrados"
              />
              {kpis.recentMaintenances.length === 0 ? (
                <EmptyState
                  icon="📋"
                  title="Sin mantenimientos"
                  description="Aún no hay mantenimientos registrados. Crea la primera orden de trabajo desde el módulo Mantenciones."
                />
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente / Activo</th>
                        <th className="table-hide-sm">Técnico</th>
                        <th className="table-hide-sm">Fecha</th>
                        <th>Estado</th>
                        <th className="table-hide-sm">Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.recentMaintenances.map((m) => (
                        <tr key={m.id}>
                          <td>
                            <div style={{ fontWeight: 500, fontSize: '13px' }}>{m.clientName || m.clientId}</div>
                            <div className="text-xs text-secondary">{m.assetName || m.assetId}</div>
                          </td>
                          <td className="table-hide-sm">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div className="avatar avatar-sm">{initials(m.technicianName)}</div>
                              <span className="text-sm">{m.technicianName || '—'}</span>
                            </div>
                          </td>
                          <td className="text-sm text-secondary table-hide-sm">{formatDate(m.scheduledDate)}</td>
                          <td><StatusBadge status={m.status} /></td>
                          <td className="font-semibold table-hide-sm">
                            {m.status === 'completed' ? CLP.format(m.totalCost || 0) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Rendimiento por Técnico */}
            <Card className="animate-fade-up" style={{ animationDelay: '80ms' }}>
              <SectionHeader
                title="Rendimiento Técnicos"
                subtitle="Servicios completados este mes"
              />
              {kpis.technicianPerformance.length === 0 ? (
                <EmptyState
                  icon="👷"
                  title="Sin servicios completados"
                  description="Cuando los técnicos completen mantenimientos este mes, verás su rendimiento aquí."
                />
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Técnico</th>
                        <th>OTs</th>
                        <th>T. Prom.</th>
                        <th className="table-hide-sm">Generado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.technicianPerformance.map((t) => (
                        <tr key={t.technicianId}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div className="avatar avatar-sm">{initials(t.technicianName)}</div>
                              <span className="text-sm" style={{ fontWeight: 500 }}>{t.technicianName}</span>
                            </div>
                          </td>
                          <td className="font-semibold">{t.completedCount}</td>
                          <td className="text-sm text-secondary">{formatDuration(t.avgServiceMinutes)}</td>
                          <td className="font-semibold table-hide-sm">{CLP.format(t.totalRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Segunda fila: Alertas */}
          <div className="dash-second-grid">

            {/* Stock bajo */}
            <Card className="animate-fade-up">
              <SectionHeader
                title="Insumos con Stock Bajo"
                subtitle="Bajo el stock mínimo definido"
              />
              {kpis.lowStockItems.length === 0 ? (
                <EmptyState
                  icon="📦"
                  title="Inventario saludable"
                  description="No hay insumos bajo el stock mínimo."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {kpis.lowStockItems.map((item) => (
                    <div key={item.id} style={{
                      display: 'flex', gap: '12px', padding: '12px', alignItems: 'center',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--bg-border)',
                    }}>
                      <span style={{ fontSize: '20px', flexShrink: 0 }}>📦</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--warning-500)' }}>
                          {item.name}
                        </div>
                        <div className="text-xs text-secondary">
                          Stock: {item.currentStock} {item.unit} · Mínimo: {item.minimumStock} {item.unit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Mantenimientos vencidos */}
            <Card className="animate-fade-up" style={{ animationDelay: '80ms' }}>
              <SectionHeader
                title="Mantenimientos Vencidos"
                subtitle="Programados y aún no completados"
              />
              {kpis.overdueMaintenances.length === 0 ? (
                <EmptyState
                  icon="✅"
                  title="Todo al día"
                  description="No hay mantenimientos vencidos pendientes."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {kpis.overdueMaintenances.slice(0, 8).map((m) => (
                    <div key={m.id} style={{
                      display: 'flex', gap: '12px', padding: '12px', alignItems: 'center',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--bg-border)',
                    }}>
                      <span style={{ fontSize: '20px', flexShrink: 0 }}>⏰</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--danger-500)' }}>
                          {m.clientName || m.clientId} — {m.assetName || m.assetId}
                        </div>
                        <div className="text-xs text-secondary">
                          Programado: {m.scheduledDate.toLocaleDateString('es-CL')} · {m.technicianName || 'Sin técnico'}
                        </div>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                  ))}
                  {kpis.overdueMaintenances.length > 8 && (
                    <div className="text-xs text-secondary" style={{ textAlign: 'center', padding: '4px' }}>
                      +{kpis.overdueMaintenances.length - 8} más vencidos
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
