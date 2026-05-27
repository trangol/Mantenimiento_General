import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Asset } from '@/core/domain/Asset';
import { IAssetRepository } from '@/core/repositories/IAssetRepository';

/**
 * FirestoreAssetRepository
 * Implementación concreta de IAssetRepository para Firebase Firestore.
 *
 * DIP: El dominio y los use cases dependen solo de la interfaz IAssetRepository,
 *      nunca de esta clase concreta.
 */

const COL = 'assets';

/** Mapper Firestore → Domain */
function toDomain(id: string, data: Record<string, unknown>): Asset {
  return {
    id,
    clientId: data.clientId as string,
    name: data.name as string,
    type: data.type as Asset['type'],
    qrCodeId: data.qrCodeId as string,
    brand: (data.brand as string) || undefined,
    model: (data.model as string) || undefined,
    serialNumber: (data.serialNumber as string) || undefined,
    installationDate: data.installationDate
      ? (data.installationDate as Timestamp).toDate()
      : undefined,
    locationDescription: (data.locationDescription as string) || undefined,
    maintenanceFrequencyDays: (data.maintenanceFrequencyDays as number) || 30,
    status: (data.status as Asset['status']) || 'active',
    metadata: (data.metadata as Record<string, string | number | boolean>) || {},
    recurringSupplies: (data.recurringSupplies as Asset['recurringSupplies']) || [],
    initialPhotos: (data.initialPhotos as string[]) || [],
    notes: (data.notes as string) || undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
    createdBy: (data.createdBy as string) || undefined,
  };
}

/** Mapper Domain → Firestore */
function toFirestore(asset: Omit<Asset, 'id'>): Record<string, unknown> {
  return {
    ...asset,
    installationDate: asset.installationDate
      ? Timestamp.fromDate(asset.installationDate)
      : null,
    createdAt: Timestamp.fromDate(asset.createdAt),
    updatedAt: Timestamp.fromDate(asset.updatedAt),
  };
}

export class FirestoreAssetRepository implements IAssetRepository {
  private col = collection(db, COL);

  async getById(id: string): Promise<Asset | null> {
    const snap = await getDoc(doc(this.col, id));
    if (!snap.exists()) return null;
    return toDomain(snap.id, snap.data() as Record<string, unknown>);
  }

  async getByQrCode(qrCodeId: string): Promise<Asset | null> {
    const snap = await getDocs(query(this.col, where('qrCodeId', '==', qrCodeId)));
    if (snap.empty) return null;
    const d = snap.docs[0];
    return toDomain(d.id, d.data() as Record<string, unknown>);
  }

  async getByClientId(clientId: string): Promise<Asset[]> {
    const snap = await getDocs(
      query(this.col, where('clientId', '==', clientId), orderBy('name'))
    );
    return snap.docs.map(d => toDomain(d.id, d.data() as Record<string, unknown>));
  }

  async getByType(type: Asset['type']): Promise<Asset[]> {
    const snap = await getDocs(query(this.col, where('type', '==', type)));
    return snap.docs.map(d => toDomain(d.id, d.data() as Record<string, unknown>));
  }

  async create(asset: Asset): Promise<void> {
    const { id, ...data } = asset;
    await setDoc(doc(this.col, id), toFirestore(data));
  }

  async update(id: string, partial: Partial<Asset>): Promise<void> {
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
