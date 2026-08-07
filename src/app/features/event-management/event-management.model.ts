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
  artist_id: string | null;
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
  artist_id?: string | null;
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

// ── Guestlist ──
export interface EventGuestlist {
  id: string;
  event_id: string;
  lineup_id: string | null;
  artist_name: string;
  quota: number;
  share_token: string;
  created_at: string;
  entries: GuestlistEntry[];
}

export interface GuestlistEntry {
  id: string;
  guestlist_id: string;
  guest_name: string;
  email: string | null;
  accompagnants: number;
  remarks: string | null;
  is_checked_in: boolean;
  checked_in_at: string | null;
  checkin_token: string;
  created_at: string;
}

export interface CreateGuestlistDto {
  event_id: string;
  lineup_id?: string | null;
  artist_name: string;
  quota?: number;
}

export interface CreateGuestEntryDto {
  guestlist_id: string;
  guest_name: string;
  email?: string;
  accompagnants?: number;
  remarks?: string;
}

export interface GuestlistSummary {
  totalGuestlists: number;
  totalGuests: number;
  totalCheckedIn: number;
  totalCapacity: number;
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

// ── Staff / Personnel de l'événement ──
export type StaffStatus = 'planned' | 'confirmed' | 'paid';
export type StaffPayType = 'hourly' | 'flat';

export interface EventStaff {
  id: string;
  event_id: string;
  name: string;
  role: string;
  phone: string | null;
  pay_type: StaffPayType;
  rate: number;
  start_time: string | null;
  end_time: string | null;
  status: StaffStatus;
  checked_in: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffDto {
  event_id: string;
  name?: string;
  role: string;
  phone?: string;
  pay_type: StaffPayType;
  rate: number;
  start_time?: string;
  end_time?: string;
  status?: StaffStatus;
  notes?: string;
}

/** Heures travaillées (gère le passage de minuit : 23:00 → 05:00 = 6 h). */
export function staffHours(s: Pick<EventStaff, 'start_time' | 'end_time'>): number {
  if (!s.start_time || !s.end_time) return 0;
  const [sh, sm] = s.start_time.split(':').map(Number);
  const [eh, em] = s.end_time.split(':').map(Number);
  if ([sh, sm, eh, em].some(isNaN)) return 0;
  let minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes <= 0) minutes += 24 * 60;
  return Math.round((minutes / 60) * 100) / 100;
}

/** Coût d'une personne : forfait, ou heures × taux horaire. */
export function staffCost(s: EventStaff): number {
  if (s.pay_type === 'flat') return Number(s.rate);
  return Math.round(staffHours(s) * Number(s.rate) * 100) / 100;
}
