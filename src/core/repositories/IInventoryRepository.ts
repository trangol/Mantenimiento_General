import { InventoryItem, StockMovement } from '../domain/InventoryItem';

export interface IInventoryRepository {
  getAll(): Promise<InventoryItem[]>;
  getById(id: string): Promise<InventoryItem | null>;
  getBySku(sku: string): Promise<InventoryItem | null>;
  getLowStock(): Promise<InventoryItem[]>;
  create(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem>;
  update(id: string, data: Partial<InventoryItem>): Promise<InventoryItem>;
  adjustStock(id: string, movement: Omit<StockMovement, 'id' | 'createdAt'>): Promise<void>;
  getMovements(itemId: string): Promise<StockMovement[]>;
  delete(id: string): Promise<void>;
}
