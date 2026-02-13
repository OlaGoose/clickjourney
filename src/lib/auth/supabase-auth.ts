'use client';

import { supabase } from '../supabase/client';
import type {
  AuthError,
  AuthErrorCode,
  LoginCredentials,
  RegisterCredentials,
  OAuthProvider,
  UserProfile,
} from './types';
import type { User, Session } from '@supabase/supabase-js';

function parseAuthError(error: unknown): AuthError {
  const message = error instanceof Error ? error.message : 'Unknown error';
  let code: AuthErrorCode = 'UNKNOWN_ERROR';
  if (message.includes('Email not confirmed')) code = 'EMAIL_NOT_CONFIRMED';
  else if (message.includes('Invalid') || message.includes('credentials')) code = 'INVALID_CREDENTIALS';
  else if (message.includes('not found')) code = 'USER_NOT_FOUND';
  else if (message.includes('already registered')) code = 'EMAIL_EXISTS';
  else if (message.includes('Password')) code = 'WEAK_PASSWORD';
  else if (message.includes('network') || message.includes('fetch')) code = 'NETWORK_ERROR';
  return { code, message, details: error };
}

export class SupabaseAuthService {
  static async signUp(credentials: RegisterCredentials): Promise<{
    user: User | null;
    session: Session | null;
    error: AuthError | null;
  }> {
    if (!supabase) return { user: null, session: null, error: { code: 'NETWORK_ERROR', message: 'Supabase not configured' } };
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: { data: { username: credentials.username } },
      });
      if (error) return { user: null, session: null, error: parseAuthError(error) };
      if (data.user) {
        await this.createUserProfile(data.user.id, {
          username: credentials.username,
          email: credentials.email,
        });
      }
      return { user: data.user, session: data.session, error: null };
    } catch (e) {
      return { user: null, session: null, error: parseAuthError(e) };
    }
  }

  static async signIn(credentials: LoginCredentials): Promise<{
    user: User | null;
    session: Session | null;
    error: AuthError | null;
  }> {
    if (!supabase) return { user: null, session: null, error: { code: 'NETWORK_ERROR', message: 'Supabase not configured' } };
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      if (error) return { user: null, session: null, error: parseAuthError(error) };
      return { user: data.user, session: data.session, error: null };
    } catch (e) {
      return { user: null, session: null, error: parseAuthError(e) };
    }
  }

  static async signInWithOAuth(provider: OAuthProvider): Promise<{ error: AuthError | null }> {
    if (!supabase) return { error: { code: 'NETWORK_ERROR', message: 'Supabase not configured' } };
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback` },
      });
      return { error: error ? parseAuthError(error) : null };
    } catch (e) {
      return { error: parseAuthError(e) };
    }
  }

  static async signOut(): Promise<{ error: AuthError | null }> {
    if (!supabase) return { error: null };
    try {
      const { error } = await supabase.auth.signOut();
      return { error: error ? parseAuthError(error) : null };
    } catch (e) {
      return { error: parseAuthError(e) };
    }
  }

  static async getSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    if (!supabase) return { session: null, error: null };
    try {
      const { data, error } = await supabase.auth.getSession();
      return { session: data.session, error: error ? parseAuthError(error) : null };
    } catch (e) {
      return { session: null, error: parseAuthError(e) };
    }
  }

  static onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  }

  private static async createUserProfile(userId: string, data: { username?: string; email: string }) {
    if (!supabase) return;
    try {
      await (supabase as any).from('user_profiles').insert({
        id: userId,
        username: data.username ?? null,
        email: data.email,
        tier: 'free',
        settings: {},
      });
    } catch (err) {
      console.error('createUserProfile', err);
    }
  }

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!supabase) return null;
    try {
      // Use maybeSingle() so 0 rows returns null instead of 406 (Not Acceptable)
      const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle();
      if (error || !data) return null;
      return data as UserProfile;
    } catch {
      return null;
    }
  }

  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<{ error: AuthError | null }> {
    if (!supabase) return { error: null };
    try {
      const { error } = await (supabase as any).from('user_profiles').update(updates).eq('id', userId);
      return { error: error ? parseAuthError(error) : null };
    } catch (e) {
      return { error: parseAuthError(e) };
    }
  }
}
