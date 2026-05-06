'use client';

import React, { useState } from 'react';
import { Card, SectionHeader, StatCard, ProgressBar } from '@/presentation/components/ui';

const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May'];
const revenue = [3.2, 3.5, 4.1, 4.2, 4.4];
const ots = [180, 195, 220, 237, 251];

const techPerf = [
  { name: 'Carlos Muñoz', ots: 48, rating: 97, avgTime: 92 },
  { name: 'Pedro Soto',   ots: 44, rating: 95, avgTime: 88 },
  { name: 'Juan Pérez',   ots: 42, rating: 91, avgTime: 96 },
  { name: 'Roberto Díaz', ots: 38, rating: 88, avgTime: 84 },
  { name: 'Miguel Torres',ots: 29, rating: 72, avgTime: 110 },
];

const topClients = [
  { name: 'Hotel Costanera',           revenue: 890000, ots: 12 },
  { name: 'Club de Campo Las Araucarias', revenue: 720000, ots: 8 },
  { name: 'Centro Deportivo Malloco',  revenue: 560000, ots: 7 },
  { name: 'Condominio Los Pinos',      revenue: 420000, ots: 9 },
  { name: 'Club Los Dominicos',        revenue: 380000, ots: 6 },
];

const maxBar = Math.max(...revenue);

export function ReportsPage() {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Estadísticas y KPIs</h1>
          <p className="page-desc">Rendimiento del negocio, equipo y análisis financiero</p>
        </div>
        <div className="page-header-actions">
          {(['month', 'quarter', 'year'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-secondary'}`}>
              {p === 'month' ? 'Este Mes' : p === 'quarter' ? 'Trimestre' : 'Año'}
            </button>
          ))}
          <button className="btn btn-secondary btn-sm">📤 Exportar PDF</button>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid-4 stagger" style={{ marginBottom: '28px' }}>
        <StatCard label="Ingresos del Mes" value="$4.4M" icon="💰" color="green" trend={{ value: '+4.7% vs anterior', up: true }} />
        <StatCard label="OTs Completadas" value={251} icon="🔧" color="blue" trend={{ value: '+6% vs anterior', up: true }} />
        <StatCard label="Satisfacción Clientes" value="94%" icon="⭐" color="cyan" trend={{ value: '+2% vs anterior', up: true }} />
        <StatCard label="Tiempo Promedio OT" value="94 min" icon="⏱️" color="yellow" trend={{ value: '-5 min vs anterior', up: true }} />
      </div>

      <div className="reports-main-grid" style={{ marginBottom: '20px' }}>

        {/* Gráfico de Ingresos */}
        <Card>
          <SectionHeader title="Ingresos Mensuales" subtitle="Tendencia últimos 5 meses (en millones CLP)" />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '180px', padding: '16px 0 0' }}>
            {months.map((m, i) => (
              <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '11px', color: 'var(--brand-400)', fontWeight: 700 }}>${revenue[i]}M</span>
                <div style={{
                  width: '100%', borderRadius: '6px 6px 0 0',
                  height: `${(revenue[i] / maxBar) * 140}px`,
                  background: i === months.length - 1
                    ? 'var(--gradient-brand)'
                    : `rgba(59,130,246,${0.3 + (i / months.length) * 0.4})`,
                  transition: 'height 0.6s ease',
                  minHeight: '20px',
                }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* OTs por mes */}
        <Card>
          <SectionHeader title="OTs por Mes" subtitle="Cantidad de órdenes completadas" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            {months.map((m, i) => (
              <div key={m}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span className="text-sm">{m}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--brand-400)' }}>{ots[i]}</span>
                </div>
                <ProgressBar value={Math.round((ots[i] / 300) * 100)} showLabel={false} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="reports-second-grid">

        {/* Rendimiento del Equipo */}
        <Card>
          <SectionHeader title="Rendimiento del Equipo" subtitle="Ranking de técnicos — mes actual" />
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, marginTop: '8px' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Técnico</th>
                  <th>OTs</th>
                  <th>Rating</th>
                  <th>T. Prom.</th>
                </tr>
              </thead>
              <tbody>
                {techPerf.map((t, i) => (
                  <tr key={t.name}>
                    <td>
                      <span style={{ fontWeight: 700, color: i < 3 ? 'var(--warning-400)' : 'var(--text-muted)', fontSize: '13px' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="avatar avatar-sm">{t.name.split(' ').map(n => n[0]).join('')}</div>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{t.name}</span>
                      </div>
                    </td>
                    <td className="font-semibold">{t.ots}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '50px' }}><ProgressBar value={t.rating} height={4} /></div>
                        <span className="text-sm" style={{ color: t.rating >= 90 ? 'var(--success-400)' : 'var(--warning-400)' }}>{t.rating}%</span>
                      </div>
                    </td>
                    <td className="text-sm text-secondary">{t.avgTime} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top Clientes */}
        <Card>
          <SectionHeader title="Top Clientes por Ingreso" subtitle="Ranking mensual" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
            {topClients.map((c, i) => {
              const pct = Math.round((c.revenue / topClients[0].revenue) * 100);
              return (
                <div key={c.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '18px' }}>#{i + 1}</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{c.name}</div>
                        <div className="text-xs text-muted">{c.ots} OTs</div>
                      </div>
                    </div>
                    <span className="font-semibold text-sm" style={{ color: 'var(--success-400)' }}>
                      ${(c.revenue / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <ProgressBar value={pct} height={4} color={i === 0 ? 'var(--gradient-brand)' : `rgba(59,130,246,${0.7 - i * 0.1})`} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
