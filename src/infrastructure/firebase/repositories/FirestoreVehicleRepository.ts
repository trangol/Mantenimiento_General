import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  query, where, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Vehicle, Route } from '@/core/domain/Vehicle';
import { IVehicleRepository } from '@/core/repositories/IVehicleRepository';

export class FirestoreVehicleRepository implements IVehicleRepository {
  private vCol = collection(db, 'vehicles');
  private rCol = collection(db, 'routes');

  async getAll(): Promise<Vehicle[]> {
    const snap = await getDocs(query(this.vCol, orderBy('plate')));
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Vehicle));
  }

  async getById(id: string): Promise<Vehicle | null> {
    const snap = await getDoc(doc(this.vCol, id));
    return snap.exists() ? { ...snap.data(), id: snap.id } as Vehicle : null;
  }

  async create(v: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vehicle> {
    const now = Timestamp.now();
    const ref = await addDoc(this.vCol, { ...v, createdAt: now, updatedAt: now });
    return { ...v, id: ref.id, createdAt: now.toDate(), updatedAt: now.toDate() };
  }

  async update(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
    await updateDoc(doc(this.vCol, id), { ...data, updatedAt: Timestamp.now() });
    return (await this.getById(id))!;
  }

  async getRoutes(date?: Date): Promise<Route[]> {
    let q;
    if (date) {
      const start = Timestamp.fromDate(new Date(date.setHours(0, 0, 0, 0)));
      const end = Timestamp.fromDate(new Date(date.setHours(23, 59, 59, 999)));
      q = query(this.rCol, where('date', '>=', start), where('date', '<=', end));
    } else {
      q = query(this.rCol, orderBy('date', 'desc'));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      ...d.data(), id: d.id,
      date: (d.data().date as Timestamp).toDate(),
      createdAt: (d.data().createdAt as Timestamp).toDate(),
      updatedAt: (d.data().updatedAt as Timestamp).toDate(),
    } as Route));
  }

  async createRoute(route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): Promise<Route> {
    const now = Timestamp.now();
    const ref = await addDoc(this.rCol, { ...route, createdAt: now, updatedAt: now });
    return { ...route, id: ref.id, createdAt: now.toDate(), updatedAt: now.toDate() };
  }

  async updateRoute(id: string, data: Partial<Route>): Promise<Route> {
    await updateDoc(doc(this.rCol, id), { ...data, updatedAt: Timestamp.now() });
    const snap = await getDoc(doc(this.rCol, id));
    return { ...snap.data(), id: snap.id } as Route;
  }
}
