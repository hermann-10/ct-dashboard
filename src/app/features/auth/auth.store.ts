import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  plan: 'free' | 'pro' | 'enterprise';
  company: string;
  avatar_url: string;
}

interface AuthState {
  user: AuthUser | null;
  profile: AuthProfile | null;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  profile: null,
  loading: false,
  error: null,
  successMessage: null,
  initialized: false,
};

// Promise that resolves once init() completes (used by authGuard)
let _initResolve: () => void;
const _initPromise = new Promise<void>((r) => (_initResolve = r));

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed((state) => ({
    isAuthenticated: computed(() => !!state.user()),
    isAdmin: computed(() => state.profile()?.role === 'admin'),
    displayName: computed(() => state.profile()?.full_name || state.user()?.email || ''),
  })),

  withMethods((store, supabase = inject(SupabaseService), router = inject(Router)) => ({
    /** Returns a promise that resolves when init() has finished. */
    whenInitialized(): Promise<void> {
      return store.initialized() ? Promise.resolve() : _initPromise;
    },

    async init() {
      const session = await supabase.getSession();
      if (session?.user) {
        const user: AuthUser = { id: session.user.id, email: session.user.email ?? '' };
        patchState(store, { user, initialized: true });
        _initResolve();
        // Load profile
        try {
          const profile = await supabase.getProfile(session.user.id);
          patchState(store, { profile: profile as AuthProfile });
        } catch {
          // Profile may not exist yet
        }
      } else {
        patchState(store, { initialized: true });
        _initResolve();
      }

      supabase.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const user: AuthUser = { id: session.user.id, email: session.user.email ?? '' };
          patchState(store, { user });
          try {
            const profile = await supabase.getProfile(session.user.id);
            patchState(store, { profile: profile as AuthProfile });
          } catch {
            // Ignore
          }
        } else {
          patchState(store, { user: null, profile: null });
        }
      });
    },

    clearMessages() {
      patchState(store, { error: null, successMessage: null });
    },

    async login(email: string, password: string) {
      patchState(store, { loading: true, error: null, successMessage: null });
      const { user, error } = await supabase.signIn(email, password);
      if (error) {
        patchState(store, { loading: false, error: error.message });
      } else if (user) {
        const authUser: AuthUser = { id: user.id, email: user.email ?? '' };
        patchState(store, { user: authUser, loading: false });
        try {
          const profile = await supabase.getProfile(user.id);
          patchState(store, { profile: profile as AuthProfile });
        } catch {
          // Ignore
        }
        router.navigate(['/admin/dashboard']);
      }
    },

    async register(email: string, password: string, fullName: string) {
      patchState(store, { loading: true, error: null, successMessage: null });
      const { user, error } = await supabase.signUp(email, password, fullName);
      if (error) {
        patchState(store, { loading: false, error: error.message });
      } else {
        patchState(store, {
          loading: false,
          successMessage: 'Inscription réussie ! Vérifiez votre email pour confirmer votre compte.',
        });
      }
    },

    async resetPassword(email: string) {
      patchState(store, { loading: true, error: null, successMessage: null });
      const { error } = await supabase.resetPassword(email);
      if (error) {
        patchState(store, { loading: false, error: error.message });
      } else {
        patchState(store, {
          loading: false,
          successMessage: 'Un email de réinitialisation a été envoyé. Vérifiez votre boîte de réception.',
        });
      }
    },

    async logout() {
      await supabase.signOut();
      patchState(store, { user: null, profile: null });
      router.navigate(['/login']);
    },
  }))
);
