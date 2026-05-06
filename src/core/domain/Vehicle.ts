export type VehicleStatus = 'active' | 'maintenance' | 'inactive';

export interface Vehicle {
  id: string;
  plate: string; // Patente
  brand: string;
  model: string;
  year: number;
  type: string; // 'furgón', 'camioneta', 'sedan'
  status: VehicleStatus;
  assignedDriverId?: string;
  assignedDriverName?: string;
  currentKm?: number;
  nextMaintenanceKm?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Route {
  id: string;
  name: string;
  date: Date;
  vehicleId: string;
  vehiclePlate: string;
  driverId: string;
  driverName: string;
  maintenanceRecordIds: string[]; // OTs asignadas en esta ruta
  estimatedDuration?: number; // minutos
  status: 'planned' | 'in_progress' | 'completed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
