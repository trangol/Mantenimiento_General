import { IAssetRepository } from '../../core/repositories/IAssetRepository';
import { IMaintenanceRecordRepository } from '../../core/repositories/IMaintenanceRecordRepository';
import { MaintenanceRecord } from '../../core/domain/MaintenanceRecord';

export class StartMaintenanceUseCase {
  constructor(
    private assetRepository: IAssetRepository,
    private maintenanceRepository: IMaintenanceRecordRepository
  ) {}

  async execute(qrCodeId: string, technicianId: string): Promise<MaintenanceRecord> {
    // 1. Validar que el activo existe a partir del código QR físico
    const asset = await this.assetRepository.getByQrCode(qrCodeId);
    if (!asset) {
      throw new Error('Activo no encontrado para el código QR proporcionado.');
    }

    // 2. Crear el registro de mantenimiento (Orden de Trabajo)
    const newRecord: MaintenanceRecord = {
      id: crypto.randomUUID(),
      assetId: asset.id,
      clientId: asset.clientId,
      technicianId: technicianId,
      status: 'in_progress',
      scheduledDate: new Date(),
      startedAt: new Date(), // Tiempo de llegada exacto
      initialPhotos: [],
      finalPhotos: [],
      observations: '',
      suppliesUsed: [],
      totalCost: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 3. Persistir usando la abstracción del repositorio (DIP)
    await this.maintenanceRepository.create(newRecord);

    return newRecord;
  }
}
