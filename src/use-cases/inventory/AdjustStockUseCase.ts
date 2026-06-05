import { IInventoryRepository } from '@/core/repositories/IInventoryRepository';

export interface AdjustStockInput {
  itemId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  referenceId?: string;
  unitCost: number;
  performedBy: string;
}

export class AdjustStockUseCase {
  constructor(private readonly repo: IInventoryRepository) {}

  async execute(input: AdjustStockInput): Promise<void> {
    await this.repo.adjustStock(input.itemId, {
      inventoryItemId: input.itemId,
      type: input.type,
      quantity: input.quantity,
      reason: input.reason,
      referenceId: input.referenceId,
      unitCost: input.unitCost,
      totalCost: input.unitCost * input.quantity,
      performedBy: input.performedBy,
    });
  }
}
