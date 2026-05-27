import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  query, where, orderBy, Timestamp, getCountFromServer,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Quote, QuoteStatus } from '@/core/domain/Quote';
import { IQuoteRepository } from '@/core/repositories/IQuoteRepository';

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
    const snap = await getDocs(query(this.col, orderBy('createdAt', 'desc')));
    return snap.docs.map(d => toQuote(d.id, d.data() as Record<string, unknown>));
  }

  async getById(id: string): Promise<Quote | null> {
    const snap = await getDoc(doc(this.col, id));
    return snap.exists() ? toQuote(snap.id, snap.data() as Record<string, unknown>) : null;
  }

  async getByClient(clientId: string): Promise<Quote[]> {
    const snap = await getDocs(query(this.col, where('clientId', '==', clientId), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => toQuote(d.id, d.data() as Record<string, unknown>));
  }

  async getByStatus(status: QuoteStatus): Promise<Quote[]> {
    const snap = await getDocs(query(this.col, where('status', '==', status), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => toQuote(d.id, d.data() as Record<string, unknown>));
  }

  async create(quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quote> {
    const now = Timestamp.now();
    const ref = await addDoc(this.col, { ...quote, createdAt: now, updatedAt: now });
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
    await updateDoc(doc(this.col, id), { status: 'expired', updatedAt: Timestamp.now() });
  }

  async getNextNumber(): Promise<string> {
    const snap = await getCountFromServer(this.col);
    const num = (snap.data().count + 1).toString().padStart(4, '0');
    return `COT-${num}`;
  }
}
