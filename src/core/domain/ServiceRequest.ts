/**
 * ServiceRequest — Entidad de dominio
 * Solicitud de servicio creada por el cliente final desde el Portal Cliente.
 *
 * SRP: solo describe los datos de la solicitud. El flujo de atención
 * (revisión → agendamiento → OT) se modela con `status`.
 */

export type ServiceRequestStatus = 'new' | 'in_review' | 'scheduled' | 'rejected' | 'closed';

export interface ServiceRequest {
  id: string;
  tenantId?: string;        // Multi-tenancy: empresa mantenedora dueña del dato
  clientId: string;         // FK → Client.id (CLI-XXXXXXXX)
  clientName?: string;      // Desnormalizado para la UI admin
  assetId?: string;         // Activo afectado (opcional)
  assetName?: string;       // Desnormalizado para la UI
  subject: string;          // Asunto breve (ej: "Agua turbia en piscina")
  description: string;      // Detalle de la solicitud
  contactPhone?: string;    // Teléfono de contacto preferido
  preferredDate?: Date;     // Fecha preferida por el cliente (opcional)
  status: ServiceRequestStatus;
  // Trazabilidad
  createdAt: Date;
  updatedAt: Date;
}
