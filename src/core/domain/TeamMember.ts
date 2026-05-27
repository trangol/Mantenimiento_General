export type TeamRole = 'admin' | 'supervisor' | 'technician' | 'driver';

export interface TeamMember {
  id: string;
  uid?: string; // Firebase Auth UID
  fullName: string;
  rut: string;
  email: string;
  phone: string;
  role: TeamRole;
  specialties: string[]; // ['piscinas', 'hvac', 'electrico']
  vehicleId?: string;
  isActive: boolean;
  hireDate: Date;
  photoUrl?: string;
  // KPIs
  totalOTs?: number;
  completedOTs?: number;
  averageRating?: number;
  createdAt: Date;
  updatedAt: Date;
}
