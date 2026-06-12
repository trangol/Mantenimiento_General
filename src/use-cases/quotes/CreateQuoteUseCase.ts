/**
 * CreateQuoteUseCase — Caso de uso para crear cotizaciones
 *
 * SRP: Solo se encarga de validar y crear una cotización.
 * DIP: Depende de la abstracción IQuoteRepository, no de Firestore.
 *
 * Reglas de negocio:
 * - Cada ítem debe tener cantidad > 0 y precio >= 0.
 * - Calcula subtotal por ítem (con descuento por ítem opcional),
 *   subtotal general, descuento global, IVA 19% y total.
 * - Genera el número correlativo (COT-0001) vía getNextNumber().
 * - Estado inicial: 'draft'.
 */

import { Quote, QuoteItem } from '@/core/domain/Quote';
import { IQuoteRepository } from '@/core/repositories/IQuoteRepository';

export interface CreateQuoteItemInput {
  inventoryItemId?: string; // Referencia opcional a inventario
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number; // % de descuento por ítem
}

export interface CreateQuoteInput {
  clientId: string;
  clientName: string;
  assetId?: string;
  validUntil: Date;
  items: CreateQuoteItemInput[];
  discountPercent?: number; // % de descuento global sobre el subtotal
  notes?: string;
  internalNotes?: string;
  createdBy: string;
}

const TAX_RATE = 0.19; // IVA chileno

export class CreateQuoteUseCase {
  constructor(private readonly quoteRepo: IQuoteRepository) {}

  async execute(input: CreateQuoteInput): Promise<Quote> {
    // ── Validaciones ──
    if (!input.clientId) throw new Error('Debe seleccionar un cliente');
    if (!input.items || input.items.length === 0) {
      throw new Error('La cotización debe tener al menos un ítem');
    }
    for (const item of input.items) {
      if (!item.description?.trim()) throw new Error('Todos los ítems deben tener descripción');
      if (!(item.quantity > 0)) throw new Error(`Cantidad inválida en "${item.description}": debe ser mayor a 0`);
      if (item.unitPrice < 0) throw new Error(`Precio inválido en "${item.description}": no puede ser negativo`);
    }
    const discountPercent = input.discountPercent ?? 0;
    if (discountPercent < 0 || discountPercent > 100) {
      throw new Error('El descuento debe estar entre 0% y 100%');
    }

    // ── Cálculos ──
    // Subtotal por ítem (aplica descuento por ítem si existe)
    const items: QuoteItem[] = input.items.map(i => {
      const itemDiscount = i.discount ?? 0;
      const lineSubtotal = Math.round(i.quantity * i.unitPrice * (1 - itemDiscount / 100));
      const item: QuoteItem = {
        description: i.description.trim(),
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: lineSubtotal,
      };
      // Solo incluir campos opcionales si tienen valor (Firestore no acepta undefined anidado)
      if (i.inventoryItemId) item.inventoryItemId = i.inventoryItemId;
      if (itemDiscount > 0) item.discount = itemDiscount;
      return item;
    });

    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const discountAmount = Math.round(subtotal * (discountPercent / 100));
    const netAmount = subtotal - discountAmount;
    const taxAmount = Math.round(netAmount * TAX_RATE);
    const total = netAmount + taxAmount;

    // ── Número correlativo ──
    const quoteNumber = await this.quoteRepo.getNextNumber();

    return this.quoteRepo.create({
      quoteNumber,
      clientId: input.clientId,
      clientName: input.clientName,
      assetId: input.assetId,
      status: 'draft',
      validUntil: input.validUntil,
      items,
      subtotal,
      discountAmount,
      taxRate: TAX_RATE,
      taxAmount,
      total,
      notes: input.notes,
      internalNotes: input.internalNotes,
      createdBy: input.createdBy,
    });
  }
}
