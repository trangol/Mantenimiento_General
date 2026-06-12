import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ServiceRequest, ServiceRequestStatus } from '@/core/domain/ServiceRequest';
import { IServiceRequestRepository } from '@/core/repositories/IServiceRequestRepository';
import { tenantWhere, stampTenant, belongsToTenant, stripUndefined } from '@/infrastructure/firebase/tenantScope';

function toServiceRequest(id: string, data: Record<string, unknown>): ServiceRequest {
  return {
    ...data,
    id,
    preferredDate: data.preferredDate ? (data.preferredDate as Timestamp).toDate() : undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
  } as ServiceRequest;
}

export class FirestoreServiceRequestRepository implements IServiceRequestRepository {
  private col = collection(db, 'service_requests');

  async getById(id: string): Promise<ServiceRequest | null> {
    const snap = await getDoc(doc(this.col, id));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    // Aislamiento multi-tenant: nunca exponer datos de otro tenant
    if (!belongsToTenant(data)) return null;
    return toServiceRequest(snap.id, data);
  }

  async getAll(): Promise<ServiceRequest[]> {
    const snap = await getDocs(query(this.col, tenantWhere()));
    // Orden en memoria: evita índice compuesto (tenantId + createdAt). Ver CLAUDE.md §Índices
    return snap.docs
      .map(d => toServiceRequest(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getByClient(clientId: string): Promise<ServiceRequest[]> {
    const snap = await getDocs(query(this.col, tenantWhere(), where('clientId', '==', clientId)));
    return snap.docs
      .map(d => toServiceRequest(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getByStatus(status: ServiceRequestStatus): Promise<ServiceRequest[]> {
    const snap = await getDocs(query(this.col, tenantWhere(), where('status', '==', status)));
    return snap.docs.map(d => toServiceRequest(d.id, d.data() as Record<string, unknown>));
  }

  async create(request: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceRequest> {
    const now = Timestamp.now();
    // Toda escritura se estampa con el tenant activo
    const ref = await addDoc(this.col, stampTenant(stripUndefined({
      ...request,
      preferredDate: request.preferredDate ? Timestamp.fromDate(request.preferredDate) : undefined,
      createdAt: now,
      updatedAt: now,
    })));
    return { ...request, id: ref.id, createdAt: now.toDate(), updatedAt: now.toDate() };
  }

  async updateStatus(id: string, status: ServiceRequestStatus): Promise<void> {
    await updateDoc(doc(this.col, id), { status, updatedAt: Timestamp.now() });
  }
}
