import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, Timestamp, getCountFromServer,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Quote, QuoteStatus } from '@/core/domain/Quote';
import { IQuoteRepository } from '@/core/repositories/IQuoteRepository';
import { tenantWhere, stampTenant, belongsToTenant, stripUndefined } from '@/infrastructure/firebase/tenantScope';

function toQuote(id: string, data: Record<string, unknown>): Quote {
  return {
    ...data,
    id,
    validUntil: (data.validUntil as Timestamp)?.toDate?.() ?? new Date(),
    sentAt: data.sentAt ? (data.sentAt as Timestamp).toDate() : undefined,
    respondedAt: data.respondedAt ? (data.respondedAt as Timestamp).toDate() : undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
  } as Quote;
}

export class FirestoreQuoteRepository implements IQuoteRepository {
  private col = collection(db, 'quotes');

  async getAll(): Promise<Quote[]> {
    const snap = await getDocs(query(this.col, tenantWhere()));
    // Orden en memoria: evita índice compuesto (tenantId + createdAt). Ver CLAUDE.md §Índices
    return snap.docs
      .map(d => toQuote(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getById(id: string): Promise<Quote | null> {
    const snap = await getDoc(doc(this.col, id));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    // Aislamiento multi-tenant: nunca exponer datos de otro tenant
    if (!belongsToTenant(data)) return null;
    return toQuote(snap.id, data);
  }

  async getByClient(clientId: string): Promise<Quote[]> {
    const snap = await getDocs(query(this.col, tenantWhere(), where('clientId', '==', clientId)));
    // Orden en memoria: evita índice compuesto (tenantId + createdAt). Ver CLAUDE.md §Índices
    return snap.docs
      .map(d => toQuote(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getByStatus(status: QuoteStatus): Promise<Quote[]> {
    const snap = await getDocs(query(this.col, tenantWhere(), where('status', '==', status)));
    // Orden en memoria: evita índice compuesto (tenantId + createdAt). Ver CLAUDE.md §Índices
    return snap.docs
      .map(d => toQuote(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async create(quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quote> {
    const now = Timestamp.now();
    const ref = await addDoc(this.col, stampTenant(stripUndefined({ ...quote, createdAt: now, updatedAt: now })));
    return { ...quote, id: ref.id, createdAt: now.toDate(), updatedAt: now.toDate() };
  }

  async update(id: string, data: Partial<Quote>): Promise<Quote> {
    await updateDoc(doc(this.col, id), { ...data, updatedAt: Timestamp.now() });
    return (await this.getById(id))!;
  }

  async updateStatus(id: string, status: QuoteStatus): Promise<void> {
    await updateDoc(doc(this.col, id), { status, updatedAt: Timestamp.now() });
  }

  async delete(id: string): Promise<void> {
    // Eliminación real: el use case (DeleteQuoteUseCase) garantiza que solo
    // se eliminan borradores ('draft'); el resto de estados se conserva
    // para trazabilidad del negocio.
    await deleteDoc(doc(this.col, id));
  }

  async getNextNumber(): Promise<string> {
    const snap = await getCountFromServer(query(this.col, tenantWhere()));
    const num = (snap.data().count + 1).toString().padStart(4, '0');
    return `COT-${num}`;
  }
}
