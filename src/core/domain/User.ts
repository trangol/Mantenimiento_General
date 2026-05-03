export type Role = 'admin' | 'technician' | 'client';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}
