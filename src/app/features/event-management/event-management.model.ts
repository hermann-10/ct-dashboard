// ── Charge categories ──
export type ChargeCategory =
  | 'location'
  | 'sonorisation'
  | 'dj_fees'
  | 'marketing'
  | 'decoration'
  | 'securite'
  | 'boissons'
  | 'divers';

export const CHARGE_CATEGORIES: { value: ChargeCategory; label: string }[] = [
  { value: 'location', label: 'Location / Salle' },
  { value: 'sonorisation', label: 'Sonorisation' },
  { value: 'dj_fees', label: 'Cachets DJ / Artistes' },
  { value: 'marketing', label: 'Marketing / Pub' },
  { value: 'decoration', label: 'Décoration' },
  { value: 'securite', label: 'Sécurité' },
  { value: 'boissons', label: 'Boissons / Bar' },
  { value: 'divers', label: 'Divers' },
];

// ── Revenue sources ──
export type RevenueSource = 'tickets' | 'bar' | 'sponsors' | 'vip' | 'divers';

export const REVENUE_SOURCES: { value: RevenueSource; label: string }[] = [
  { value: 'tickets', label: 'Billetterie' },
  { value: 'bar', label: 'Bar / Boissons' },
  { value: 'sponsors', label: 'Sponsors' },
  { value: 'vip', label: 'VIP / Tables' },
  { value: 'divers', label: 'Divers' },
];

// ── Artist roles ──
export type ArtistRole = 'dj' | 'live' | 'host' | 'mc' | 'other';

export const ARTIST_ROLES: { value: ArtistRole; label: string }[] = [
  { value: 'dj', label: 'DJ' },
  { value: 'live', label: 'Live' },
  { value: 'host', label: 'Host' },
  { value: 'mc', label: 'MC' },
  { value: 'other', label: 'Autre' },
];

// ── Domain models ──
export interface EventCharge {
  id: string;
  event_id: string;
  category: ChargeCategory;
  label: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRevenue {
  id: string;
  event_id: string;
  source: RevenueSource;
  label: string;
  amount: number;
  is_received: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventLineup {
  id: string;
  event_id: string;
  artist_name: string;
  role: ArtistRole;
  fee: number;
  set_time: string | null;
  is_confirmed: boolean;
  contact_info: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ── DTOs ──
export interface CreateChargeDto {
  event_id: string;
  category: ChargeCategory;
  label: string;
  amount: number;
  is_paid?: boolean;
  paid_at?: string;
  notes?: string;
}

export interface CreateRevenueDto {
  event_id: string;
  source: RevenueSource;
  label: string;
  amount: number;
  is_received?: boolean;
  notes?: string;
}

export interface CreateLineupDto {
  event_id: string;
  artist_name: string;
  role: ArtistRole;
  fee?: number;
  set_time?: string;
  is_confirmed?: boolean;
  contact_info?: string;
  notes?: string;
  sort_order?: number;
}

// ── Budget summary ──
export interface BudgetSummary {
  totalCharges: number;
  totalRevenues: number;
  profit: number;
  chargesPaid: number;
  chargesUnpaid: number;
  revenuesReceived: number;
  revenuesPending: number;
}

// ── Managed event (extended with notes/strategy) ──
export interface ManagedEvent {
  id: string;
  slug: string;
  name: string;
  date: string;
  venue: string;
  city: string;
  ticket_url: string | null;
  image_url: string | null;
  notes: string | null;
  strategy: string | null;
}
