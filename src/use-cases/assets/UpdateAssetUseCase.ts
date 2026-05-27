import { IAssetRepository } from '@/core/repositories/IAssetRepository';
import { Asset } from '@/core/domain/Asset';

/**
 * UpdateAssetUseCase
 * Actualiza los datos de un activo existente.
 */

export type UpdateAssetInput = Partial<Omit<Asset, 'id' | 'clientId' | 'qrCodeId' | 'createdAt' | 'createdBy'>>;

export class UpdateAssetUseCase {
  constructor(private assetRepository: IAssetRepository) {}

  async execute(id: string, input: UpdateAssetInput): Promise<void> {
    const existing = await this.assetRepository.getById(id);
    if (!existing) {
      throw new Error(`Activo con ID ${id} no encontrado.`);
    }

    await this.assetRepository.update(id, {
      ...input,
      updatedAt: new Date(),
    });
  }
}
