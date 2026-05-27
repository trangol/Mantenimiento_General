import { IAssetRepository } from '@/core/repositories/IAssetRepository';
import { IClientRepository } from '@/core/repositories/IClientRepository';
import { Asset, AssetType, RecurringSupply } from '@/core/domain/Asset';

/**
 * CreateAssetUseCase
 * Registra un nuevo activo para un cliente y genera su QR ID único.
 *
 * SRP: Solo crea activos.
 * DIP: Depende de interfaces, no de implementaciones concretas.
 */

export interface CreateAssetInput {
  clientId: string;
  name: string;
  type: AssetType;
  brand?: string;
  model?: string;
  serialNumber?: string;
  installationDate?: Date;
  locationDescription?: string;
  maintenanceFrequencyDays: number;
  metadata?: Record<string, string | number | boolean>;
  recurringSupplies?: RecurringSupply[];
  initialPhotos?: string[];
  notes?: string;
  createdBy?: string;
}

export class CreateAssetUseCase {
  constructor(
    private assetRepository: IAssetRepository,
    private clientRepository: IClientRepository
  ) {}

  async execute(input: CreateAssetInput): Promise<Asset> {
    // Verificar que el cliente existe
    const client = await this.clientRepository.getById(input.clientId);
    if (!client) {
      throw new Error(`Cliente con ID ${input.clientId} no encontrado.`);
    }

    // Generar ID único de activo con prefijo AST-
    const assetId = `AST-${crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`;

    // Generar QR ID único: QR- + 12 caracteres → garantiza unicidad para el código físico
    const qrCodeId = `QR-${crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`;

    const now = new Date();
    const asset: Asset = {
      id: assetId,
      clientId: input.clientId,
      name: input.name.trim(),
      type: input.type,
      qrCodeId,
      brand: input.brand?.trim(),
      model: input.model?.trim(),
      serialNumber: input.serialNumber?.trim(),
      installationDate: input.installationDate,
      locationDescription: input.locationDescription?.trim(),
      maintenanceFrequencyDays: input.maintenanceFrequencyDays,
      status: 'active',
      metadata: input.metadata || {},
      recurringSupplies: input.recurringSupplies || [],
      initialPhotos: input.initialPhotos || [],
      notes: input.notes?.trim(),
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };

    await this.assetRepository.create(asset);
    return asset;
  }
}
