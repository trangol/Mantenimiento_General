import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  query, where, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { TeamMember } from '@/core/domain/TeamMember';
import { ITeamRepository } from '@/core/repositories/ITeamRepository';
import { tenantWhere, stampTenant, belongsToTenant, stripUndefined } from '@/infrastructure/firebase/tenantScope';

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v as string);
}

function mapMember(id: string, data: Record<string, unknown>): TeamMember {
  return {
    ...(data as Omit<TeamMember, 'id' | 'hireDate' | 'createdAt' | 'updatedAt'>),
    id,
    hireDate: toDate(data.hireDate),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export class FirestoreTeamRepository implements ITeamRepository {
  private col = collection(db, 'team_members');
  private maintenanceCol = collection(db, 'maintenance_records');

  async getAll(): Promise<TeamMember[]> {
    const snap = await getDocs(query(this.col, tenantWhere()));
    return snap.docs
      .map(d => mapMember(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async getById(id: string): Promise<TeamMember | null> {
    const snap = await getDoc(doc(this.col, id));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    if (!belongsToTenant(data)) return null;
    return mapMember(snap.id, data);
  }

  async getByUid(uid: string): Promise<TeamMember | null> {
    const snap = await getDocs(query(this.col, tenantWhere(), where('uid', '==', uid)));
    if (snap.empty) return null;
    const d = snap.docs[0];
    return mapMember(d.id, d.data() as Record<string, unknown>);
  }

  async getByRole(role: string): Promise<TeamMember[]> {
    const snap = await getDocs(query(this.col, tenantWhere(), where('role', '==', role)));
    return snap.docs
      .map(d => mapMember(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async getActive(): Promise<TeamMember[]> {
    const snap = await getDocs(query(this.col, tenantWhere(), where('isActive', '==', true)));
    return snap.docs
      .map(d => mapMember(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async create(member: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeamMember> {
    const now = Timestamp.now();
    const ref = await addDoc(
      this.col,
      stampTenant(stripUndefined({ ...member, hireDate: Timestamp.fromDate(member.hireDate), createdAt: now, updatedAt: now }))
    );
    return mapMember(ref.id, { ...member, createdAt: now, updatedAt: now });
  }

  async update(id: string, data: Partial<TeamMember>): Promise<TeamMember> {
    const payload: Record<string, unknown> = { ...data, updatedAt: Timestamp.now() };
    if (data.hireDate) payload.hireDate = Timestamp.fromDate(data.hireDate);
    await updateDoc(doc(this.col, id), payload);
    return (await this.getById(id))!;
  }

  async getPerformance(id: string, from: Date, to: Date): Promise<{ completed: number; total: number; avgTime: number }> {
    const snap = await getDocs(
      query(this.maintenanceCol, tenantWhere(), where('technicianId', '==', id))
    );
    const records = snap.docs.map(d => d.data() as Record<string, unknown>);
    const inRange = records.filter(r => {
      const d = toDate(r.createdAt);
      return d >= from && d <= to;
    });
    const completed = inRange.filter(r => r.status === 'completed');
    let avgTime = 0;
    if (completed.length > 0) {
      const times = completed
        .filter(r => r.startedAt && r.completedAt)
        .map(r => (toDate(r.completedAt).getTime() - toDate(r.startedAt).getTime()) / 60000);
      avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    }
    return { completed: completed.length, total: inRange.length, avgTime };
  }
}
