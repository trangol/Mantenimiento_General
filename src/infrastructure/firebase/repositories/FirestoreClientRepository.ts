import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Client } from '@/core/domain/Client';
import { IClientRepository } from '@/core/repositories/IClientRepository';

/**
 * FirestoreClientRepository
 * Implementación concreta de IClientRepository para Firebase Firestore.
 *
 * SRP: Solo se preocupa de persistir/recuperar clientes.
 * DIP: Implementa la interfaz del dominio — el dominio no conoce Firebase.
 * LSP: Puede reemplazarse por cualquier otra implementación sin afectar use cases.
 */

const COL = 'clients';

/** Mapper Firestore → Domain */
function toDomain(id: string, data: Record<string, unknown>): Client {
  return {
    id,
    rut: (data.rut as string) || undefined,
    businessName: data.businessName as string,
    contactName: data.contactName as string,
    contactEmail: data.contactEmail as string,
    contactPhone: data.contactPhone as string,
    address: data.address as string,
    sector: (data.sector as string) || undefined,
    commune: (data.commune as string) || undefined,
    city: (data.city as string) || 'Santiago',
    serviceType: (data.serviceType as Client['serviceType']) || 'general',
    status: (data.status as Client['status']) || 'active',
    notes: (data.notes as string) || undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
    createdBy: (data.createdBy as string) || undefined,
  };
}

/** Mapper Domain → Firestore (excluye id, convierte Dates a Timestamps) */
function toFirestore(client: Omit<Client, 'id'>): Record<string, unknown> {
  return {
    ...client,
    createdAt: Timestamp.fromDate(client.createdAt),
    updatedAt: Timestamp.fromDate(client.updatedAt),
    installationDate: undefined, // no aplica para Client
  };
}

export class FirestoreClientRepository implements IClientRepository {
  private col = collection(db, COL);

  async getById(id: string): Promise<Client | null> {
    const snap = await getDoc(doc(this.col, id));
    if (!snap.exists()) return null;
    return toDomain(snap.id, snap.data() as Record<string, unknown>);
  }

  async getAll(): Promise<Client[]> {
    const snap = await getDocs(query(this.col, orderBy('businessName')));
    return snap.docs.map(d => toDomain(d.id, d.data() as Record<string, unknown>));
  }

  async getByRut(rut: string): Promise<Client | null> {
    const snap = await getDocs(query(this.col, where('rut', '==', rut)));
    if (snap.empty) return null;
    const d = snap.docs[0];
    return toDomain(d.id, d.data() as Record<string, unknown>);
  }

  async getByServiceType(serviceType: Client['serviceType']): Promise<Client[]> {
    const snap = await getDocs(query(this.col, where('serviceType', '==', serviceType)));
    return snap.docs.map(d => toDomain(d.id, d.data() as Record<string, unknown>));
  }

  async create(client: Client): Promise<void> {
    const { id, ...data } = client;
    await setDoc(doc(this.col, id), toFirestore(data));
  }

  async update(id: string, partial: Partial<Client>): Promise<void> {
    const ref = doc(this.col, id);
    await updateDoc(ref, {
      ...partial,
      updatedAt: Timestamp.now(),
    });
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.col, id));
  }
}
