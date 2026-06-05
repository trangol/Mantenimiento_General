import { Route } from '@/core/domain/Vehicle';
import { IVehicleRepository } from '@/core/repositories/IVehicleRepository';

export interface CreateRouteInput {
  vehicleId: string;
  vehiclePlate: string;
  driverId: string;
  driverName: string;
  date: Date;
  notes?: string;
}

export class CreateRouteUseCase {
  constructor(private readonly vehicleRepo: IVehicleRepository) {}

  async execute(input: CreateRouteInput): Promise<Route> {
    return this.vehicleRepo.createRoute({
      name: `Ruta ${input.vehiclePlate} — ${input.date.toLocaleDateString('es-CL')}`,
      date: input.date,
      vehicleId: input.vehicleId,
      vehiclePlate: input.vehiclePlate,
      driverId: input.driverId,
      driverName: input.driverName,
      stops: [],
      status: 'planned',
      notes: input.notes,
    });
  }
}
