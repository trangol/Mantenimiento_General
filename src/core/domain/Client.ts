export interface Client {
  id: string;
  rut?: string; // RUT Chileno opcional
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}
