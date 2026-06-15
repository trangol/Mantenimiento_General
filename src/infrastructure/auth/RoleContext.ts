/**
 * RoleContext — Sistema de roles sin Firebase Auth (demo/desarrollo).
 *
 * Persiste en localStorage el rol activo y el ID del usuario.
 * Cuando se integre Firebase Auth, este módulo leerá los custom claims
 * del token en vez de localStorage (solo cambia aquí, los consumers no cambian).
 *
 * Roles:
 *   admin    → acceso completo al portal admin /(admin)
 *   tech     → acceso al portal técnico /(tech) - solo sus OTs del día
 *   client   → acceso al portal cliente /(client) - solo sus datos
 */

export type UserRole = 'admin' | 'tech' | 'client';

export interface RoleSession {
  role: UserRole;
  userId: string;       // ID del TeamMember (tech) o Client (client) o 'admin'
  userName: string;
  tenantId: string;
}

const STORAGE_KEY = 'mantos.session';

export function getSession(): RoleSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RoleSession;
  } catch { return null; }
}

export function setSession(session: RoleSession): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  // Sincronizar tenantId con TenantContext
  window.localStorage.setItem('mantos.tenantId', session.tenantId);
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function isAdmin(): boolean {
  return getSession()?.role === 'admin';
}

export function isTech(): boolean {
  return getSession()?.role === 'tech';
}

export function isClient(): boolean {
  return getSession()?.role === 'client';
}
