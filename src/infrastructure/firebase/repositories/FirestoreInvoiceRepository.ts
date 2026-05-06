import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  query, where, orderBy, Timestamp, runTransaction, getCountFromServer,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Invoice, InvoiceStatus, Payment } from '@/core/domain/Invoice';
import { IInvoiceRepository } from '@/core/repositories/IInvoiceRepository';

function toInvoice(id: string, data: Record<string, unknown>): Invoice {
  return {
    ...data,
    id,
    dueDate: (data.dueDate as Timestamp)?.toDate?.() ?? new Date(),
    sentAt: data.sentAt ? (data.sentAt as Timestamp).toDate() : undefined,
    paidAt: data.paidAt ? (data.paidAt as Timestamp).toDate() : undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
    payments: ((data.payments as Record<string, unknown>[]) ?? []).map(p => ({
      ...p,
      paidAt: (p.paidAt as Timestamp)?.toDate?.() ?? new Date(),
    })),
  } as Invoice;
}

export class FirestoreInvoiceRepository implements IInvoiceRepository {
  private col = collection(db, 'invoices');

  async getAll(): Promise<Invoice[]> {
    const snap = await getDocs(query(this.col, orderBy('createdAt', 'desc')));
    return snap.docs.map(d => toInvoice(d.id, d.data() as Record<string, unknown>));
  }

  async getById(id: string): Promise<Invoice | null> {
    const snap = await getDoc(doc(this.col, id));
    return snap.exists() ? toInvoice(snap.id, snap.data() as Record<string, unknown>) : null;
  }

  async getByClient(clientId: string): Promise<Invoice[]> {
    const snap = await getDocs(query(this.col, where('clientId', '==', clientId), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => toInvoice(d.id, d.data() as Record<string, unknown>));
  }

  async getByStatus(status: InvoiceStatus): Promise<Invoice[]> {
    const snap = await getDocs(query(this.col, where('status', '==', status)));
    return snap.docs.map(d => toInvoice(d.id, d.data() as Record<string, unknown>));
  }

  async getOverdue(): Promise<Invoice[]> {
    const now = Timestamp.now();
    const snap = await getDocs(query(
      this.col,
      where('status', 'in', ['pending', 'partial']),
      where('dueDate', '<', now)
    ));
    return snap.docs.map(d => toInvoice(d.id, d.data() as Record<string, unknown>));
  }

  async create(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    const now = Timestamp.now();
    const ref = await addDoc(this.col, { ...invoice, createdAt: now, updatedAt: now });
    return { ...invoice, id: ref.id, createdAt: now.toDate(), updatedAt: now.toDate() };
  }

  async update(id: string, data: Partial<Invoice>): Promise<Invoice> {
    await updateDoc(doc(this.col, id), { ...data, updatedAt: Timestamp.now() });
    return (await this.getById(id))!;
  }

  async registerPayment(invoiceId: string, payment: Omit<Payment, 'id'>): Promise<void> {
    const invRef = doc(this.col, invoiceId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(invRef);
      if (!snap.exists()) throw new Error('Factura no encontrada');
      const inv = toInvoice(snap.id, snap.data() as Record<string, unknown>);
      const newPayment: Payment = { ...payment, id: crypto.randomUUID() };
      const newPaid = inv.paidAmount + payment.amount;
      const newPending = inv.total - newPaid;
      const newStatus: InvoiceStatus = newPending <= 0 ? 'paid' : 'partial';
      tx.update(invRef, {
        payments: [...inv.payments, newPayment],
        paidAmount: newPaid,
        pendingAmount: Math.max(0, newPending),
        status: newStatus,
        paidAt: newStatus === 'paid' ? Timestamp.now() : null,
        updatedAt: Timestamp.now(),
      });
    });
  }

  async getNextNumber(): Promise<string> {
    const snap = await getCountFromServer(this.col);
    const num = (snap.data().count + 1).toString().padStart(4, '0');
    return `FAC-${num}`;
  }

  async getSummaryByMonth(year: number, month: number): Promise<{ total: number; paid: number; pending: number }> {
    const all = await this.getAll();
    const filtered = all.filter(inv => {
      const d = inv.createdAt;
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    const total = filtered.reduce((s, i) => s + i.total, 0);
    const paid = filtered.reduce((s, i) => s + i.paidAmount, 0);
    return { total, paid, pending: total - paid };
  }
}
