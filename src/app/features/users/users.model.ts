export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  role: 'admin' | 'user';
  plan: 'free' | 'pro' | 'enterprise';
  company: string;
  is_active: boolean;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileDto {
  full_name?: string;
  phone?: string;
  role?: 'admin' | 'user';
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
