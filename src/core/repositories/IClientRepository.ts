import { Client } from '../domain/Client';
import { Page, PageRequest } from '../domain/Pagination';

export interface IClientRepository {
  getById(id: string): Promise<Client | null>;
  getAll(): Promise<Client[]>;
  /** Paginación cursor-based (orderBy businessName). */
  getPage(request: PageRequest): Promise<Page<Client>>;
  getByRut(rut: string): Promise<Client | null>;
  getByServiceType(serviceType: Client['serviceType']): Promise<Client[]>;
  create(client: Client): Promise<void>;
  update(id: string, client: Partial<Client>): Promise<void>;
  delete(id: string): Promise<void>;
}
