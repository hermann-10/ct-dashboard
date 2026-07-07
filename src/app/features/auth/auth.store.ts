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
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role?: 'admin' | 'user';
  is_admin?: boolean;
  plan?: 'free' | 'pro' | 'enterprise';
  company?: string;
  avatar_url?: string;
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
    isAdmin: computed(() => {
      const p = state.profile();
      if (!p) return false;
      // Support both DB schemas: role text column OR is_admin boolean
      return p.role === 'admin' || p.is_admin === true;
    }),
    displayName: computed(() => {
      const p = state.profile();
      if (!p) return state.user()?.email || '';
      // Support both: full_name OR first_name + last_name
      return p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || state.user()?.email || '';
    }),
  })),

  withMethods((store, supabase = inject(SupabaseService), router = inject(Router)) => ({
    /** Returns a promise that resolves when init() has finished. */
    whenInitialized(): Promise<void> {
      return store.initialized() ? Promise.resolve() : _initPromise;
    },

    async init() {
      try {
        const session = await supabase.getSession();
        if (session?.user) {
          const user: AuthUser = { id: session.user.id, email: session.user.email ?? '' };
          // Load profile BEFORE marking initialized so authGuard can check role
          let profile: AuthProfile | null = null;
          try {
            profile = await supabase.getProfile(user.id) as AuthProfile;
          } catch {
            // Profile may not exist yet
          }
          patchState(store, { user, profile, initialized: true });
        } else {
          patchState(store, { initialized: true });
        }
      } catch {
        patchState(store, { initialized: true });
      } finally {
        _initResolve();
      }

      supabase.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const authUser: AuthUser = { id: session.user.id, email: session.user.email ?? '' };
          patchState(store, { user: authUser });
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
      try {
        const { user, error } = await supabase.signIn(email, password);
        if (error) {
          patchState(store, { loading: false, error: error.message });
          return;
        }
        if (!user) {
          patchState(store, { loading: false, error: 'Aucun utilisateur retourné.' });
          return;
        }
        const authUser: AuthUser = { id: user.id, email: user.email ?? '' };
        patchState(store, { user: authUser, loading: false });
        try {
          const profile = await supabase.getProfile(user.id);
          patchState(store, { profile: profile as AuthProfile });
        } catch {
          // Profile load failed — continue with navigation anyway
        }
        router.navigate(['/admin/dashboard']);
      } catch (e: any) {
        patchState(store, {
          loading: false,
          error: e?.message ?? 'Erreur de connexion inattendue.',
        });
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
