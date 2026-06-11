import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

interface AuthState {
  user: { id: string; email: string } | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  initialized: false,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, supabase = inject(SupabaseService), router = inject(Router)) => ({
    async init() {
      const session = await supabase.getSession();
      if (session?.user) {
        patchState(store, {
          user: { id: session.user.id, email: session.user.email ?? '' },
          initialized: true,
        });
      } else {
        patchState(store, { initialized: true });
      }
      supabase.onAuthStateChange((_event, session) => {
        if (session?.user) {
          patchState(store, { user: { id: session.user.id, email: session.user.email ?? '' } });
        } else {
          patchState(store, { user: null });
        }
      });
    },
    async login(email: string, password: string) {
      patchState(store, { loading: true, error: null });
      const { user, error } = await supabase.signIn(email, password);
      if (error) {
        patchState(store, { loading: false, error: error.message });
      } else if (user) {
        patchState(store, {
          user: { id: user.id, email: user.email ?? '' },
          loading: false,
        });
        router.navigate(['/admin/dashboard']);
      }
    },
    async logout() {
      await supabase.signOut();
      patchState(store, { user: null });
      router.navigate(['/login']);
    },
  }))
);
