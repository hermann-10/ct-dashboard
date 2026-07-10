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
      console.log('[AUTH] init() starting');
      try {
        const session = await supabase.getSession();
        console.log('[AUTH] init session:', session ? 'exists' : 'none');
        if (session?.user) {
          const user: AuthUser = { id: session.user.id, email: session.user.email ?? '' };
          let profile: AuthProfile | null = null;
          try {
            profile = await supabase.getProfile(user.id) as AuthProfile;
            console.log('[AUTH] init profile loaded:', profile?.role, profile?.is_admin);
          } catch (e) {
            console.warn('[AUTH] init profile load failed', e);
          }
          patchState(store, { user, profile, initialized: true });
        } else {
          patchState(store, { initialized: true });
        }
      } catch (e) {
        console.error('[AUTH] init error', e);
        patchState(store, { initialized: true });
      } finally {
        _initResolve();
        console.log('[AUTH] init() done, initialized =', store.initialized());
      }

      supabase.onAuthStateChange(async (_event, session) => {
        console.log('[AUTH] onAuthStateChange event:', _event, 'user:', session?.user?.id);
        if (session?.user) {
          const authUser: AuthUser = { id: session.user.id, email: session.user.email ?? '' };
          patchState(store, { user: authUser });
          try {
            const profile = await supabase.getProfile(session.user.id);
            console.log('[AUTH] onAuthStateChange profile:', profile?.role, profile?.is_admin);
            patchState(store, { profile: profile as AuthProfile });
          } catch (e) {
            console.warn('[AUTH] onAuthStateChange profile failed', e);
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
      console.log('[AUTH] login() called with', email);
      patchState(store, { loading: true, error: null, successMessage: null });
      try {
        console.log('[AUTH] calling signIn...');
        const { user, error } = await supabase.signIn(email, password);
        console.log('[AUTH] signIn returned', { userId: user?.id, error: error?.message });
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
        console.log('[AUTH] loading profile...');
        try {
          const profile = await supabase.getProfile(user.id);
          console.log('[AUTH] profile loaded', profile);
          patchState(store, { profile: profile as AuthProfile });
        } catch (pe) {
          console.warn('[AUTH] profile load failed', pe);
        }
        console.log('[AUTH] navigating to /admin/dashboard');
        router.navigate(['/admin/dashboard']);
      } catch (e: any) {
        console.error('[AUTH] login catch error', e);
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
