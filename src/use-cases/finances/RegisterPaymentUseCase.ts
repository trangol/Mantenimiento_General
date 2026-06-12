/**
 * RegisterPaymentUseCase — Registra un pago (total o parcial) sobre una factura.
 *
 * Reglas de negocio:
 * - El monto debe ser mayor a 0 y no superar el saldo pendiente.
 * - No se aceptan pagos sobre facturas pagadas o anuladas.
 * - El repositorio recalcula paidAmount/pendingAmount y el estado en una
 *   transacción: 'paid' si el saldo llega a 0 (con paidAt), 'partial' si queda saldo.
 */

import { Invoice, PaymentMethod } from '@/core/domain/Invoice';
import { IInvoiceRepository } from '@/core/repositories/IInvoiceRepository';

export interface RegisterPaymentInput {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  registeredBy: string;
}

export class RegisterPaymentUseCase {
  constructor(private readonly invoices: IInvoiceRepository) {}

  async execute(input: RegisterPaymentInput): Promise<Invoice> {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error('El monto del pago debe ser mayor a 0');
    }

    const invoice = await this.invoices.getById(input.invoiceId);
    if (!invoice) throw new Error('Factura no encontrada');
    if (invoice.status === 'paid') throw new Error('La factura ya está pagada');
    if (invoice.status === 'cancelled') throw new Error('No se puede pagar una factura anulada');
    if (input.amount > invoice.pendingAmount) {
      throw new Error(
        `El monto supera el saldo pendiente ($${invoice.pendingAmount.toLocaleString('es-CL')})`
      );
    }

    // El repositorio aplica el pago en transacción y recalcula estado/saldos.
    // Nota: no incluir claves undefined (Firestore las rechaza dentro de arrays).
    await this.invoices.registerPayment(input.invoiceId, {
      invoiceId: input.invoiceId,
      amount: Math.round(input.amount),
      method: input.method,
      ...(input.reference ? { reference: input.reference } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
      paidAt: new Date(),
      registeredBy: input.registeredBy,
    });

    const updated = await this.invoices.getById(input.invoiceId);
    if (!updated) throw new Error('Error al recargar la factura tras el pago');
    return updated;
  }
}
