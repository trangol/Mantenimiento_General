import { Vehicle, Route } from '../domain/Vehicle';

export interface IVehicleRepository {
  getAll(): Promise<Vehicle[]>;
  getById(id: string): Promise<Vehicle | null>;
  create(vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vehicle>;
  update(id: string, data: Partial<Vehicle>): Promise<Vehicle>;
  getRoutes(date?: Date): Promise<Route[]>;
  createRoute(route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): Promise<Route>;
  updateRoute(id: string, data: Partial<Route>): Promise<Route>;
}
