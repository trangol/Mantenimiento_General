import { IClientRepository } from '@/core/repositories/IClientRepository';
import { IAssetRepository } from '@/core/repositories/IAssetRepository';
import { Client } from '@/core/domain/Client';
import { Asset } from '@/core/domain/Asset';

/**
 * GetClientWithAssetsUseCase
 * Obtiene un cliente junto con todos sus activos registrados.
 *
 * SRP: Orquesta la consulta de cliente + activos relacionados.
 * ISP: Cada repositorio expone solo lo que se necesita.
 */

export interface ClientWithAssets {
  client: Client;
  assets: Asset[];
}

export class GetClientWithAssetsUseCase {
  constructor(
    private clientRepository: IClientRepository,
    private assetRepository: IAssetRepository
  ) {}

  async execute(clientId: string): Promise<ClientWithAssets> {
    const client = await this.clientRepository.getById(clientId);
    if (!client) {
      throw new Error(`Cliente con ID ${clientId} no encontrado.`);
    }

    const assets = await this.assetRepository.getByClientId(clientId);

    return { client, assets };
  }

  async executeAll(): Promise<ClientWithAssets[]> {
    const clients = await this.clientRepository.getAll();
    const results = await Promise.all(
      clients.map(async (client) => {
        const assets = await this.assetRepository.getByClientId(client.id);
        return { client, assets };
      })
    );
    return results;
  }
}
