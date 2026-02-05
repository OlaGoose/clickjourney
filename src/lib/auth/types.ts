import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export type UserTier = 'free' | 'premium' | 'pro';

export interface UserProfile {
  id: string;
  email?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  tier: UserTier;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface AuthState {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export type AuthErrorCode =
  | 'EMAIL_NOT_CONFIRMED'
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_EXISTS'
  | 'WEAK_PASSWORD'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: unknown;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username?: string;
}

export type OAuthProvider = 'google' | 'github';
