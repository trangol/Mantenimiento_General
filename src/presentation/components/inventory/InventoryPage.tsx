'use client';

import React, { useState } from 'react';
import { Card, SectionHeader, Badge, EmptyState } from '@/presentation/components/ui';

const mockInventory = [
  { id: 'INV-001', item: 'Cloro Granulado (kg)', category: 'Químicos', stockCentral: 150, stockVehicles: 45, minAlert: 50, cost: 3500 },
  { id: 'INV-002', item: 'Cloro Pastillas 200g (un)', category: 'Químicos', stockCentral: 300, stockVehicles: 120, minAlert: 100, cost: 1200 },
  { id: 'INV-003', item: 'Filtro Arena 50kg', category: 'Repuestos', stockCentral: 12, stockVehicles: 2, minAlert: 10, cost: 25000 },
  { id: 'INV-004', item: 'Bomba Hayward 1HP', category: 'Equipos', stockCentral: 4, stockVehicles: 0, minAlert: 5, cost: 180000 },
  { id: 'INV-005', item: 'Red Saca Hojas', category: 'Herramientas', stockCentral: 25, stockVehicles: 8, minAlert: 15, cost: 12500 },
];

export function InventoryPage() {
  const [search, setSearch] = useState('');

  const filtered = mockInventory.filter((item) =>
    search === '' ||
    item.item.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventario General</h1>
          <p className="page-desc">Control de stock en bodega central y vehículos en terreno</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm">📦 Recepción</button>
          <button className="btn btn-primary btn-sm">+ Nuevo Producto</button>
        </div>
      </div>

      <Card>
        <SectionHeader
          title="Catálogo de Insumos"
          action={
            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="form-input"
                placeholder="Buscar por nombre, categoría..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '30px', fontSize: '13px', height: '34px' }}
              />
            </div>
          }
        />
        
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          {filtered.length === 0 ? (
            <EmptyState icon="📦" title="Sin resultados" description="No hay productos que coincidan." />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Bodega Central</th>
                  <th>En Vehículos</th>
                  <th>Total</th>
                  <th>Costo Unit.</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const total = item.stockCentral + item.stockVehicles;
                  const isLow = total <= item.minAlert;
                  return (
                    <tr key={item.id}>
                      <td><span className="font-mono text-sm" style={{ color: 'var(--brand-400)' }}>{item.id}</span></td>
                      <td style={{ fontWeight: 500, fontSize: '13px' }}>{item.item}</td>
                      <td><Badge color="gray">{item.category}</Badge></td>
                      <td className="font-semibold">{item.stockCentral}</td>
                      <td className="text-secondary">{item.stockVehicles}</td>
                      <td className="font-bold">{total}</td>
                      <td className="text-sm">${item.cost.toLocaleString('es-CL')}</td>
                      <td>
                        <Badge color={isLow ? 'red' : 'green'}>
                          {isLow ? 'Stock Crítico' : 'Óptimo'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
