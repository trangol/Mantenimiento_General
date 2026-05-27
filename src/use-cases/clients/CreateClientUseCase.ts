import { IClientRepository } from '@/core/repositories/IClientRepository';
import { Client, ServiceType } from '@/core/domain/Client';

/**
 * CreateClientUseCase
 * Registra un nuevo cliente en el sistema y genera su ID único.
 *
 * SRP: Solo orquesta la creación de un cliente.
 * DIP: Depende de la interfaz IClientRepository, no de Firebase directamente.
 */

export interface CreateClientInput {
  rut?: string;
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  sector?: string;
  commune?: string;
  city?: string;
  serviceType: ServiceType;
  notes?: string;
  createdBy?: string;
}

export class CreateClientUseCase {
  constructor(private clientRepository: IClientRepository) {}

  async execute(input: CreateClientInput): Promise<Client> {
    // Validar RUT duplicado si fue proporcionado
    if (input.rut) {
      const existing = await this.clientRepository.getByRut(input.rut);
      if (existing) {
        throw new Error(`Ya existe un cliente registrado con el RUT ${input.rut}.`);
      }
    }

    // Generar ID único con prefijo CLI-
    const uniqueId = `CLI-${crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`;

    const now = new Date();
    const client: Client = {
      id: uniqueId,
      rut: input.rut,
      businessName: input.businessName.trim(),
      contactName: input.contactName.trim(),
      contactEmail: input.contactEmail.trim().toLowerCase(),
      contactPhone: input.contactPhone.trim(),
      address: input.address.trim(),
      sector: input.sector?.trim(),
      commune: input.commune?.trim(),
      city: input.city?.trim() || 'Santiago',
      serviceType: input.serviceType,
      status: 'active',
      notes: input.notes?.trim(),
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };

    await this.clientRepository.create(client);
    return client;
  }
}
