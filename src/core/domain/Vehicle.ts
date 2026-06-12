export type VehicleStatus = 'active' | 'maintenance' | 'inactive';

export interface Vehicle {
  id: string;
  tenantId?: string;  // Multi-tenancy: empresa mantenedora dueña del dato
  plate: string; // Patente
  brand: string;
  model: string;
  year: number;
  type: 'furgón' | 'camioneta' | 'sedan' | 'otro';
  status: VehicleStatus;
  assignedDriverId?: string;
  assignedDriverName?: string;
  currentKm?: number;
  nextMaintenanceKm?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Frecuencia de visita programada para un cliente/activo.
 * Permite definir qué días y con qué periodicidad se atiende cada cliente.
 */
export type FrequencyType = 'weekly' | 'biweekly' | 'monthly' | 'custom';

export interface RecurringSchedule {
  id: string;
  tenantId?: string;  // Multi-tenancy: empresa mantenedora dueña del dato
  clientId: string;
  clientName: string;
  assetId?: string;
  assetName?: string;
  assignedTechnicianId: string;
  assignedTechnicianName: string;
  vehicleId: string;
  vehiclePlate: string;
  frequency: FrequencyType;
  daysOfWeek: number[]; // 0=Dom, 1=Lun, ..., 6=Sáb
  estimatedDurationMin: number;
  address: string;
  commune: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Parada individual dentro de una ruta diaria (una OT programada).
 */
export type RouteStopStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface RouteStop {
  id: string;
  routeId: string;
  order: number;
  clientId: string;
  clientName: string;
  address: string;
  commune: string;
  assetId?: string;
  assetName?: string;
  technicianId: string;
  technicianName: string;
  estimatedDurationMin: number;
  scheduledTime?: string; // HH:MM estimado
  actualArrival?: Date;
  actualDeparture?: Date;
  status: RouteStopStatus;
  maintenanceRecordId?: string; // se llena al completar la OT
  notes?: string;
}

/**
 * Ruta diaria: vehículo + técnico + paradas ordenadas.
 */
export interface Route {
  id: string;
  tenantId?: string;  // Multi-tenancy: empresa mantenedora dueña del dato
  name: string;
  date: Date;
  vehicleId: string;
  vehiclePlate: string;
  driverId: string;
  driverName: string;
  stops: RouteStop[];
  estimatedDuration?: number; // minutos totales
  status: 'planned' | 'in_progress' | 'completed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
