import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Vehicle, Route, RouteStop, RecurringSchedule } from '@/core/domain/Vehicle';
import { IVehicleRepository } from '@/core/repositories/IVehicleRepository';
import { tenantWhere, stampTenant, belongsToTenant, stripUndefined } from '@/infrastructure/firebase/tenantScope';

// ── helpers ──────────────────────────────────────────────────────────────────

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v as string);
}

function mapVehicle(id: string, data: Record<string, unknown>): Vehicle {
  return {
    ...(data as Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>),
    id,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function mapRoute(id: string, data: Record<string, unknown>): Route {
  const stops = ((data.stops ?? []) as RouteStop[]).map(s => ({
    ...s,
    actualArrival: s.actualArrival ? toDate(s.actualArrival) : undefined,
    actualDeparture: s.actualDeparture ? toDate(s.actualDeparture) : undefined,
  }));
  return {
    ...(data as Omit<Route, 'id' | 'date' | 'stops' | 'createdAt' | 'updatedAt'>),
    id,
    date: toDate(data.date),
    stops,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function mapSchedule(id: string, data: Record<string, unknown>): RecurringSchedule {
  return {
    ...(data as Omit<RecurringSchedule, 'id' | 'createdAt' | 'updatedAt'>),
    id,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

// ── repository ────────────────────────────────────────────────────────────────

export class FirestoreVehicleRepository implements IVehicleRepository {
  private vCol = collection(db, 'vehicles');
  private rCol = collection(db, 'routes');
  private sCol = collection(db, 'recurring_schedules');

  // ── Vehicles ─────────────────────────────────────────────────────────────

  async getAll(): Promise<Vehicle[]> {
    const snap = await getDocs(query(this.vCol, tenantWhere(), orderBy('plate')));
    return snap.docs.map(d => mapVehicle(d.id, d.data() as Record<string, unknown>));
  }

  async getById(id: string): Promise<Vehicle | null> {
    const snap = await getDoc(doc(this.vCol, id));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    // Aislamiento multi-tenant: nunca exponer datos de otro tenant
    if (!belongsToTenant(data)) return null;
    return mapVehicle(snap.id, data);
  }

  async create(v: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vehicle> {
    const now = Timestamp.now();
    const ref = await addDoc(this.vCol, stampTenant(stripUndefined({ ...v, createdAt: now, updatedAt: now })));
    return mapVehicle(ref.id, { ...v, createdAt: now, updatedAt: now });
  }

  async update(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
    await updateDoc(doc(this.vCol, id), { ...data, updatedAt: Timestamp.now() });
    return (await this.getById(id))!;
  }

  // ── Routes ────────────────────────────────────────────────────────────────

  async getRoutes(date?: Date): Promise<Route[]> {
    let q;
    if (date) {
      const d = new Date(date);
      const start = Timestamp.fromDate(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0));
      const end   = Timestamp.fromDate(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59));
      q = query(this.rCol, tenantWhere(), where('date', '>=', start), where('date', '<=', end), orderBy('date'));
    } else {
      q = query(this.rCol, tenantWhere(), orderBy('date', 'desc'));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => mapRoute(d.id, d.data() as Record<string, unknown>));
  }

  async getRouteById(id: string): Promise<Route | null> {
    const snap = await getDoc(doc(this.rCol, id));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    // Aislamiento multi-tenant: nunca exponer datos de otro tenant
    if (!belongsToTenant(data)) return null;
    return mapRoute(snap.id, data);
  }

  async createRoute(route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): Promise<Route> {
    const now = Timestamp.now();
    const payload = stampTenant(stripUndefined({ ...route, date: Timestamp.fromDate(route.date), createdAt: now, updatedAt: now }));
    const ref = await addDoc(this.rCol, payload);
    return mapRoute(ref.id, { ...payload });
  }

  async updateRoute(id: string, data: Partial<Route>): Promise<Route> {
    const payload: Record<string, unknown> = { ...data, updatedAt: Timestamp.now() };
    if (data.date) payload.date = Timestamp.fromDate(data.date);
    await updateDoc(doc(this.rCol, id), payload);
    return (await this.getRouteById(id))!;
  }

  async deleteRoute(id: string): Promise<void> {
    await deleteDoc(doc(this.rCol, id));
  }

  // ── Stops (stored as array inside route doc) ──────────────────────────────

  async addStop(routeId: string, stop: Omit<RouteStop, 'id' | 'routeId'>): Promise<RouteStop> {
    const newStop: RouteStop = {
      ...stop,
      id: crypto.randomUUID(),
      routeId,
    };
    await updateDoc(doc(this.rCol, routeId), {
      stops: arrayUnion(newStop),
      updatedAt: Timestamp.now(),
    });
    return newStop;
  }

  async updateStop(routeId: string, stopId: string, data: Partial<RouteStop>): Promise<void> {
    const route = await this.getRouteById(routeId);
    if (!route) return;
    const stops = route.stops.map(s => s.id === stopId ? { ...s, ...data } : s);
    await updateDoc(doc(this.rCol, routeId), { stops, updatedAt: Timestamp.now() });
  }

  async removeStop(routeId: string, stopId: string): Promise<void> {
    const route = await this.getRouteById(routeId);
    if (!route) return;
    const stops = route.stops.filter(s => s.id !== stopId);
    await updateDoc(doc(this.rCol, routeId), { stops, updatedAt: Timestamp.now() });
  }

  async reorderStops(routeId: string, orderedStopIds: string[]): Promise<void> {
    const route = await this.getRouteById(routeId);
    if (!route) return;
    const stopMap = new Map(route.stops.map(s => [s.id, s]));
    const stops = orderedStopIds
      .map((id, idx) => stopMap.has(id) ? { ...stopMap.get(id)!, order: idx + 1 } : null)
      .filter(Boolean);
    await updateDoc(doc(this.rCol, routeId), { stops, updatedAt: Timestamp.now() });
  }

  // ── Recurring Schedules ───────────────────────────────────────────────────

  async getSchedules(clientId?: string, vehicleId?: string): Promise<RecurringSchedule[]> {
    let q;
    if (clientId) {
      q = query(this.sCol, tenantWhere(), where('clientId', '==', clientId), where('isActive', '==', true));
    } else if (vehicleId) {
      q = query(this.sCol, tenantWhere(), where('vehicleId', '==', vehicleId), where('isActive', '==', true));
    } else {
      q = query(this.sCol, tenantWhere(), where('isActive', '==', true), orderBy('clientName'));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => mapSchedule(d.id, d.data() as Record<string, unknown>));
  }

  async createSchedule(schedule: Omit<RecurringSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecurringSchedule> {
    const now = Timestamp.now();
    const ref = await addDoc(this.sCol, stampTenant(stripUndefined({ ...schedule, createdAt: now, updatedAt: now })));
    return mapSchedule(ref.id, { ...schedule, createdAt: now, updatedAt: now });
  }

  async updateSchedule(id: string, data: Partial<RecurringSchedule>): Promise<RecurringSchedule> {
    await updateDoc(doc(this.sCol, id), { ...data, updatedAt: Timestamp.now() });
    const snap = await getDoc(doc(this.sCol, id));
    return mapSchedule(snap.id, snap.data() as Record<string, unknown>);
  }

  async deleteSchedule(id: string): Promise<void> {
    await updateDoc(doc(this.sCol, id), { isActive: false, updatedAt: Timestamp.now() });
  }

  // ── Generate routes from schedules ────────────────────────────────────────

  async generateRoutesFromSchedules(date: Date): Promise<Route[]> {
    const dayOfWeek = date.getDay();
    const snap = await getDocs(
      query(this.sCol, tenantWhere(), where('isActive', '==', true), where('daysOfWeek', 'array-contains', dayOfWeek))
    );
    if (snap.empty) return [];

    const schedules = snap.docs.map(d => mapSchedule(d.id, d.data() as Record<string, unknown>));

    // Group by vehicleId
    const byVehicle = new Map<string, RecurringSchedule[]>();
    for (const s of schedules) {
      const arr = byVehicle.get(s.vehicleId) ?? [];
      arr.push(s);
      byVehicle.set(s.vehicleId, arr);
    }

    const created: Route[] = [];
    // Check which vehicles already have a route for that date
    const existingRoutes = await this.getRoutes(date);
    const vehiclesWithRoute = new Set(existingRoutes.map(r => r.vehicleId));

    for (const [vehicleId, items] of byVehicle) {
      if (vehiclesWithRoute.has(vehicleId)) continue; // skip, already has route

      const first = items[0];
      const stops: RouteStop[] = items.map((s, idx) => ({
        id: crypto.randomUUID(),
        routeId: '',
        order: idx + 1,
        clientId: s.clientId,
        clientName: s.clientName,
        address: s.address,
        commune: s.commune,
        assetId: s.assetId,
        assetName: s.assetName,
        technicianId: s.assignedTechnicianId,
        technicianName: s.assignedTechnicianName,
        estimatedDurationMin: s.estimatedDurationMin,
        status: 'pending' as const,
      }));

      const route = await this.createRoute({
        name: `Ruta ${first.vehiclePlate} — ${date.toLocaleDateString('es-CL')}`,
        date,
        vehicleId,
        vehiclePlate: first.vehiclePlate,
        driverId: first.assignedTechnicianId,
        driverName: first.assignedTechnicianName,
        stops: stops.map(s => ({ ...s, routeId: '' })),
        estimatedDuration: items.reduce((sum, s) => sum + s.estimatedDurationMin, 0),
        status: 'planned',
      });
      created.push(route);
    }

    return created;
  }
}
