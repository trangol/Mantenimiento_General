/**
 * Tenant — Entidad de dominio (empresa mantenedora)
 *
 * MULTI-TENANCY: Cada empresa que usa MantOS es un tenant.
 * TODOS los documentos de Firestore llevan `tenantId` y TODAS las queries
 * filtran por él. Los datos de una empresa jamás se mezclan con otra.
 *
 * ID formato: TEN-XXXXXXXX (8 hex uppercase), consistente con CLI-/AST-.
 */

export type TenantStatus = 'active' | 'trial' | 'suspended';

export interface Tenant {
  id: string;                 // TEN-XXXXXXXX
  businessName: string;       // Razón social de la empresa mantenedora
  rut?: string;
  contactEmail: string;
  contactPhone?: string;
  plan: 'starter' | 'pro' | 'enterprise';
  status: TenantStatus;
  // Personalización
  logoUrl?: string;
  primaryServiceType?: string; // ej: 'piscinas'
  createdAt: Date;
  updatedAt: Date;
}

/** Toda entidad persistida debe portar su tenant. */
export interface TenantScoped {
  tenantId: string;
}

export function generateTenantId(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `TEN-${hex}`;
}
