import { InventoryItem } from '@/core/domain/InventoryItem';
import { IInventoryRepository } from '@/core/repositories/IInventoryRepository';

export class GetLowStockUseCase {
  constructor(private readonly repo: IInventoryRepository) {}

  async execute(): Promise<InventoryItem[]> {
    return this.repo.getLowStock();
  }
}
