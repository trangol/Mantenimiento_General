'use client';

import React from 'react';
import { Card, SectionHeader, Badge, AvatarGroup } from '@/presentation/components/ui';

const mockRoutes = [
  { id: 'RT-1', vehicle: 'HJKL-52', driver: 'Juan Pérez', zone: 'Lo Barnechea / Las Condes', stops: 8, progress: 3 },
  { id: 'RT-2', vehicle: 'MNPQ-71', driver: 'Carlos Muñoz', zone: 'Providencia / Ñuñoa', stops: 10, progress: 5 },
  { id: 'RT-3', vehicle: 'RSTU-33', driver: 'Pedro Soto', zone: 'La Reina / Peñalolén', stops: 7, progress: 4 },
  { id: 'RT-4', vehicle: 'ABCD-90', driver: 'Miguel Torres', zone: 'Vitacura', stops: 9, progress: 1 },
];

export function LogisticsPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Logística y Rutas</h1>
          <p className="page-desc">Asignación de vehículos, personal y cuadrillas por zona</p>
        </div>
        <button className="btn btn-primary btn-sm">🗺️ Optimizar Rutas Diarias</button>
      </div>

      <div className="grid-3" style={{ marginBottom: '20px' }}>
        {mockRoutes.map((route) => (
          <Card key={route.id} className="animate-fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '24px' }}>🚐</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{route.vehicle}</div>
                  <div className="text-xs text-secondary">Ruta {route.id}</div>
                </div>
              </div>
              <Badge color="blue">{route.progress} / {route.stops} OTs</Badge>
            </div>
            
            <div style={{ marginBottom: '16px', background: 'var(--bg-base)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
              <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>Zona Asignada</div>
              <div className="text-sm font-semibold">{route.zone}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="text-sm text-secondary">Cuadrilla Asignada</div>
              <AvatarGroup names={[route.driver, 'Asistente A']} max={2} />
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <SectionHeader title="Calendario Semanal (Vista Previa)" subtitle="Despliegue programado para los próximos 7 días" />
        <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: '40px', textAlign: 'center', border: '1px dashed var(--bg-border)' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📅</div>
          <div style={{ fontWeight: 600 }}>Calendario interactivo en construcción</div>
          <div className="text-sm text-secondary">Aquí se integrará un componente de arrastrar y soltar para mover visitas de un vehículo a otro.</div>
        </div>
      </Card>
    </div>
  );
}
