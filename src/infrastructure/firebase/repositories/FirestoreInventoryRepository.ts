import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp, runTransaction,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { InventoryItem, StockMovement } from '@/core/domain/InventoryItem';
import { IInventoryRepository } from '@/core/repositories/IInventoryRepository';

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
    const snap = await getDocs(query(this.col, orderBy('name')));
    return snap.docs.map(d => toItem(d.id, d.data() as Record<string, unknown>));
  }

  async getById(id: string): Promise<InventoryItem | null> {
    const snap = await getDoc(doc(this.col, id));
    return snap.exists() ? toItem(snap.id, snap.data() as Record<string, unknown>) : null;
  }

  async getBySku(sku: string): Promise<InventoryItem | null> {
    const snap = await getDocs(query(this.col, where('sku', '==', sku)));
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
    const ref = await addDoc(this.col, { ...item, createdAt: now, updatedAt: now });
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
      tx.set(movRef, { ...movement, inventoryItemId: id, createdAt: Timestamp.now() });
    });
  }

  async getMovements(itemId: string): Promise<StockMovement[]> {
    const snap = await getDocs(query(this.movCol, where('inventoryItemId', '==', itemId), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({
      ...d.data(),
      id: d.id,
      createdAt: (d.data().createdAt as Timestamp).toDate(),
    } as StockMovement));
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.col, id));
  }
}
