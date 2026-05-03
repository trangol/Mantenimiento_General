import { Client } from '../domain/Client';

export interface IClientRepository {
  getById(id: string): Promise<Client | null>;
  getAll(): Promise<Client[]>;
  create(client: Client): Promise<void>;
  update(id: string, client: Partial<Client>): Promise<void>;
  delete(id: string): Promise<void>;
}
