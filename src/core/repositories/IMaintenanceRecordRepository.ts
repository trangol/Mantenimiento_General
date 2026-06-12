import { MaintenanceRecord, MaintenanceStatus } from '../domain/MaintenanceRecord';
import { Page, PageRequest } from '../domain/Pagination';

export interface IMaintenanceRecordRepository {
  getById(id: string): Promise<MaintenanceRecord | null>;
  /** Paginación cursor-based (orderBy scheduledDate desc). */
  getPage(request: PageRequest): Promise<Page<MaintenanceRecord>>;
  getByAssetId(assetId: string): Promise<MaintenanceRecord[]>;
  getByTechnicianId(technicianId: string): Promise<MaintenanceRecord[]>;
  getByClientId(clientId: string): Promise<MaintenanceRecord[]>;
  create(record: MaintenanceRecord): Promise<void>;
  update(id: string, record: Partial<MaintenanceRecord>): Promise<void>;
  updateStatus(id: string, status: MaintenanceStatus): Promise<void>;
}
