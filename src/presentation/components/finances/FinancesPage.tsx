'use client';

import React from 'react';
import { Card, SectionHeader, Badge, StatCard } from '@/presentation/components/ui';

const mockBilling = [
  { id: 'FAC-0921', client: 'Hotel Costanera', amount: 450000, date: '01/05/2026', status: 'pending', dueDate: '15/05/2026' },
  { id: 'FAC-0920', client: 'Club Las Araucarias', amount: 820000, date: '28/04/2026', status: 'paid', dueDate: '05/05/2026' },
  { id: 'FAC-0919', client: 'Condominio Los Pinos', amount: 125000, date: '10/04/2026', status: 'overdue', dueDate: '20/04/2026' },
];

export function FinancesPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Finanzas</h1>
          <p className="page-desc">Consolidación de cobros, facturación y estados de cuenta</p>
        </div>
        <button className="btn btn-primary btn-sm">💳 Enviar Links de Pago</button>
      </div>

      <div className="grid-3 stagger" style={{ marginBottom: '20px' }}>
        <StatCard label="Ingresos Mensuales" value="$4.2M" icon="💰" color="green" trend={{ up: true, value: '18% vs anterior' }} />
        <StatCard label="Por Cobrar (Vigente)" value="$1.5M" icon="🧾" color="blue" />
        <StatCard label="Cobros Vencidos" value="$380K" icon="⚠️" color="red" trend={{ up: false, value: '+5% este mes' }} />
      </div>

      <Card>
        <SectionHeader title="Facturación y Estados de Cuenta" />
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Cliente</th>
                <th>Emisión</th>
                <th>Vencimiento</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {mockBilling.map((bill) => (
                <tr key={bill.id}>
                  <td><span className="font-mono text-sm" style={{ color: 'var(--brand-400)' }}>{bill.id}</span></td>
                  <td className="font-semibold text-sm">{bill.client}</td>
                  <td className="text-sm text-secondary">{bill.date}</td>
                  <td className="text-sm text-secondary">{bill.dueDate}</td>
                  <td className="font-bold">${bill.amount.toLocaleString('es-CL')}</td>
                  <td>
                    {bill.status === 'paid' && <Badge color="green">Pagado</Badge>}
                    {bill.status === 'pending' && <Badge color="yellow">Pendiente</Badge>}
                    {bill.status === 'overdue' && <Badge color="red">Vencido</Badge>}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm text-brand-400">Recordatorio</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
