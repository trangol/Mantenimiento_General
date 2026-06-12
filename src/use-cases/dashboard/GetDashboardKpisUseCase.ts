/**
 * GetDashboardKpisUseCase — Centraliza el cálculo de los KPIs del dashboard.
 *
 * SRP: toda la lógica de agregación vive aquí; la página solo presenta.
 * DIP: depende de las interfaces de repositorio, no de Firestore.
 *
 * Estrategia de lectura: los mantenimientos se obtienen vía getPage
 * (cursor-based, orderBy scheduledDate desc) paginando hasta cubrir el mes
 * actual más una ventana de retrovisión para detectar atrasados, con un
 * tope de páginas para acotar lecturas.
 */

import { MaintenanceRecord } from '@/core/domain/MaintenanceRecord';
import { InventoryItem } from '@/core/domain/InventoryItem';
import { IMaintenanceRecordRepository } from '@/core/repositories/IMaintenanceRecordRepository';
import { IInventoryRepository } from '@/core/repositories/IInventoryRepository';
import { IClientRepository } from '@/core/repositories/IClientRepository';

/** Rendimiento agregado de un técnico en el mes. */
export interface TechnicianPerformance {
  technicianId: string;
  technicianName: string;
  completedCount: number;       // Servicios completados en el mes
  avgServiceMinutes: number | null; // Promedio completedAt - startedAt (min), null si no hay datos
  totalRevenue: number;         // Suma de totalCost generado
}

/** Resultado completo de los KPIs del dashboard. */
export interface DashboardKpis {
  // StatCards
  monthCompleted: number;       // Mantenimientos completados en el mes
  monthTotal: number;           // Total de mantenimientos programados en el mes
  activeClients: number;        // Clientes con status 'active'
  monthRevenue: number;         // Suma totalCost de completados del mes
  complianceRate: number;       // % completados / programados no-cancelados del mes

  // Secciones
  technicianPerformance: TechnicianPerformance[];
  recentMaintenances: MaintenanceRecord[]; // Últimos 10 por fecha programada
  lowStockItems: InventoryItem[];          // Insumos bajo stock mínimo
  overdueMaintenances: MaintenanceRecord[]; // Vencidos y no completados
}

// Tope de páginas a leer (100 docs c/u) para no explotar lecturas Firestore.
const MAX_PAGES = 5;
// Ventana de retrovisión para detectar mantenimientos atrasados (días).
const OVERDUE_LOOKBACK_DAYS = 60;

export class GetDashboardKpisUseCase {
  constructor(
    private readonly maintenanceRepo: IMaintenanceRecordRepository,
    private readonly clientRepo: IClientRepository,
    private readonly inventoryRepo: IInventoryRepository,
  ) {}

  async execute(now: Date = new Date()): Promise<DashboardKpis> {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lookbackStart = new Date(now.getTime() - OVERDUE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const fetchFloor = lookbackStart < monthStart ? lookbackStart : monthStart;

    // Lecturas independientes en paralelo
    const [records, clients, lowStockItems] = await Promise.all([
      this.fetchRecordsSince(fetchFloor),
      this.clientRepo.getAll(),
      this.inventoryRepo.getLowStock(),
    ]);

    // ── Mantenimientos del mes ────────────────────────────────────────────
    const monthRecords = records.filter(r => r.scheduledDate >= monthStart);
    const monthCompleted = monthRecords.filter(r => r.status === 'completed');
    const monthScheduled = monthRecords.filter(r => r.status !== 'cancelled');

    const monthRevenue = monthCompleted.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const complianceRate = monthScheduled.length > 0
      ? Math.round((monthCompleted.length / monthScheduled.length) * 100)
      : 0;

    // ── Rendimiento por técnico (completados del mes) ─────────────────────
    const byTech = new Map<string, { name: string; records: MaintenanceRecord[] }>();
    for (const r of monthCompleted) {
      const key = r.technicianId || r.technicianName || 'sin-asignar';
      if (!byTech.has(key)) {
        byTech.set(key, { name: r.technicianName || 'Sin asignar', records: [] });
      }
      byTech.get(key)!.records.push(r);
    }
    const technicianPerformance: TechnicianPerformance[] = Array.from(byTech.entries())
      .map(([id, { name, records: recs }]) => {
        const durations = recs
          .filter(r => r.startedAt && r.completedAt && r.completedAt > r.startedAt)
          .map(r => (r.completedAt!.getTime() - r.startedAt!.getTime()) / 60000);
        return {
          technicianId: id,
          technicianName: name,
          completedCount: recs.length,
          avgServiceMinutes: durations.length > 0
            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
            : null,
          totalRevenue: recs.reduce((s, r) => s + (r.totalCost || 0), 0),
        };
      })
      .sort((a, b) => b.completedCount - a.completedCount);

    // ── Mantenimientos vencidos no completados ────────────────────────────
    const overdueMaintenances = records
      .filter(r => (r.status === 'pending' || r.status === 'in_progress') && r.scheduledDate < now)
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

    return {
      monthCompleted: monthCompleted.length,
      monthTotal: monthScheduled.length,
      activeClients: clients.filter(c => c.status === 'active').length,
      monthRevenue,
      complianceRate,
      technicianPerformance,
      recentMaintenances: records.slice(0, 10),
      lowStockItems,
      overdueMaintenances,
    };
  }

  /**
   * Pagina getPage (desc por scheduledDate) hasta encontrar registros
   * anteriores a `floor` o agotar el tope de páginas.
   */
  private async fetchRecordsSince(floor: Date): Promise<MaintenanceRecord[]> {
    const all: MaintenanceRecord[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await this.maintenanceRepo.getPage({ pageSize: 100, cursor });
      all.push(...result.items);
      const oldest = result.items[result.items.length - 1];
      if (!result.hasMore || !result.nextCursor || (oldest && oldest.scheduledDate < floor)) break;
      cursor = result.nextCursor;
    }
    return all;
  }
}
