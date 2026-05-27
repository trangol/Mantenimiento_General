import { TeamMember, TeamRole } from '../domain/TeamMember';

export interface ITeamRepository {
  getAll(): Promise<TeamMember[]>;
  getById(id: string): Promise<TeamMember | null>;
  getByUid(uid: string): Promise<TeamMember | null>;
  getByRole(role: TeamRole): Promise<TeamMember[]>;
  getActive(): Promise<TeamMember[]>;
  create(member: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeamMember>;
  update(id: string, data: Partial<TeamMember>): Promise<TeamMember>;
  getPerformance(id: string, from: Date, to: Date): Promise<{ completed: number; total: number; avgTime: number }>;
}
