export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface QuoteItem {
  inventoryItemId?: string; // Referencia a inventario (puede ser sin stock)
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number; // Porcentaje de descuento
  subtotal: number;
}

export interface Quote {
  id: string;
  quoteNumber: string; // COT-0001
  clientId: string;
  clientName: string;
  assetId?: string;
  status: QuoteStatus;
  validUntil: Date;
  items: QuoteItem[];
  subtotal: number;
  discountAmount: number;
  taxRate: number; // IVA: 0.19
  taxAmount: number;
  total: number;
  notes?: string;
  internalNotes?: string;
  createdBy: string;
  sentAt?: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
