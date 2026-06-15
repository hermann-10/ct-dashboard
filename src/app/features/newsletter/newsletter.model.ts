// ── Contact statuses ──
export type ContactStatus = 'active' | 'unsubscribed' | 'bounced';

// ── Newsletter statuses ──
export type NewsletterStatus = 'draft' | 'scheduled' | 'sending' | 'sent';

// ── Domain models ──
export interface NewsletterContact {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  tags: string[];
  status: ContactStatus;
  source: string;
  subscribed_at: string;
  created_at: string;
  updated_at: string;
}

export interface Newsletter {
  id: string;
  subject: string;
  preview_text: string;
  html_content: string;
  status: NewsletterStatus;
  target_tags: string[];
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  created_at: string;
  updated_at: string;
}

export interface NewsletterSend {
  id: string;
  newsletter_id: string;
  contact_id: string;
  status: 'pending' | 'sent' | 'opened' | 'clicked' | 'bounced' | 'failed';
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
}

// ── Stats ──
export interface NewsletterStats {
  totalContacts: number;
  activeContacts: number;
  totalNewsletters: number;
  sentNewsletters: number;
  avgOpenRate: number;
  avgClickRate: number;
}

// ── DTOs ──
export interface CreateContactDto {
  email: string;
  first_name?: string;
  last_name?: string;
  tags?: string[];
  source?: string;
}

export interface CreateNewsletterDto {
  subject: string;
  preview_text?: string;
  html_content?: string;
  target_tags?: string[];
  scheduled_at?: string | null;
}

// ── Templates ──
export const NEWSLETTER_TEMPLATES = [
  { id: 'event-promo', label: 'Promo Événement', description: 'Annonce d\'un événement avec flyer et lien billetterie' },
  { id: 'lineup-reveal', label: 'Lineup Reveal', description: 'Dévoilement progressif du lineup' },
  { id: 'recap', label: 'Récap Événement', description: 'Photos et highlights post-événement' },
  { id: 'general', label: 'Newsletter Générale', description: 'Actualités et prochains événements' },
];
