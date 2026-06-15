import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { SupabaseService } from '../../core/services/supabase.service';
import { Artist, ArtistBooking, ArtistStats, CreateArtistDto, UpdateArtistDto } from './artists.model';

interface ArtistsState {
  artists: Artist[];
  selectedArtist: Artist | null;
  bookings: ArtistBooking[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  searchTerm: string;
  filterGenre: string;
  filterRole: string;
}

const initialState: ArtistsState = {
  artists: [],
  selectedArtist: null,
  bookings: [],
  loading: false,
  saving: false,
  error: null,
  searchTerm: '',
  filterGenre: '',
  filterRole: '',
};

export const ArtistsStore = signalStore(
  withState(initialState),

  withComputed((state) => ({
    genres: computed(() => {
      const all = state.artists().map(a => a.genre).filter(Boolean);
      return [...new Set(all)].sort();
    }),

    filteredArtists: computed(() => {
      let list = state.artists();
      const term = state.searchTerm().toLowerCase();
      const genre = state.filterGenre();
      const role = state.filterRole();

      if (term) {
        list = list.filter(a =>
          a.name.toLowerCase().includes(term) ||
          a.genre.toLowerCase().includes(term) ||
          a.city.toLowerCase().includes(term)
        );
      }
      if (genre) {
        list = list.filter(a => a.genre === genre);
      }
      if (role) {
        list = list.filter(a => a.role === role);
      }
      return list;
    }),

    artistCount: computed(() => state.artists().length),

    selectedArtistStats: computed((): ArtistStats => {
      const bookings = state.bookings();
      const total = bookings.length;
      const totalFees = bookings.reduce((s, b) => s + (b.fee ?? 0), 0);
      const confirmed = bookings.filter(b => b.is_confirmed).length;
      const dates = bookings.map(b => b.event_date).filter(Boolean).sort();
      return {
        totalBookings: total,
        totalFees,
        averageFee: total > 0 ? Math.round(totalFees / total) : 0,
        lastBookingDate: dates.length > 0 ? dates[dates.length - 1] : null,
        confirmedRate: total > 0 ? Math.round((confirmed / total) * 100) : 0,
      };
    }),
  })),

  withMethods((store) => {
    const supabase = inject(SupabaseService);

    return {
      setSearch(term: string): void {
        patchState(store, { searchTerm: term });
      },

      setFilterGenre(genre: string): void {
        patchState(store, { filterGenre: genre });
      },

      setFilterRole(role: string): void {
        patchState(store, { filterRole: role });
      },

      async loadArtists(): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const data = await supabase.getArtists();
          patchState(store, { artists: data as Artist[], loading: false });
        } catch (e: any) {
          patchState(store, { error: e.message ?? 'Erreur de chargement', loading: false });
        }
      },

      async loadArtist(id: string): Promise<void> {
        patchState(store, { loading: true, error: null, selectedArtist: null, bookings: [] });
        try {
          const [artist, rawBookings] = await Promise.all([
            supabase.getArtistById(id),
            supabase.getArtistBookings(id),
          ]);

          const bookings: ArtistBooking[] = rawBookings.map((b: any) => ({
            id: b.id,
            event_id: b.event_id,
            event_name: b.event?.name ?? '',
            event_date: b.event?.date ?? '',
            event_venue: b.event?.venue ?? '',
            event_city: b.event?.city ?? '',
            role: b.role,
            fee: b.fee ?? 0,
            set_time: b.set_time,
            is_confirmed: b.is_confirmed ?? false,
          }));

          patchState(store, {
            selectedArtist: artist as Artist,
            bookings,
            loading: false,
          });
        } catch (e: any) {
          patchState(store, { error: e.message ?? 'Artiste introuvable', loading: false });
        }
      },

      async createArtist(dto: CreateArtistDto): Promise<Artist | null> {
        patchState(store, { saving: true });
        try {
          const created = await supabase.createArtist(dto);
          patchState(store, {
            artists: [...store.artists(), created as Artist].sort((a, b) =>
              a.name.localeCompare(b.name, 'fr')
            ),
            saving: false,
          });
          return created as Artist;
        } catch (e: any) {
          patchState(store, { error: e.message, saving: false });
          return null;
        }
      },

      async updateArtist(id: string, dto: UpdateArtistDto): Promise<boolean> {
        patchState(store, { saving: true });
        try {
          const updated = await supabase.updateArtist(id, dto);
          patchState(store, {
            artists: store.artists().map(a => a.id === id ? (updated as Artist) : a),
            selectedArtist: store.selectedArtist()?.id === id ? (updated as Artist) : store.selectedArtist(),
            saving: false,
          });
          return true;
        } catch (e: any) {
          patchState(store, { error: e.message, saving: false });
          return false;
        }
      },

      async deleteArtist(id: string): Promise<boolean> {
        patchState(store, { saving: true });
        try {
          await supabase.deleteArtist(id);
          patchState(store, {
            artists: store.artists().filter(a => a.id !== id),
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
