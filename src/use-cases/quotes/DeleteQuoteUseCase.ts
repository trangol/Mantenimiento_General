/**
 * DeleteQuoteUseCase — Eliminación de cotizaciones
 *
 * SRP: Solo gestiona la eliminación.
 * Regla de negocio: solo se pueden eliminar borradores ('draft').
 * Las cotizaciones enviadas/respondidas se conservan por trazabilidad.
 */

import { IQuoteRepository } from '@/core/repositories/IQuoteRepository';

export class DeleteQuoteUseCase {
  constructor(private readonly quoteRepo: IQuoteRepository) {}

  async execute(quoteId: string): Promise<void> {
    const quote = await this.quoteRepo.getById(quoteId);
    if (!quote) throw new Error('Cotización no encontrada');
    if (quote.status !== 'draft') {
      throw new Error('Solo se pueden eliminar cotizaciones en estado borrador');
    }
    await this.quoteRepo.delete(quoteId);
  }
}
