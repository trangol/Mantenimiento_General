export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/** Estado respecto al ciclo de cobro */
export type BillingStatus = 'unbilled' | 'in_preparation' | 'billed' | 'paid';

export interface SupplyUsage {
  inventoryItemId: string;
  name: string;
  quantity: number;
  unitCost: number; // Costo unitario para congelar el valor al momento del servicio
}

/** Ítem del protocolo de trabajo (checklist obligatorio) */
export interface ChecklistItem {
  id: string;
  label: string;         // Descripción del paso
  required: boolean;     // Si es obligatorio para poder cerrar el servicio
  completedAt?: Date;    // Cuándo fue marcado
  completedBy?: string;  // Quién lo marcó
  notes?: string;
}

export interface MaintenanceRecord {
  id: string;
  tenantId?: string;  // Multi-tenancy: empresa mantenedora dueña del dato
  assetId: string;
  assetName?: string; // Desnormalizado para la UI
  technicianId: string;
  technicianName?: string; // Desnormalizado para la UI
  clientId: string;
  clientName?: string; // Desnormalizado para la UI
  status: MaintenanceStatus;

  // ── Planificación (origen del trabajo) ────────────────────────────────────
  routeId?: string;          // ID de la ruta desde la que se generó (logística)
  workOrderNotes?: string;   // Instrucciones específicas de la orden de trabajo

  scheduledDate: Date;
  startedAt?: Date;     // Hora de inicio (al escanear QR entrada)
  completedAt?: Date;   // Hora de fin (al escanear QR salida o cerrar OT)

  // ── Protocolo ─────────────────────────────────────────────────────────────
  checklist: ChecklistItem[];  // Pasos obligatorios del protocolo
  checklistCompleted: boolean; // true cuando todos los required están marcados

  // ── Evidencia ─────────────────────────────────────────────────────────────
  initialPhotos: string[]; // URLs en Cloud Storage
  finalPhotos: string[];

  observations: string;
  suppliesUsed: SupplyUsage[]; // Insumos utilizados descontados de bodega

  // ── Tarifa y cobro ────────────────────────────────────────────────────────
  serviceRate?: number;  // Tarifa manual del servicio (si no viene de insumos)
  totalCost: number;     // Costo total = suppliesCost + serviceRate
  billingStatus: BillingStatus;  // Estado en el ciclo de cobro
  invoiceId?: string;    // FK → Invoice cuando está facturado

  createdAt: Date;
  updatedAt: Date;
}
