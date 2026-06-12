import { ServiceRequest, ServiceRequestStatus } from '../domain/ServiceRequest';

export interface IServiceRequestRepository {
  getById(id: string): Promise<ServiceRequest | null>;
  getAll(): Promise<ServiceRequest[]>;
  getByClient(clientId: string): Promise<ServiceRequest[]>;
  getByStatus(status: ServiceRequestStatus): Promise<ServiceRequest[]>;
  create(request: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceRequest>;
  updateStatus(id: string, status: ServiceRequestStatus): Promise<void>;
}
