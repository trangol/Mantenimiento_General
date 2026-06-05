import { Route } from '@/core/domain/Vehicle';
import { IVehicleRepository } from '@/core/repositories/IVehicleRepository';

export class GetDailyRoutesUseCase {
  constructor(private readonly vehicleRepo: IVehicleRepository) {}

  async execute(date: Date): Promise<Route[]> {
    return this.vehicleRepo.getRoutes(date);
  }
}
