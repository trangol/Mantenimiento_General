import { User } from '../domain/User';

export interface IUserRepository {
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<void>;
  update(id: string, user: Partial<User>): Promise<void>;
}
