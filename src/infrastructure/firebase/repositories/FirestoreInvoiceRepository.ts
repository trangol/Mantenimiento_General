import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  query, where, Timestamp, runTransaction, getCountFromServer,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Invoice, InvoiceStatus, Payment } from '@/core/domain/Invoice';
import { IInvoiceRepository } from '@/core/repositories/IInvoiceRepository';
import { tenantWhere, stampTenant, belongsToTenant, stripUndefined } from '@/infrastructure/firebase/tenantScope';

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return undefined;
}

function toInvoice(id: string, data: Record<string, unknown>): Invoice {
  return {
    ...data,
    id,
    dueDate: toDate(data.dueDate) ?? new Date(),
    sentAt: toDate(data.sentAt),
    paidAt: toDate(data.paidAt),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    periodStart: toDate(data.periodStart),
    periodEnd: toDate(data.periodEnd),
    sentEmailAt: toDate(data.sentEmailAt),
    reconciledAt: toDate(data.reconciledAt),
    payments: ((data.payments as Record<string, unknown>[]) ?? []).map(p => ({
      ...p,
      paidAt: toDate(p.paidAt) ?? new Date(),
    })),
  } as Invoice;
}

export class FirestoreInvoiceRepository implements IInvoiceRepository {
  private col = collection(db, 'invoices');

  async getAll(): Promise<Invoice[]> {
    const snap = await getDocs(query(this.col, tenantWhere()));
    // Orden en memoria: evita índice compuesto (tenantId + createdAt). Ver CLAUDE.md §Índices
    return snap.docs
      .map(d => toInvoice(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getById(id: string): Promise<Invoice | null> {
    const snap = await getDoc(doc(this.col, id));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    // Aislamiento multi-tenant: nunca exponer datos de otro tenant
    if (!belongsToTenant(data)) return null;
    return toInvoice(snap.id, data);
  }

  async getByClient(clientId: string): Promise<Invoice[]> {
    const snap = await getDocs(query(this.col, tenantWhere(), where('clientId', '==', clientId)));
    // Orden en memoria: evita índice compuesto (tenantId + createdAt). Ver CLAUDE.md §Índices
    return snap.docs
      .map(d => toInvoice(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getByStatus(status: InvoiceStatus): Promise<Invoice[]> {
    const snap = await getDocs(query(this.col, tenantWhere(), where('status', '==', status)));
    return snap.docs.map(d => toInvoice(d.id, d.data() as Record<string, unknown>));
  }

  async getOverdue(): Promise<Invoice[]> {
    // Filtro de dueDate en memoria: where de desigualdad + tenantWhere exige
    // índice compuesto (tenantId + status + dueDate). Ver CLAUDE.md §Índices
    const now = new Date();
    const snap = await getDocs(query(
      this.col,
      tenantWhere(),
      where('status', 'in', ['pending', 'partial'])
    ));
    return snap.docs
      .map(d => toInvoice(d.id, d.data() as Record<string, unknown>))
      .filter(inv => inv.dueDate < now);
  }

  async create(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    const now = Timestamp.now();
    const ref = await addDoc(this.col, stampTenant(stripUndefined({ ...invoice, createdAt: now, updatedAt: now })));
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
    const snap = await getCountFromServer(query(this.col, tenantWhere()));
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
