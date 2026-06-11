export interface EventRecord {
  id: string;
  slug: string;
  name: string;
  date: string;
  venue: string;
  city: string;
  ticket_url: string | null;
  image_emoji: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEventDto {
  slug: string;
  name: string;
  date: string;
  venue: string;
  city: string;
  ticket_url?: string;
  image_emoji?: string;
  is_published?: boolean;
}

export interface UpdateEventDto {
  name?: string;
  date?: string;
  venue?: string;
  city?: string;
  ticket_url?: string;
  image_emoji?: string;
  is_published?: boolean;
}
