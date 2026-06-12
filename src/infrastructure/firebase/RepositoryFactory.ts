/**
 * RepositoryFactory — Patrón Factory + Singleton
 * Centraliza la creación de todos los repositorios.
 * Se instancia una sola vez y devuelve siempre la misma instancia.
 *
 * OCP: Agregar nuevos repositorios solo requiere agregar un getter,
 *      sin modificar los consumers existentes.
 */

import { FirestoreMaintenanceRecordRepository } from './repositories/FirestoreMaintenanceRecordRepository';
import { FirestoreInventoryRepository } from './repositories/FirestoreInventoryRepository';
import { FirestoreQuoteRepository } from './repositories/FirestoreQuoteRepository';
import { FirestoreInvoiceRepository } from './repositories/FirestoreInvoiceRepository';
import { FirestoreVehicleRepository } from './repositories/FirestoreVehicleRepository';
import { FirestoreClientRepository } from './repositories/FirestoreClientRepository';
import { FirestoreAssetRepository } from './repositories/FirestoreAssetRepository';
import { FirestoreServiceRequestRepository } from './repositories/FirestoreServiceRequestRepository';

import { IMaintenanceRecordRepository } from '@/core/repositories/IMaintenanceRecordRepository';
import { IInventoryRepository } from '@/core/repositories/IInventoryRepository';
import { IQuoteRepository } from '@/core/repositories/IQuoteRepository';
import { IInvoiceRepository } from '@/core/repositories/IInvoiceRepository';
import { IVehicleRepository } from '@/core/repositories/IVehicleRepository';
import { IClientRepository } from '@/core/repositories/IClientRepository';
import { IAssetRepository } from '@/core/repositories/IAssetRepository';
import { IServiceRequestRepository } from '@/core/repositories/IServiceRequestRepository';

class RepositoryFactory {
  private static instance: RepositoryFactory;

  // Repositorios (lazy init)
  private _maintenance?: IMaintenanceRecordRepository;
  private _inventory?: IInventoryRepository;
  private _quotes?: IQuoteRepository;
  private _invoices?: IInvoiceRepository;
  private _vehicles?: IVehicleRepository;
  private _clients?: IClientRepository;
  private _assets?: IAssetRepository;
  private _serviceRequests?: IServiceRequestRepository;

  private constructor() {}

  static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory();
    }
    return RepositoryFactory.instance;
  }

  get maintenance(): IMaintenanceRecordRepository {
    if (!this._maintenance) this._maintenance = new FirestoreMaintenanceRecordRepository();
    return this._maintenance;
  }

  get inventory(): IInventoryRepository {
    if (!this._inventory) this._inventory = new FirestoreInventoryRepository();
    return this._inventory;
  }

  get quotes(): IQuoteRepository {
    if (!this._quotes) this._quotes = new FirestoreQuoteRepository();
    return this._quotes;
  }

  get invoices(): IInvoiceRepository {
    if (!this._invoices) this._invoices = new FirestoreInvoiceRepository();
    return this._invoices;
  }

  get vehicles(): IVehicleRepository {
    if (!this._vehicles) this._vehicles = new FirestoreVehicleRepository();
    return this._vehicles;
  }

  get clients(): IClientRepository {
    if (!this._clients) this._clients = new FirestoreClientRepository();
    return this._clients;
  }

  get assets(): IAssetRepository {
    if (!this._assets) this._assets = new FirestoreAssetRepository();
    return this._assets;
  }

  get serviceRequests(): IServiceRequestRepository {
    if (!this._serviceRequests) this._serviceRequests = new FirestoreServiceRequestRepository();
    return this._serviceRequests;
  }
}

// Exportar la instancia singleton
export const repositories = RepositoryFactory.getInstance();
