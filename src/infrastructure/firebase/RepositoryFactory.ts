/**
 * RepositoryFactory — Patrón Factory + Singleton
 * Centraliza la creación de todos los repositorios.
 * Se instancia una sola vez y devuelve siempre la misma instancia.
 */

import { FirestoreMaintenanceRecordRepository } from './repositories/FirestoreMaintenanceRecordRepository';
import { FirestoreInventoryRepository } from './repositories/FirestoreInventoryRepository';
import { FirestoreQuoteRepository } from './repositories/FirestoreQuoteRepository';
import { FirestoreInvoiceRepository } from './repositories/FirestoreInvoiceRepository';
import { FirestoreVehicleRepository } from './repositories/FirestoreVehicleRepository';

import { IMaintenanceRecordRepository } from '@/core/repositories/IMaintenanceRecordRepository';
import { IInventoryRepository } from '@/core/repositories/IInventoryRepository';
import { IQuoteRepository } from '@/core/repositories/IQuoteRepository';
import { IInvoiceRepository } from '@/core/repositories/IInvoiceRepository';
import { IVehicleRepository } from '@/core/repositories/IVehicleRepository';

class RepositoryFactory {
  private static instance: RepositoryFactory;

  // Repositorios (lazy init)
  private _maintenance?: IMaintenanceRecordRepository;
  private _inventory?: IInventoryRepository;
  private _quotes?: IQuoteRepository;
  private _invoices?: IInvoiceRepository;
  private _vehicles?: IVehicleRepository;

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
}

// Exportar la instancia singleton
export const repositories = RepositoryFactory.getInstance();
