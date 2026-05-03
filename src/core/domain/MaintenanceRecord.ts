export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface SupplyUsage {
  inventoryItemId: string;
  name: string;
  quantity: number;
  unitCost: number; // Costo unitario para congelar el valor al momento del servicio
}

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  technicianId: string;
  clientId: string;
  status: MaintenanceStatus;
  
  scheduledDate: Date;
  startedAt?: Date; // Hora de inicio (al escanear QR)
  completedAt?: Date; // Hora de fin (al cerrar OT)
  
  initialPhotos: string[]; // URLs en Cloud Storage
  finalPhotos: string[];
  
  observations: string;
  suppliesUsed: SupplyUsage[]; // Insumos utilizados descontados de bodega
  
  totalCost: number; // Costo total calculado
  
  createdAt: Date;
  updatedAt: Date;
}
