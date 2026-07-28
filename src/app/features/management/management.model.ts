import { InvoiceItem, InvoiceStatus } from '../event-management/invoice.model';

// ── Module Management — revenus & cachets des artistes ──

export interface ArtistRevenue {
  id: string;
  artist_id: string;
  date: string;
  venue: string | null;
  event_name: string | null;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateArtistRevenueDto {
  artist_id: string;
  date: string;
  venue?: string;
  event_name?: string;
  amount: number;
  notes?: string;
}

export interface UpdateArtistRevenueDto {
  date?: string;
  venue?: string | null;
  event_name?: string | null;
  amount?: number;
  notes?: string | null;
}

export interface YearSummary {
  year: number;
  count: number;
  total: number;
}

// ── Factures artiste ──
export interface ArtistInvoice {
  id: string;
  artist_id: string;
  invoice_number: number;
  client_name: string;
  client_address: string | null;
  client_phone: string | null;
  issue_date: string;
  due_date: string | null;
  conditions: string;
  items: InvoiceItem[];
  status: InvoiceStatus;
  created_at: string;
  updated_at: string;
}

// ── Contrats artiste ──
export type ContractStatus = 'draft' | 'sent' | 'signed';

export interface ArtistContract {
  id: string;
  artist_id: string;
  client_name: string;
  client_address: string | null;
  event_date: string;
  venue: string | null;
  city: string | null;
  schedule: string | null;
  fee: number;
  payment_terms: string;
  clauses: string | null;
  status: ContractStatus;
  created_at: string;
  updated_at: string;
}
