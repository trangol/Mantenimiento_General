/**
 * Client — Entidad de dominio
 * Representa a un cliente que contrata servicios de mantenimiento.
 *
 * SRP: Solo describe los datos del cliente.
 * OCP: El campo `notes` y `metadata` permiten extensiones sin modificar la interfaz base.
 */

export type ClientStatus = 'active' | 'inactive' | 'suspended';

export type ServiceType =
  | 'piscinas'
  | 'hvac'
  | 'seguridad_electronica'
  | 'incendio'
  | 'motores'
  | 'tableros'
  | 'general'
  | 'otro';

export interface Client {
  id: string;               // Formato: CLI-XXXXXXXX (generado automáticamente)
  tenantId?: string;  // Multi-tenancy: empresa mantenedora dueña del dato
  rut?: string;             // RUT chileno (ej: 76.345.123-4)
  businessName: string;     // Razón social o nombre
  contactName: string;      // Nombre del contacto principal
  contactEmail: string;
  contactPhone: string;
  address: string;
  sector?: string;          // Sector/zona geográfica para logística (ej: "Las Condes Norte")
  commune?: string;         // Comuna (ej: "Las Condes")
  city?: string;            // Ciudad (default: "Santiago")
  serviceType: ServiceType; // Tipo de servicio principal que se presta
  status: ClientStatus;
  notes?: string;           // Observaciones generales del cliente
  // Campos de trazabilidad
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;       // ID del técnico/admin que registró el cliente
}
