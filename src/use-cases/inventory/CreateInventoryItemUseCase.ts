import { InventoryItem, InventoryCategory } from '@/core/domain/InventoryItem';
import { IInventoryRepository } from '@/core/repositories/IInventoryRepository';

export interface CreateInventoryItemInput {
  sku: string;
  name: string;
  description?: string;
  category: InventoryCategory;
  unit: string;
  brand?: string;
  currentStock: number;
  minimumStock: number;
  unitCost: number;
  unitPrice: number;
  supplierName?: string;
  location?: string;
}

export class CreateInventoryItemUseCase {
  constructor(private readonly repo: IInventoryRepository) {}

  async execute(input: CreateInventoryItemInput): Promise<InventoryItem> {
    const existing = await this.repo.getBySku(input.sku);
    if (existing) throw new Error(`Ya existe un producto con SKU "${input.sku}"`);
    return this.repo.create({ ...input, isActive: true });
  }
}
