import { IClientRepository } from '@/core/repositories/IClientRepository';
import { Client } from '@/core/domain/Client';

/**
 * UpdateClientUseCase
 * Actualiza los datos de un cliente existente.
 *
 * SRP: Solo orquesta la actualización de datos de un cliente.
 */

export type UpdateClientInput = Partial<Omit<Client, 'id' | 'createdAt' | 'createdBy'>>;

export class UpdateClientUseCase {
  constructor(private clientRepository: IClientRepository) {}

  async execute(id: string, input: UpdateClientInput): Promise<void> {
    const existing = await this.clientRepository.getById(id);
    if (!existing) {
      throw new Error(`Cliente con ID ${id} no encontrado.`);
    }

    await this.clientRepository.update(id, {
      ...input,
      updatedAt: new Date(),
    });
  }
}
