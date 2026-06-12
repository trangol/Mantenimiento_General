export type Role = 'admin' | 'technician' | 'client';

export interface User {
  id: string;
  tenantId?: string;  // Multi-tenancy: empresa mantenedora dueña del dato
  email: string;
  fullName: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}
