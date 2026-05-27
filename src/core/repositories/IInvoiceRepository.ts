import { Invoice, InvoiceStatus, Payment } from '../domain/Invoice';

export interface IInvoiceRepository {
  getAll(): Promise<Invoice[]>;
  getById(id: string): Promise<Invoice | null>;
  getByClient(clientId: string): Promise<Invoice[]>;
  getByStatus(status: InvoiceStatus): Promise<Invoice[]>;
  getOverdue(): Promise<Invoice[]>;
  create(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice>;
  update(id: string, data: Partial<Invoice>): Promise<Invoice>;
  registerPayment(invoiceId: string, payment: Omit<Payment, 'id'>): Promise<void>;
  getNextNumber(): Promise<string>;
  getSummaryByMonth(year: number, month: number): Promise<{ total: number; paid: number; pending: number }>;
}
