import { Quote, QuoteStatus } from '../domain/Quote';

export interface IQuoteRepository {
  getAll(): Promise<Quote[]>;
  getById(id: string): Promise<Quote | null>;
  getByClient(clientId: string): Promise<Quote[]>;
  getByStatus(status: QuoteStatus): Promise<Quote[]>;
  create(quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quote>;
  update(id: string, data: Partial<Quote>): Promise<Quote>;
  updateStatus(id: string, status: QuoteStatus): Promise<void>;
  delete(id: string): Promise<void>;
  getNextNumber(): Promise<string>;
}
