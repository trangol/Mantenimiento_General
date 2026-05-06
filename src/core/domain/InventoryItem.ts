export type InventoryCategory = 'chemical' | 'equipment' | 'tool' | 'spare_part' | 'consumable' | 'other';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: InventoryCategory;
  unit: string; // 'kg', 'litro', 'unidad', 'metro', etc.
  brand?: string;
  currentStock: number;
  minimumStock: number; // Alerta de stock bajo
  unitCost: number; // Precio de compra
  unitPrice: number; // Precio de venta
  supplierId?: string;
  supplierName?: string;
  location?: string; // Bodega o ubicación física
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string; // 'compra', 'uso_ot', 'cotizacion', 'ajuste_inventario'
  referenceId?: string; // OT ID o cotización ID
  unitCost: number;
  totalCost: number;
  performedBy: string;
  createdAt: Date;
}
