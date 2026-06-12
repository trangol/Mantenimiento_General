import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, Timestamp, runTransaction,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { InventoryItem, StockMovement } from '@/core/domain/InventoryItem';
import { IInventoryRepository } from '@/core/repositories/IInventoryRepository';
import { tenantWhere, stampTenant, belongsToTenant, stripUndefined } from '@/infrastructure/firebase/tenantScope';

function toItem(id: string, data: Record<string, unknown>): InventoryItem {
  return {
    ...data,
    id,
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
  } as InventoryItem;
}

export class FirestoreInventoryRepository implements IInventoryRepository {
  private col = collection(db, 'inventory');
  private movCol = collection(db, 'stock_movements');

  async getAll(): Promise<InventoryItem[]> {
    const snap = await getDocs(query(this.col, tenantWhere()));
    // Orden en memoria: evita índice compuesto (tenantId + name). Ver CLAUDE.md §Índices
    return snap.docs
      .map(d => toItem(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getById(id: string): Promise<InventoryItem | null> {
    const snap = await getDoc(doc(this.col, id));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    // Aislamiento multi-tenant: nunca exponer datos de otro tenant
    if (!belongsToTenant(data)) return null;
    return toItem(snap.id, data);
  }

  async getBySku(sku: string): Promise<InventoryItem | null> {
    const snap = await getDocs(query(this.col, tenantWhere(), where('sku', '==', sku)));
    if (snap.empty) return null;
    const d = snap.docs[0];
    return toItem(d.id, d.data() as Record<string, unknown>);
  }

  async getLowStock(): Promise<InventoryItem[]> {
    const all = await this.getAll();
    return all.filter(item => item.currentStock <= item.minimumStock);
  }

  async create(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> {
    const now = Timestamp.now();
    const ref = await addDoc(this.col, stampTenant(stripUndefined({ ...item, createdAt: now, updatedAt: now })));
    return { ...item, id: ref.id, createdAt: now.toDate(), updatedAt: now.toDate() };
  }

  async update(id: string, data: Partial<InventoryItem>): Promise<InventoryItem> {
    const ref = doc(this.col, id);
    await updateDoc(ref, { ...data, updatedAt: Timestamp.now() });
    return (await this.getById(id))!;
  }

  async adjustStock(id: string, movement: Omit<StockMovement, 'id' | 'createdAt'>): Promise<void> {
    const itemRef = doc(this.col, id);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(itemRef);
      if (!snap.exists()) throw new Error('Item no encontrado');
      const current = snap.data() as InventoryItem;
      const delta = movement.type === 'in' ? movement.quantity : -movement.quantity;
      const newStock = current.currentStock + delta;
      if (newStock < 0) throw new Error('Stock insuficiente');
      tx.update(itemRef, { currentStock: newStock, updatedAt: Timestamp.now() });
      // Registrar movimiento
      const movRef = doc(this.movCol);
      tx.set(movRef, stampTenant(stripUndefined({ ...movement, inventoryItemId: id, createdAt: Timestamp.now() })));
    });
  }

  async getMovements(itemId: string): Promise<StockMovement[]> {
    const snap = await getDocs(query(this.movCol, tenantWhere(), where('inventoryItemId', '==', itemId)));
    // Orden en memoria: evita índice compuesto (tenantId + createdAt). Ver CLAUDE.md §Índices
    return snap.docs
      .map(d => ({
        ...d.data(),
        id: d.id,
        createdAt: (d.data().createdAt as Timestamp).toDate(),
      } as StockMovement))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.col, id));
  }
}
