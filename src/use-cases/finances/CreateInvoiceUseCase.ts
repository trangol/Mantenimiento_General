/**
 * CreateInvoiceUseCase — Crea una factura/cobro a partir de
 * mantenimientos completados de un cliente.
 *
 * Reglas de negocio:
 * - Solo se facturan OTs en estado 'completed' que pertenezcan al cliente.
 * - Subtotal = suma de totalCost de las OTs seleccionadas.
 * - IVA chileno 19% sobre el subtotal.
 * - Número correlativo vía repositorio (FAC-XXXX).
 * - La factura nace 'pending' con todo el monto por cobrar.
 */

import { Invoice } from '@/core/domain/Invoice';
import { IInvoiceRepository } from '@/core/repositories/IInvoiceRepository';
import { IMaintenanceRecordRepository } from '@/core/repositories/IMaintenanceRecordRepository';
import { IClientRepository } from '@/core/repositories/IClientRepository';

/** Tasa de IVA vigente en Chile */
export const IVA_RATE = 0.19;

export interface CreateInvoiceInput {
  clientId: string;
  maintenanceRecordIds: string[];
  dueDate: Date;
  notes?: string;
  createdBy: string;
}

export class CreateInvoiceUseCase {
  constructor(
    private readonly invoices: IInvoiceRepository,
    private readonly maintenance: IMaintenanceRecordRepository,
    private readonly clients: IClientRepository,
  ) {}

  async execute(input: CreateInvoiceInput): Promise<Invoice> {
    if (input.maintenanceRecordIds.length === 0) {
      throw new Error('Debes seleccionar al menos un mantenimiento para facturar');
    }

    const client = await this.clients.getById(input.clientId);
    if (!client) throw new Error('Cliente no encontrado');

    // Cargar y validar las OTs seleccionadas
    const records = await Promise.all(
      input.maintenanceRecordIds.map(id => this.maintenance.getById(id))
    );
    for (const record of records) {
      if (!record) throw new Error('Uno de los mantenimientos seleccionados no existe');
      if (record.clientId !== input.clientId) {
        throw new Error('Hay mantenimientos que no pertenecen al cliente seleccionado');
      }
      if (record.status !== 'completed') {
        throw new Error('Solo se pueden facturar mantenimientos completados');
      }
    }

    // Cálculo de montos (redondeo a peso chileno, sin decimales)
    const subtotal = records.reduce((sum, r) => sum + (r!.totalCost ?? 0), 0);
    const taxAmount = Math.round(subtotal * IVA_RATE);
    const total = subtotal + taxAmount;

    const invoiceNumber = await this.invoices.getNextNumber();

    return this.invoices.create({
      invoiceNumber,
      clientId: client.id,
      clientName: client.businessName,
      maintenanceRecordIds: input.maintenanceRecordIds,
      status: 'pending',
      dueDate: input.dueDate,
      subtotal,
      taxAmount,
      total,
      paidAmount: 0,
      pendingAmount: total,
      payments: [],
      notes: input.notes,
      createdBy: input.createdBy,
    });
  }
}
