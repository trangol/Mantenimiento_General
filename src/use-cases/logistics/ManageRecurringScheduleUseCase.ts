import { RecurringSchedule, FrequencyType } from '@/core/domain/Vehicle';
import { IVehicleRepository } from '@/core/repositories/IVehicleRepository';

export interface CreateScheduleInput {
  clientId: string;
  clientName: string;
  assetId?: string;
  assetName?: string;
  assignedTechnicianId: string;
  assignedTechnicianName: string;
  vehicleId: string;
  vehiclePlate: string;
  frequency: FrequencyType;
  daysOfWeek: number[];
  estimatedDurationMin: number;
  address: string;
  commune: string;
  notes?: string;
}

export class ManageRecurringScheduleUseCase {
  constructor(private readonly vehicleRepo: IVehicleRepository) {}

  async create(input: CreateScheduleInput): Promise<RecurringSchedule> {
    return this.vehicleRepo.createSchedule({ ...input, isActive: true });
  }

  async update(id: string, data: Partial<CreateScheduleInput>): Promise<RecurringSchedule> {
    return this.vehicleRepo.updateSchedule(id, data);
  }

  async deactivate(id: string): Promise<void> {
    return this.vehicleRepo.deleteSchedule(id);
  }

  async listByClient(clientId: string): Promise<RecurringSchedule[]> {
    return this.vehicleRepo.getSchedules(clientId);
  }

  async listByVehicle(vehicleId: string): Promise<RecurringSchedule[]> {
    return this.vehicleRepo.getSchedules(undefined, vehicleId);
  }

  async generateForDate(date: Date): Promise<void> {
    await this.vehicleRepo.generateRoutesFromSchedules(date);
  }
}
