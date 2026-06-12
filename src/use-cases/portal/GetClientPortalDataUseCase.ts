/**
 * GetClientPortalDataUseCase — Carga todos los datos que ve el cliente final
 * en el Portal Cliente: sus datos, activos, historial, próximas visitas y
 * estado de cuenta.
 *
 * SRP: centraliza la agregación; el componente solo presenta.
 * DIP: depende de interfaces de repositorio.
 */

import { Client } from '@/core/domain/Client';
import { Asset } from '@/core/domain/Asset';
import { MaintenanceRecord } from '@/core/domain/MaintenanceRecord';
import { Invoice } from '@/core/domain/Invoice';
import { ServiceRequest } from '@/core/domain/ServiceRequest';
import { IClientRepository } from '@/core/repositories/IClientRepository';
import { IAssetRepository } from '@/core/repositories/IAssetRepository';
import { IMaintenanceRecordRepository } from '@/core/repositories/IMaintenanceRecordRepository';
import { IInvoiceRepository } from '@/core/repositories/IInvoiceRepository';
import { IServiceRequestRepository } from '@/core/repositories/IServiceRequestRepository';

export interface ClientPortalData {
  client: Client;
  assets: Asset[];
  /** Historial: mantenimientos completados, más recientes primero. */
  history: MaintenanceRecord[];
  /** Próximas visitas: pendientes con fecha >= hoy, más próximas primero. */
  upcomingVisits: MaintenanceRecord[];
  /** Facturas con saldo pendiente. */
  openInvoices: Invoice[];
  /** Saldo total adeudado. */
  totalDue: number;
  /** Solicitudes de servicio del cliente. */
  serviceRequests: ServiceRequest[];
}

export class GetClientPortalDataUseCase {
  constructor(
    private readonly clientRepo: IClientRepository,
    private readonly assetRepo: IAssetRepository,
    private readonly maintenanceRepo: IMaintenanceRecordRepository,
    private readonly invoiceRepo: IInvoiceRepository,
    private readonly serviceRequestRepo: IServiceRequestRepository,
  ) {}

  /** @returns null si el código de cliente no existe. */
  async execute(clientId: string): Promise<ClientPortalData | null> {
    const client = await this.clientRepo.getById(clientId);
    if (!client) return null;

    // Lecturas independientes en paralelo
    const [assets, records, invoices, serviceRequests] = await Promise.all([
      this.assetRepo.getByClientId(clientId),
      this.maintenanceRepo.getByClientId(clientId),
      this.invoiceRepo.getByClient(clientId),
      this.serviceRequestRepo.getByClient(clientId),
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const history = records
      .filter(r => r.status === 'completed')
      .sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());

    const upcomingVisits = records
      .filter(r => r.status === 'pending' && r.scheduledDate >= todayStart)
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

    const openInvoices = invoices.filter(
      i => i.pendingAmount > 0 && i.status !== 'cancelled' && i.status !== 'paid'
    );

    return {
      client,
      assets,
      history,
      upcomingVisits,
      openInvoices,
      totalDue: openInvoices.reduce((s, i) => s + i.pendingAmount, 0),
      serviceRequests,
    };
  }
}
