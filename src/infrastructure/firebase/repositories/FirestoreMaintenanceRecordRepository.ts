import { doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { IMaintenanceRecordRepository } from '../../../core/repositories/IMaintenanceRecordRepository';
import { MaintenanceRecord, MaintenanceStatus } from '../../../core/domain/MaintenanceRecord';

export class FirestoreMaintenanceRecordRepository implements IMaintenanceRecordRepository {
  private collectionName = 'maintenance_records';

  async getById(id: string): Promise<MaintenanceRecord | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    return this.mapToDomain(docSnap.data(), id);
  }

  async getByAssetId(assetId: string): Promise<MaintenanceRecord[]> {
    const q = query(collection(db, this.collectionName), where('assetId', '==', assetId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.mapToDomain(doc.data(), doc.id));
  }

  async getByTechnicianId(technicianId: string): Promise<MaintenanceRecord[]> {
    const q = query(collection(db, this.collectionName), where('technicianId', '==', technicianId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.mapToDomain(doc.data(), doc.id));
  }

  async getByClientId(clientId: string): Promise<MaintenanceRecord[]> {
    const q = query(collection(db, this.collectionName), where('clientId', '==', clientId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.mapToDomain(doc.data(), doc.id));
  }

  async create(record: MaintenanceRecord): Promise<void> {
    const docRef = doc(db, this.collectionName, record.id);
    await setDoc(docRef, this.mapToFirestore(record));
  }

  async update(id: string, record: Partial<MaintenanceRecord>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, record as any);
  }

  async updateStatus(id: string, status: MaintenanceStatus): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, { status, updatedAt: new Date() });
  }

  // Mappers para convertir entre Firestore y nuestro Domain purista
  private mapToDomain(data: any, id: string): MaintenanceRecord {
    return {
      id,
      assetId: data.assetId,
      assetName: data.assetName,
      technicianId: data.technicianId,
      technicianName: data.technicianName,
      clientId: data.clientId,
      clientName: data.clientName,
      status: data.status,
      scheduledDate: data.scheduledDate?.toDate() || new Date(),
      startedAt: data.startedAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
      initialPhotos: data.initialPhotos || [],
      finalPhotos: data.finalPhotos || [],
      observations: data.observations || '',
      suppliesUsed: data.suppliesUsed || [],
      totalCost: data.totalCost || 0,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }

  private mapToFirestore(record: MaintenanceRecord): any {
    const { id, ...data } = record;
    return data;
  }
}
