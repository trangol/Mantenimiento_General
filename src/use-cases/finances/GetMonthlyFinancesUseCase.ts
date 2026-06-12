/**
 * GetMonthlyFinancesUseCase — Resumen financiero de un mes:
 * facturación, cobranza, saldos, facturas vencidas y rendimiento por técnico.
 *
 * Cruza facturas (emitidas en el mes) con mantenimientos completados del mes.
 * Los mantenimientos se recorren con paginación cursor-based (scheduledDate desc)
 * y se corta el recorrido al pasar el inicio del mes consultado.
 */

import { IInvoiceRepository } from '@/core/repositories/IInvoiceRepository';
import { IMaintenanceRecordRepository } from '@/core/repositories/IMaintenanceRecordRepository';
import { MaintenanceRecord } from '@/core/domain/MaintenanceRecord';

export interface TechnicianPerformance {
  technicianId: string;
  technicianName: string;
  /** Cantidad de servicios (OTs completadas) en el mes */
  servicios: number;
  /** Monto total generado por esos servicios */
  monto: number;
}

export interface MonthlyFinances {
  totalFacturado: number;
  totalCobrado: number;
  totalPendiente: number;
  facturasVencidas: number;
  porTecnico: TechnicianPerformance[];
}

/** Tope de páginas a recorrer como protección ante volúmenes grandes */
const MAX_PAGES = 20;

export class GetMonthlyFinancesUseCase {
  constructor(
    private readonly invoices: IInvoiceRepository,
    private readonly maintenance: IMaintenanceRecordRepository,
  ) {}

  /** @param month Mes 1-12 */
  async execute(year: number, month: number): Promise<MonthlyFinances> {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1); // exclusivo

    const [allInvoices, monthRecords] = await Promise.all([
      this.invoices.getAll(),
      this.getCompletedRecordsOfMonth(monthStart, monthEnd),
    ]);

    // Facturas emitidas dentro del mes consultado (excluye anuladas)
    const monthInvoices = allInvoices.filter(inv =>
      inv.status !== 'cancelled' &&
      inv.createdAt >= monthStart && inv.createdAt < monthEnd
    );

    const totalFacturado = monthInvoices.reduce((s, i) => s + i.total, 0);
    const totalCobrado = monthInvoices.reduce((s, i) => s + i.paidAmount, 0);
    const totalPendiente = monthInvoices.reduce((s, i) => s + i.pendingAmount, 0);

    // Vencidas: con saldo pendiente y fecha de vencimiento pasada (del mes consultado)
    const now = new Date();
    const facturasVencidas = monthInvoices.filter(inv =>
      inv.pendingAmount > 0 &&
      (inv.status === 'overdue' || ((inv.status === 'pending' || inv.status === 'partial') && inv.dueDate < now))
    ).length;

    // Rendimiento por técnico a partir de OTs completadas en el mes
    const byTech = new Map<string, TechnicianPerformance>();
    for (const r of monthRecords) {
      const key = r.technicianId || 'sin_asignar';
      const entry = byTech.get(key) ?? {
        technicianId: key,
        technicianName: r.technicianName || 'Sin asignar',
        servicios: 0,
        monto: 0,
      };
      entry.servicios += 1;
      entry.monto += r.totalCost ?? 0;
      byTech.set(key, entry);
    }
    const porTecnico = [...byTech.values()].sort((a, b) => b.monto - a.monto);

    return { totalFacturado, totalCobrado, totalPendiente, facturasVencidas, porTecnico };
  }

  /** Recorre páginas (scheduledDate desc) hasta cubrir el mes consultado */
  private async getCompletedRecordsOfMonth(start: Date, end: Date): Promise<MaintenanceRecord[]> {
    const result: MaintenanceRecord[] = [];
    let cursor: string | null = null;
    for (let i = 0; i < MAX_PAGES; i++) {
      const page = await this.maintenance.getPage({ pageSize: 100, cursor });
      for (const record of page.items) {
        const date = record.completedAt ?? record.scheduledDate;
        if (record.status === 'completed' && date >= start && date < end) {
          result.push(record);
        }
      }
      // Orden desc por scheduledDate: si la última OT ya es anterior al mes, cortar
      const last = page.items[page.items.length - 1];
      if (!page.hasMore || !page.nextCursor || (last && last.scheduledDate < start)) break;
      cursor = page.nextCursor;
    }
    return result;
  }
}
