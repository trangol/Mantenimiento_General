/**
 * TenantContext — Fuente única del tenant activo en el cliente.
 *
 * Mientras no exista módulo de autenticación completo, el tenant activo se
 * resuelve así (en orden):
 *   1. localStorage 'mantos.tenantId' (seteado al iniciar sesión / elegir empresa)
 *   2. NEXT_PUBLIC_DEFAULT_TENANT_ID
 *   3. 'TEN-SIELCO01' (tenant semilla del primer cliente: empresa de piscinas)
 *
 * Cuando se integre Firebase Auth, el tenantId vendrá del custom claim del
 * token y este módulo solo cambiará internamente (DIP: los repositorios
 * dependen de getCurrentTenantId(), no de su implementación).
 *
 * REGLA: ningún repositorio ni componente debe hardcodear un tenantId.
 */

const STORAGE_KEY = 'mantos.tenantId';
export const DEFAULT_TENANT_ID =
  process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || 'TEN-SIELCO01';

let cached: string | null = null;

export function getCurrentTenantId(): string {
  if (cached) return cached;
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && /^TEN-[0-9A-Z]{4,16}$/.test(stored)) {
      cached = stored;
      return stored;
    }
  }
  cached = DEFAULT_TENANT_ID;
  return cached;
}

export function setCurrentTenantId(tenantId: string): void {
  if (!/^TEN-[0-9A-Z]{4,16}$/.test(tenantId)) {
    throw new Error(`tenantId inválido: ${tenantId}`);
  }
  cached = tenantId;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, tenantId);
  }
}

export function clearTenantCache(): void {
  cached = null;
}
