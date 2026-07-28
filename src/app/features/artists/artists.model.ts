import { ArtistRole } from '../event-management/event-management.model';

// ── Domain model ──
// ── Predefined music genres ──
export const MUSIC_GENRES = [
  'Afro',
  'Amapiano',
  'Commercial',
  'Dancehall',
  'Deep House',
  'Disco',
  'Drill',
  'Drum & Bass',
  'Dubstep',
  'Electro',
  'Funk',
  'Hip-Hop',
  'House',
  'Kompa',
  'Latin',
  'Minimal',
  'Pop',
  'R&B',
  'Reggaeton',
  'Shatta',
  'Tech House',
  'Techno',
  'Trance',
  'Trap',
  'Zouk',
] as const;

export type MusicGenre = typeof MUSIC_GENRES[number];

export interface Artist {
  id: string;
  name: string;
  is_managed?: boolean;
  genres: string[];
  role: ArtistRole;
  email: string;
  phone: string;
  instagram: string;
  website: string;
  city: string;
  photo_url: string | null;
  notes: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

// ── Booking history (joined from event_lineup + events) ──
export interface ArtistBooking {
  id: string;
  event_id: string;
  event_name: string;
  event_date: string;
  event_venue: string;
  event_city: string;
  role: ArtistRole;
  fee: number;
  set_time: string | null;
  is_confirmed: boolean;
}

// ── Stats computed from bookings ──
export interface ArtistStats {
  totalBookings: number;
  totalFees: number;
  averageFee: number;
  lastBookingDate: string | null;
  confirmedRate: number;
}

// ── DTOs ──
export interface CreateArtistDto {
  name: string;
  is_managed?: boolean;
  genres?: string[];
  role?: ArtistRole;
  email?: string;
  phone?: string;
  instagram?: string;
  website?: string;
  city?: string;
  photo_url?: string | null;
  notes?: string;
}

export interface UpdateArtistDto extends Partial<CreateArtistDto> {}
