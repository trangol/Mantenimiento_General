/**
 * Pagination — Tipos de paginación cursor-based (buena práctica Firestore).
 *
 * NUNCA usar offset/limit clásico en Firestore (cobra todas las lecturas
 * saltadas). Siempre cursor (startAfter) + limit.
 */

export interface PageRequest {
  /** Tamaño de página. Default 25, máximo 100. */
  pageSize?: number;
  /** Cursor opaco devuelto por la página anterior (null = primera página). */
  cursor?: string | null;
}

export interface Page<T> {
  items: T[];
  /** Cursor para pedir la página siguiente. null si no hay más. */
  nextCursor: string | null;
  hasMore: boolean;
}

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export function clampPageSize(size?: number): number {
  if (!size || size < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(size, MAX_PAGE_SIZE);
}
