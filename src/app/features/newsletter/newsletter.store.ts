import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { SupabaseService } from '../../core/services/supabase.service';
import {
  NewsletterContact,
  Newsletter,
  NewsletterStats,
  CreateContactDto,
  CreateNewsletterDto,
} from './newsletter.model';

interface NewsletterState {
  contacts: NewsletterContact[];
  newsletters: Newsletter[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  searchTerm: string;
  filterTag: string;
  filterStatus: string;
}

const initialState: NewsletterState = {
  contacts: [],
  newsletters: [],
  loading: false,
  saving: false,
  error: null,
  searchTerm: '',
  filterTag: '',
  filterStatus: '',
};

export const NewsletterStore = signalStore(
  withState(initialState),

  withComputed((state) => ({
    allTags: computed(() => {
      const tags = state.contacts().flatMap(c => c.tags ?? []);
      return [...new Set(tags)].sort();
    }),

    filteredContacts: computed(() => {
      let list = state.contacts();
      const term = state.searchTerm().toLowerCase();
      const tag = state.filterTag();
      const status = state.filterStatus();

      if (term) {
        list = list.filter(c =>
          c.email.toLowerCase().includes(term) ||
          c.first_name.toLowerCase().includes(term) ||
          c.last_name.toLowerCase().includes(term)
        );
      }
      if (tag) {
        list = list.filter(c => c.tags?.includes(tag));
      }
      if (status) {
        list = list.filter(c => c.status === status);
      }
      return list;
    }),

    stats: computed((): NewsletterStats => {
      const contacts = state.contacts();
      const newsletters = state.newsletters();
      const active = contacts.filter(c => c.status === 'active').length;
      const sent = newsletters.filter(n => n.status === 'sent');
      const avgOpen = sent.length > 0
        ? Math.round(sent.reduce((s, n) => s + (n.total_recipients > 0 ? (n.total_opened / n.total_recipients) * 100 : 0), 0) / sent.length)
        : 0;
      const avgClick = sent.length > 0
        ? Math.round(sent.reduce((s, n) => s + (n.total_recipients > 0 ? (n.total_clicked / n.total_recipients) * 100 : 0), 0) / sent.length)
        : 0;

      return {
        totalContacts: contacts.length,
        activeContacts: active,
        totalNewsletters: newsletters.length,
        sentNewsletters: sent.length,
        avgOpenRate: avgOpen,
        avgClickRate: avgClick,
      };
    }),

    draftNewsletters: computed(() =>
      state.newsletters().filter(n => n.status === 'draft')
    ),

    sentNewsletters: computed(() =>
      state.newsletters().filter(n => n.status === 'sent')
    ),
  })),

  withMethods((store) => {
    const supabase = inject(SupabaseService);

    return {
      setSearch(term: string): void {
        patchState(store, { searchTerm: term });
      },

      setFilterTag(tag: string): void {
        patchState(store, { filterTag: tag });
      },

      setFilterStatus(status: string): void {
        patchState(store, { filterStatus: status });
      },

      async loadAll(): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const [contacts, newsletters] = await Promise.all([
            supabase.getNewsletterContacts(),
            supabase.getNewsletters(),
          ]);
          patchState(store, {
            contacts: contacts as NewsletterContact[],
            newsletters: newsletters as Newsletter[],
            loading: false,
          });
        } catch (e: any) {
          patchState(store, { error: e.message, loading: false });
        }
      },

      async addContact(dto: CreateContactDto): Promise<NewsletterContact | null> {
        patchState(store, { saving: true });
        try {
          const created = await supabase.createNewsletterContact(dto);
          patchState(store, {
            contacts: [created as NewsletterContact, ...store.contacts()],
            saving: false,
          });
          return created as NewsletterContact;
        } catch (e: any) {
          patchState(store, { error: e.message, saving: false });
          return null;
        }
      },

      async importContacts(contacts: CreateContactDto[]): Promise<number> {
        patchState(store, { saving: true });
        try {
          const created = await supabase.createNewsletterContactsBulk(contacts);
          // Reload after bulk import
          const all = await supabase.getNewsletterContacts();
          patchState(store, {
            contacts: all as NewsletterContact[],
            saving: false,
          });
          return created.length;
        } catch (e: any) {
          patchState(store, { error: e.message, saving: false });
          return 0;
        }
      },

      async updateContact(id: string, changes: Partial<CreateContactDto>): Promise<boolean> {
        patchState(store, { saving: true });
        try {
          const updated = await supabase.updateNewsletterContact(id, changes);
          patchState(store, {
            contacts: store.contacts().map(c => c.id === id ? (updated as NewsletterContact) : c),
            saving: false,
          });
          return true;
        } catch (e: any) {
          patchState(store, { error: e.message, saving: false });
          return false;
        }
      },

      async deleteContact(id: string): Promise<boolean> {
        patchState(store, { saving: true });
        try {
          await supabase.deleteNewsletterContact(id);
          patchState(store, {
            contacts: store.contacts().filter(c => c.id !== id),
            saving: false,
          });
          return true;
        } catch (e: any) {
          patchState(store, { error: e.message, saving: false });
          return false;
        }
      },

      async createNewsletter(dto: CreateNewsletterDto): Promise<Newsletter | null> {
        patchState(store, { saving: true });
        try {
          const created = await supabase.createNewsletter(dto);
          patchState(store, {
            newsletters: [created as Newsletter, ...store.newsletters()],
            saving: false,
          });
          return created as Newsletter;
        } catch (e: any) {
          patchState(store, { error: e.message, saving: false });
          return null;
        }
      },

      async updateNewsletter(id: string, changes: Partial<CreateNewsletterDto & { status: string }>): Promise<boolean> {
        patchState(store, { saving: true });
        try {
          const updated = await supabase.updateNewsletter(id, changes);
          patchState(store, {
            newsletters: store.newsletters().map(n => n.id === id ? (updated as Newsletter) : n),
            saving: false,
          });
          return true;
        } catch (e: any) {
          patchState(store, { error: e.message, saving: false });
          return false;
        }
      },

      async deleteNewsletter(id: string): Promise<boolean> {
        patchState(store, { saving: true });
        try {
          await supabase.deleteNewsletter(id);
          patchState(store, {
            newsletters: store.newsletters().filter(n => n.id !== id),
            saving: false,
          });
          return true;
        } catch (e: any) {
          patchState(store, { error: e.message, saving: false });
          return false;
        }
      },
    };
  })
);
