import { RouteStop } from '@/core/domain/Vehicle';
import { IVehicleRepository } from '@/core/repositories/IVehicleRepository';

export interface AssignStopInput {
  routeId: string;
  clientId: string;
  clientName: string;
  address: string;
  commune: string;
  technicianId: string;
  technicianName: string;
  estimatedDurationMin: number;
  scheduledTime?: string;
  assetId?: string;
  assetName?: string;
  order: number;
  notes?: string;
}

export class AssignStopUseCase {
  constructor(private readonly vehicleRepo: IVehicleRepository) {}

  async execute(input: AssignStopInput): Promise<RouteStop> {
    const { routeId, ...stopData } = input;
    return this.vehicleRepo.addStop(routeId, { ...stopData, status: 'pending' });
  }
}
