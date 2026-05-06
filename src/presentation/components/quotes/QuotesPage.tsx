'use client';

import React, { useState } from 'react';
import { Card, SectionHeader, Badge, EmptyState, StatCard } from '@/presentation/components/ui';

const mockQuotes = [
  { id: 'q1', quoteNumber: 'COT-0024', clientName: 'Club de Campo Las Araucarias', status: 'sent' as const, total: 420000, validUntil: '15/05/2026', createdAt: '28/04/2026', items: 4 },
  { id: 'q2', quoteNumber: 'COT-0023', clientName: 'Condominio Mirador', status: 'accepted' as const, total: 185000, validUntil: '10/05/2026', createdAt: '25/04/2026', items: 2 },
  { id: 'q3', quoteNumber: 'COT-0022', clientName: 'Hotel Costanera', status: 'draft' as const, total: 890000, validUntil: '30/05/2026', createdAt: '24/04/2026', items: 7 },
  { id: 'q4', quoteNumber: 'COT-0021', clientName: 'Centro Deportivo Malloco', status: 'rejected' as const, total: 320000, validUntil: '01/05/2026', createdAt: '20/04/2026', items: 3 },
  { id: 'q5', quoteNumber: 'COT-0020', clientName: 'Residencial El Bosque', status: 'expired' as const, total: 155000, validUntil: '28/04/2026', createdAt: '14/04/2026', items: 2 },
  { id: 'q6', quoteNumber: 'COT-0019', clientName: 'Club Los Dominicos', status: 'sent' as const, total: 275000, validUntil: '20/05/2026', createdAt: '22/04/2026', items: 3 },
];

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
const statusLabel: Record<QuoteStatus, string> = { draft: 'Borrador', sent: 'Enviada', accepted: 'Aceptada', rejected: 'Rechazada', expired: 'Vencida' };
const statusColor: Record<QuoteStatus, 'gray' | 'blue' | 'green' | 'red' | 'yellow'> = { draft: 'gray', sent: 'blue', accepted: 'green', rejected: 'red', expired: 'yellow' };

export function QuotesPage() {
  const [filter, setFilter] = useState<'all' | QuoteStatus>('all');

  const filtered = mockQuotes.filter(q => filter === 'all' || q.status === filter);
  const pending = mockQuotes.filter(q => q.status === 'sent').reduce((s, q) => s + q.total, 0);
  const accepted = mockQuotes.filter(q => q.status === 'accepted').reduce((s, q) => s + q.total, 0);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cotizaciones</h1>
          <p className="page-desc">Gestión de propuestas comerciales con descuento de inventario</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm">📤 Exportar</button>
          <button className="btn btn-primary btn-sm">+ Nueva Cotización</button>
        </div>
      </div>

      <div className="grid-4 stagger" style={{ marginBottom: '24px' }}>
        <StatCard label="Total Cotizaciones" value={mockQuotes.length} icon="📋" color="blue" />
        <StatCard label="Pendientes de Respuesta" value={mockQuotes.filter(q => q.status === 'sent').length} icon="📨" color="cyan" />
        <StatCard label="Monto Pendiente" value={`$${(pending/1000).toFixed(0)}K`} icon="💰" color="yellow" />
        <StatCard label="Monto Aceptado" value={`$${(accepted/1000).toFixed(0)}K`} icon="✅" color="green" />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['all', 'draft', 'sent', 'accepted', 'rejected', 'expired'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
          >
            {f === 'all' ? 'Todas' : statusLabel[f as QuoteStatus]}
            <span style={{ background: filter === f ? 'rgba(255,255,255,0.25)' : 'var(--bg-border)', borderRadius: '100px', padding: '0 6px', fontSize: '11px', fontWeight: 600 }}>
              {f === 'all' ? mockQuotes.length : mockQuotes.filter(q => q.status === f).length}
            </span>
          </button>
        ))}
      </div>

      <Card>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          {filtered.length === 0 ? (
            <EmptyState icon="📋" title="Sin cotizaciones" description="No hay cotizaciones en este estado." />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>N° Cotización</th>
                  <th>Cliente</th>
                  <th>Ítems</th>
                  <th>Total</th>
                  <th>Válida Hasta</th>
                  <th>Creada</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id}>
                    <td><span className="font-mono text-sm" style={{ color: 'var(--brand-400)' }}>{q.quoteNumber}</span></td>
                    <td style={{ fontWeight: 500, fontSize: '13px' }}>{q.clientName}</td>
                    <td><Badge color="gray">{q.items} ítems</Badge></td>
                    <td className="font-semibold">${q.total.toLocaleString('es-CL')}</td>
                    <td className="text-sm text-secondary">{q.validUntil}</td>
                    <td className="text-sm text-secondary">{q.createdAt}</td>
                    <td><Badge color={statusColor[q.status]} dot>{statusLabel[q.status]}</Badge></td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-ghost btn-sm" title="Ver">👁</button>
                        <button className="btn btn-ghost btn-sm" title="PDF">📄</button>
                        <button className="btn btn-ghost btn-sm" title="Enviar">📨</button>
                      </div>
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
