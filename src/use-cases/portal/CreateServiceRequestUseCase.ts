/**
 * CreateServiceRequestUseCase — Crea una solicitud de servicio desde el
 * Portal Cliente, validando los datos mínimos.
 */

import { ServiceRequest } from '@/core/domain/ServiceRequest';
import { IServiceRequestRepository } from '@/core/repositories/IServiceRequestRepository';

export interface CreateServiceRequestInput {
  clientId: string;
  clientName?: string;
  assetId?: string;
  assetName?: string;
  subject: string;
  description: string;
  contactPhone?: string;
  preferredDate?: Date;
}

export class CreateServiceRequestUseCase {
  constructor(private readonly repo: IServiceRequestRepository) {}

  async execute(input: CreateServiceRequestInput): Promise<ServiceRequest> {
    if (!input.clientId) throw new Error('clientId es requerido');
    if (!input.subject.trim()) throw new Error('El asunto es requerido');
    if (!input.description.trim()) throw new Error('La descripción es requerida');

    return this.repo.create({
      ...input,
      subject: input.subject.trim(),
      description: input.description.trim(),
      status: 'new',
    });
  }
}
