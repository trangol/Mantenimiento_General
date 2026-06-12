/**
 * UpdateQuoteStatusUseCase — Transiciones de estado de cotizaciones
 *
 * SRP: Solo gestiona el cambio de estado y sus efectos colaterales.
 * DIP: Depende de IQuoteRepository e IInventoryRepository (abstracciones).
 *
 * Transiciones válidas:
 *   draft → sent
 *   sent  → accepted | rejected | expired
 *   accepted / rejected → (terminales, sin salida)
 *
 * Al aceptar: descuenta stock de cada ítem vinculado a inventario,
 * registrando un movimiento de salida con motivo trazable.
 * Si el stock es insuficiente, descuenta hasta dejar en 0 y agrega
 * una advertencia al resultado (no aborta la operación).
 */

import { Quote, QuoteStatus } from '@/core/domain/Quote';
import { IQuoteRepository } from '@/core/repositories/IQuoteRepository';
import { IInventoryRepository } from '@/core/repositories/IInventoryRepository';
import { AdjustStockUseCase } from '@/use-cases/inventory/AdjustStockUseCase';

// Mapa de transiciones permitidas
const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [], // Estado terminal
  rejected: [], // Estado terminal
  expired: [],
};

export interface UpdateQuoteStatusResult {
  quote: Quote;
  warnings: string[]; // Advertencias de stock insuficiente
}

export class UpdateQuoteStatusUseCase {
  private readonly adjustStock: AdjustStockUseCase;

  constructor(
    private readonly quoteRepo: IQuoteRepository,
    private readonly inventoryRepo: IInventoryRepository,
  ) {
    this.adjustStock = new AdjustStockUseCase(inventoryRepo);
  }

  async execute(quoteId: string, newStatus: QuoteStatus, performedBy = 'admin'): Promise<UpdateQuoteStatusResult> {
    const quote = await this.quoteRepo.getById(quoteId);
    if (!quote) throw new Error('Cotización no encontrada');

    // Validar transición
    if (!VALID_TRANSITIONS[quote.status].includes(newStatus)) {
      throw new Error(`Transición inválida: no se puede pasar de "${quote.status}" a "${newStatus}"`);
    }

    const warnings: string[] = [];

    // Efecto colateral: al aceptar, descontar stock de los ítems con inventario
    if (newStatus === 'accepted') {
      for (const item of quote.items) {
        if (!item.inventoryItemId) continue; // Ítem libre, sin inventario

        const invItem = await this.inventoryRepo.getById(item.inventoryItemId);
        if (!invItem) {
          warnings.push(`"${item.description}": el insumo ya no existe en inventario, no se descontó stock.`);
          continue;
        }

        // Descontar hasta dejar el stock en 0 si no alcanza (sin abortar)
        const qtyToDeduct = Math.min(item.quantity, invItem.currentStock);
        if (qtyToDeduct < item.quantity) {
          warnings.push(
            `"${invItem.name}": stock insuficiente (disponible ${invItem.currentStock}, requerido ${item.quantity}). ` +
            `Se descontaron ${qtyToDeduct} ${invItem.unit} dejando el stock en 0.`
          );
        }
        if (qtyToDeduct > 0) {
          await this.adjustStock.execute({
            itemId: invItem.id,
            type: 'out',
            quantity: qtyToDeduct,
            reason: `Cotización ${quote.quoteNumber} aceptada`,
            referenceId: quote.id,
            unitCost: invItem.unitCost,
            performedBy,
          });
        }
      }
    }

    // Actualizar estado + timestamps de trazabilidad
    const extra: Partial<Quote> = { status: newStatus };
    if (newStatus === 'sent') extra.sentAt = new Date();
    if (newStatus === 'accepted' || newStatus === 'rejected') extra.respondedAt = new Date();

    const updated = await this.quoteRepo.update(quoteId, extra);
    return { quote: updated, warnings };
  }
}
