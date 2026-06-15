export type InvoiceStatus = 'draft' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'transfer' | 'cash' | 'card' | 'cheque';

/** Período de agrupación de cobros */
export type BillingPeriodType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual' | 'biannual';

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
  tenantId?: string;  // Multi-tenancy: empresa mantenedora dueña del dato
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

  // ── Campos del flujo de cobro ─────────────────────────────────────────────
  periodType?: BillingPeriodType;  // Tipo de período que cubre esta factura
  periodStart?: Date;               // Inicio del período facturado
  periodEnd?: Date;                 // Fin del período facturado
  sentByEmail?: boolean;            // Si fue enviada por correo
  sentEmailAt?: Date;
  sentByWhatsapp?: boolean;
  publicToken?: string;             // Token para link público (portal cliente sin login)

  // ── Conciliación bancaria ─────────────────────────────────────────────────
  reconciled?: boolean;             // true = conciliada con archivo Excel de pagos
  reconciledAt?: Date;
  reconciledBy?: string;
  overdueRemindersSent?: number;    // Cantidad de recordatorios enviados

  createdAt: Date;
  updatedAt: Date;
}
