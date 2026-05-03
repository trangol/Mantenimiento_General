import { Asset } from '../domain/Asset';

export interface IAssetRepository {
  getById(id: string): Promise<Asset | null>;
  getByQrCode(qrCodeId: string): Promise<Asset | null>;
  getByClientId(clientId: string): Promise<Asset[]>;
  create(asset: Asset): Promise<void>;
  update(id: string, asset: Partial<Asset>): Promise<void>;
  delete(id: string): Promise<void>;
}
