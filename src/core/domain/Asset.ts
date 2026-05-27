/**
 * Asset — Entidad de dominio
 * Representa un activo/equipo del cliente que requiere mantenimiento periódico.
 *
 * OCP: `metadata` permite atributos técnicos por tipo sin cambiar la interfaz base.
 *      `recurringSupplies` define los insumos estándar de cada activo.
 */

export type AssetType =
  | 'piscina'
  | 'hvac'
  | 'motor'
  | 'tablero'
  | 'seguridad_electronica'
  | 'incendio'
  | 'bomba'
  | 'generador'
  | 'ascensor'
  | 'otro';

export type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'decommissioned';

/**
 * Insumo recurrente asociado a un activo.
 * Permite precargar el carrito de insumos al iniciar un mantenimiento.
 */
export interface RecurringSupply {
  name: string;           // Nombre del insumo (ej: "Cloro Granulado")
  estimatedQty: number;   // Cantidad típica usada por mantención
  unit: string;           // Unidad (kg, L, unidad, m)
  notes?: string;         // Observaciones (ej: "según resultado de agua")
}

export interface Asset {
  id: string;                         // Formato: AST-XXXXXXXX
  clientId: string;                   // FK → Client.id
  name: string;                       // Ej: "Piscina Principal", "Tablero Eléctrico N°1"
  type: AssetType;
  qrCodeId: string;                   // ID único impreso en el QR físico (QR-XXXXXXXXXXXX)
  brand?: string;
  model?: string;
  serialNumber?: string;              // Número de serie del equipo
  installationDate?: Date;            // Fecha de instalación/puesta en marcha
  locationDescription?: string;       // Ubicación dentro del predio (ej: "Sector Poniente, piso 2")
  maintenanceFrequencyDays: number;   // Cada cuántos días se realiza mantención
  status: AssetStatus;
  // OCP: metadata técnica flexible por tipo de activo
  // Piscina: { volume_m3, filterType, pumpBrand, waterTreatment, poolType }
  // HVAC:    { btu, refrigerantType, interiorUnits }
  // Motor:   { powerHp, voltage, amperage }
  // Tablero: { voltage, amperage, phases, breakerCount }
  metadata: Record<string, string | number | boolean>;
  recurringSupplies: RecurringSupply[]; // Insumos estándar para este activo
  initialPhotos: string[];              // URLs de fotos del estado inicial (levantamiento)
  notes?: string;
  // Trazabilidad
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;                   // ID del técnico que hizo el levantamiento
}
