export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  role?: 'admin' | 'user';
  is_admin?: boolean;
  plan?: 'free' | 'pro' | 'enterprise';
  company?: string;
  is_active?: boolean;
  last_sign_in_at?: string | null;
  created_at: string;
  updated_at?: string;
}

/** Resolves the display name from either full_name or first_name + last_name */
export function resolveDisplayName(user: UserProfile): string {
  return user.full_name
    || [user.first_name, user.last_name].filter(Boolean).join(' ')
    || '';
}

/** Resolves the role from either role column or is_admin boolean */
export function resolveRole(user: UserProfile): 'admin' | 'user' {
  if (user.role) return user.role;
  return user.is_admin ? 'admin' : 'user';
}

export interface UpdateProfileDto {
  full_name?: string;
  phone?: string;
  role?: 'admin' | 'user';
  is_admin?: boolean;
  plan?: 'free' | 'pro' | 'enterprise';
  company?: string;
  is_active?: boolean;
}

export const PLAN_LABELS: Record<string, string> = {
  free: 'Gratuit',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  user: 'Utilisateur',
};
