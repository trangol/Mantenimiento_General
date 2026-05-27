import { IMaintenanceRecordRepository } from '../../core/repositories/IMaintenanceRecordRepository';
import { SupplyUsage } from '../../core/domain/MaintenanceRecord';

export class CompleteMaintenanceUseCase {
  constructor(
    private maintenanceRepository: IMaintenanceRecordRepository
    // A futuro: private inventoryRepository: IInventoryRepository
  ) {}

  async execute(
    recordId: string, 
    finalPhotos: string[], 
    observations: string, 
    supplies: SupplyUsage[]
  ): Promise<void> {
    const record = await this.maintenanceRepository.getById(recordId);
    if (!record) {
      throw new Error('Registro de mantenimiento no encontrado.');
    }

    if (record.status !== 'in_progress') {
      throw new Error('Solo se pueden completar mantenimientos que están en progreso.');
    }

    // Calcular el costo total en base a los insumos y precios al momento del servicio
    const totalCost = supplies.reduce((acc, supply) => acc + (supply.quantity * supply.unitCost), 0);

    // Actualizar registro con la hora de término
    await this.maintenanceRepository.update(recordId, {
      status: 'completed',
      completedAt: new Date(),
      finalPhotos,
      observations,
      suppliesUsed: supplies,
      totalCost,
      updatedAt: new Date()
    });

    // TODO: Emitir evento de dominio para descontar del inventario (SRP)
  }
}
