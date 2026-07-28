// ── Facturation ──

export interface InvoiceItem {
  description: string;
  /** null → ligne de détail sans montant (ex: « Événement du samedi 25 juillet 2026 ») */
  amount: number | null;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid';

export interface EventInvoice {
  id: string;
  event_id: string | null;
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

export interface CreateInvoiceDto {
  event_id: string;
  invoice_number: number;
  client_name: string;
  client_address?: string | null;
  client_phone?: string | null;
  issue_date: string;
  due_date?: string;
  conditions?: string;
  items: InvoiceItem[];
  status?: InvoiceStatus;
}

export interface UpdateInvoiceDto {
  client_name?: string;
  client_address?: string | null;
  client_phone?: string | null;
  issue_date?: string;
  due_date?: string | null;
  conditions?: string;
  items?: InvoiceItem[];
  status?: InvoiceStatus;
}

export const INVOICE_STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyée' },
  { value: 'paid', label: 'Payée' },
];

export function invoiceTotal(invoice: Pick<EventInvoice, 'items'>): number {
  return (invoice.items ?? []).reduce((s, it) => s + (it.amount ?? 0), 0);
}
