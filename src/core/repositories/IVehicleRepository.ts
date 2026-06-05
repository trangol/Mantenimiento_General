import { Vehicle, Route, RouteStop, RecurringSchedule } from '../domain/Vehicle';

export interface IVehicleRepository {
  // Vehículos
  getAll(): Promise<Vehicle[]>;
  getById(id: string): Promise<Vehicle | null>;
  create(vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vehicle>;
  update(id: string, data: Partial<Vehicle>): Promise<Vehicle>;

  // Rutas diarias
  getRoutes(date?: Date): Promise<Route[]>;
  getRouteById(id: string): Promise<Route | null>;
  createRoute(route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): Promise<Route>;
  updateRoute(id: string, data: Partial<Route>): Promise<Route>;
  deleteRoute(id: string): Promise<void>;

  // Paradas de ruta
  addStop(routeId: string, stop: Omit<RouteStop, 'id' | 'routeId'>): Promise<RouteStop>;
  updateStop(routeId: string, stopId: string, data: Partial<RouteStop>): Promise<void>;
  removeStop(routeId: string, stopId: string): Promise<void>;
  reorderStops(routeId: string, orderedStopIds: string[]): Promise<void>;

  // Frecuencias programadas
  getSchedules(clientId?: string, vehicleId?: string): Promise<RecurringSchedule[]>;
  createSchedule(schedule: Omit<RecurringSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecurringSchedule>;
  updateSchedule(id: string, data: Partial<RecurringSchedule>): Promise<RecurringSchedule>;
  deleteSchedule(id: string): Promise<void>;

  // Generación automática de rutas desde frecuencias
  generateRoutesFromSchedules(date: Date): Promise<Route[]>;
}
