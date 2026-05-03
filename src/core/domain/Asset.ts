// OCP: Utilizamos un Record para 'metadata' permitiendo flexibilidad para diferentes rubros
export interface Asset {
  id: string;
  clientId: string;
  name: string; // Ej. "Piscina Principal", "Tablero Eléctrico"
  type: string; // Ej. "piscina", "hvac", "motor"
  qrCodeId: string; // ID único impreso en el código QR físico
  brand?: string;
  model?: string;
  maintenanceFrequencyDays: number;
  metadata: Record<string, any>; // Ej. { volume_m3: 50, filterType: 'arena' }
  createdAt: Date;
  updatedAt: Date;
}
