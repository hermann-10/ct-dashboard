import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { SupabaseService } from '../../core/services/supabase.service';
import { UserProfile, UpdateProfileDto } from './users.model';

interface UsersState {
  users: UserProfile[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  filterRole: string;
  filterPlan: string;
}

const initialState: UsersState = {
  users: [],
  loading: false,
  error: null,
  searchTerm: '',
  filterRole: '',
  filterPlan: '',
};

export const UsersStore = signalStore(
  withState(initialState),

  withComputed((state) => ({
    filteredUsers: computed(() => {
      let list = state.users();
      const term = state.searchTerm().toLowerCase();
      const role = state.filterRole();
      const plan = state.filterPlan();

      if (term) {
        list = list.filter(u =>
          u.full_name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          (u.company ?? '').toLowerCase().includes(term)
        );
      }
      if (role) {
        list = list.filter(u => u.role === role);
      }
      if (plan) {
        list = list.filter(u => u.plan === plan);
      }
      return list;
    }),

    userCount: computed(() => state.users().length),
  })),

  withMethods((store) => {
    const supabase = inject(SupabaseService);

    return {
      setSearch(term: string): void {
        patchState(store, { searchTerm: term });
      },

      setFilterRole(role: string): void {
        patchState(store, { filterRole: role });
      },

      setFilterPlan(plan: string): void {
        patchState(store, { filterPlan: plan });
      },

      async loadUsers(force = false): Promise<void> {
        if (!force && store.users().length > 0) return;
        patchState(store, { loading: true, error: null });
        try {
          const data = await supabase.getProfiles();
          patchState(store, { users: data as UserProfile[], loading: false });
        } catch (e: any) {
          patchState(store, { error: e.message ?? 'Erreur de chargement', loading: false });
        }
      },

      async updateUser(id: string, dto: UpdateProfileDto): Promise<boolean> {
        try {
          const updated = await supabase.updateProfile(id, dto);
          patchState(store, {
            users: store.users().map(u => u.id === id ? (updated as UserProfile) : u),
          });
          return true;
        } catch (e: any) {
          patchState(store, { error: e.message ?? 'Erreur de mise à jour' });
          return false;
        }
      },
    };
  })
);
