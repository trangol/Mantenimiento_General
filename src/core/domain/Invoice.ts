export type InvoiceStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'transfer' | 'cash' | 'card' | 'cheque';

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string; // Número de transferencia, cheque, etc.
  paidAt: Date;
  registeredBy: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // FAC-0001
  clientId: string;
  clientName: string;
  maintenanceRecordIds: string[]; // OTs incluidas
  quoteId?: string;
  status: InvoiceStatus;
  dueDate: Date;
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  pendingAmount: number;
  payments: Payment[];
  notes?: string;
  createdBy: string;
  sentAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
