import { doc, getDoc, getDocs, collection, query, where, orderBy, limit, startAfter, setDoc, updateDoc, documentId, QueryConstraint, DocumentData } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { IMaintenanceRecordRepository } from '@/core/repositories/IMaintenanceRecordRepository';
import { MaintenanceRecord, MaintenanceStatus, ChecklistItem } from '@/core/domain/MaintenanceRecord';
import { Page, PageRequest, clampPageSize } from '@/core/domain/Pagination';
import { tenantWhere, stampTenant, belongsToTenant, stripUndefined } from '@/infrastructure/firebase/tenantScope';

export class FirestoreMaintenanceRecordRepository implements IMaintenanceRecordRepository {
  private collectionName = 'maintenance_records';

  async getById(id: string): Promise<MaintenanceRecord | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    // Aislamiento multi-tenant: nunca exponer datos de otro tenant
    if (!belongsToTenant(docSnap.data() as Record<string, unknown>)) return null;
    return this.mapToDomain(docSnap.data(), id);
  }

  /**
   * Paginación cursor-based (startAfter + limit) por documentId():
   * con filtros de igualdad NO requiere índice compuesto (a diferencia de
   * orderBy(scheduledDate)). Cursor opaco = id del último doc, que se pasa
   * directo a startAfter (sin getDoc previo). La página se ordena en memoria
   * por scheduledDate desc solo para presentación; el orden GLOBAL ya no es
   * por fecha. Ver CLAUDE.md §Índices
   */
  async getPage(request: PageRequest): Promise<Page<MaintenanceRecord>> {
    const pageSize = clampPageSize(request.pageSize);
    const col = collection(db, this.collectionName);
    const constraints: QueryConstraint[] = [tenantWhere(), orderBy(documentId()), limit(pageSize + 1)];
    if (request.cursor) {
      // startAfter acepta el id (string) directamente con orderBy(documentId())
      constraints.splice(2, 0, startAfter(request.cursor));
    }
    const snap = await getDocs(query(col, ...constraints));
    const hasMore = snap.docs.length > pageSize;
    const docs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;
    // nextCursor se calcula ANTES de reordenar (debe ser el último doc del orden de query)
    const nextCursor = hasMore && docs.length > 0 ? docs[docs.length - 1].id : null;
    // Orden en memoria (solo dentro de la página): evita índice compuesto (tenantId + scheduledDate)
    const items = docs
      .map(d => this.mapToDomain(d.data(), d.id))
      .sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());
    return { items, hasMore, nextCursor };
  }

  async getByAssetId(assetId: string): Promise<MaintenanceRecord[]> {
    const q = query(collection(db, this.collectionName), tenantWhere(), where('assetId', '==', assetId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.mapToDomain(doc.data(), doc.id));
  }

  async getByTechnicianId(technicianId: string): Promise<MaintenanceRecord[]> {
    const q = query(collection(db, this.collectionName), tenantWhere(), where('technicianId', '==', technicianId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.mapToDomain(doc.data(), doc.id));
  }

  async getByClientId(clientId: string): Promise<MaintenanceRecord[]> {
    const q = query(collection(db, this.collectionName), tenantWhere(), where('clientId', '==', clientId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.mapToDomain(doc.data(), doc.id));
  }

  /** Retorna OTs completadas en el período que aún no están facturadas (billingStatus unbilled o in_preparation).
   * La fecha se filtra EN MEMORIA tras la query por tenant (política índices CLAUDE.md). */
  async getCompletedUnbilledInPeriod(from: Date, to: Date): Promise<MaintenanceRecord[]> {
    const q = query(
      collection(db, this.collectionName),
      tenantWhere(),
      where('status', '==', 'completed'),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => this.mapToDomain(d.data(), d.id))
      .filter(r => {
        const date = r.completedAt ?? r.scheduledDate;
        const billing = r.billingStatus ?? 'unbilled';
        return date >= from && date <= to && (billing === 'unbilled' || billing === 'in_preparation');
      });
  }

  async updateBillingStatus(id: string, billingStatus: import('@/core/domain/MaintenanceRecord').BillingStatus, invoiceId?: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    const update: Record<string, unknown> = { billingStatus, updatedAt: new Date() };
    if (invoiceId) update.invoiceId = invoiceId;
    await updateDoc(docRef, update);
  }

  async create(record: MaintenanceRecord): Promise<void> {
    const docRef = doc(db, this.collectionName, record.id);
    // Toda escritura se estampa con el tenant activo
    await setDoc(docRef, stampTenant(this.mapToFirestore(record)));
  }

  async update(id: string, record: Partial<MaintenanceRecord>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, { ...record });
  }

  async updateStatus(id: string, status: MaintenanceStatus): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, { status, updatedAt: new Date() });
  }

  // Mappers para convertir entre Firestore y nuestro Domain purista
  private mapToDomain(data: DocumentData, id: string): MaintenanceRecord {
    return {
      id,
      tenantId: data.tenantId || undefined,
      assetId: data.assetId,
      assetName: data.assetName,
      technicianId: data.technicianId,
      technicianName: data.technicianName,
      clientId: data.clientId,
      clientName: data.clientName,
      status: data.status,
      routeId: data.routeId || undefined,
      workOrderNotes: data.workOrderNotes || undefined,
      scheduledDate: data.scheduledDate?.toDate() || new Date(),
      startedAt: data.startedAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
      checklist: (data.checklist ?? []).map((c: ChecklistItem & { completedAt?: { toDate?: () => Date } | Date }) => ({
        ...c,
        completedAt: c.completedAt && typeof (c.completedAt as { toDate?: () => Date }).toDate === 'function'
          ? (c.completedAt as { toDate: () => Date }).toDate()
          : c.completedAt instanceof Date ? c.completedAt : undefined,
      })),
      checklistCompleted: data.checklistCompleted ?? false,
      initialPhotos: data.initialPhotos || [],
      finalPhotos: data.finalPhotos || [],
      observations: data.observations || '',
      suppliesUsed: data.suppliesUsed || [],
      serviceRate: data.serviceRate || undefined,
      totalCost: data.totalCost || 0,
      billingStatus: data.billingStatus ?? 'unbilled',
      invoiceId: data.invoiceId || undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }

  private mapToFirestore(record: MaintenanceRecord): Record<string, unknown> {
    const { id: _id, ...data } = record;
    void _id; // id se excluye del documento (es la clave del doc)
    // Firestore no acepta undefined — limpiar campos opcionales
    return stripUndefined(data as unknown as Record<string, unknown>);
  }
}
