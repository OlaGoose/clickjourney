'use client';

import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { SupabaseAuthService } from './supabase-auth';
import {
  isLocalDevelopment,
  isMockTestCredentials,
  getMockSession,
  setMockSession,
  clearMockSession,
  createMockSession,
} from './mock-auth';
import type {
  AuthState,
  LoginCredentials,
  RegisterCredentials,
  OAuthProvider,
  UserProfile,
  AuthError,
} from './types';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
  signIn: (c: LoginCredentials) => Promise<{ error: AuthError | null }>;
  signUp: (c: RegisterCredentials) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (p: OAuthProvider) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (u: Partial<UserProfile>) => Promise<{ error: AuthError | null }>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const p = await SupabaseAuthService.getUserProfile(userId);
      setProfile(p);
    } catch (e) {
      console.error('loadUserProfile', e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      try {
        // Check for mock session in development
        if (isLocalDevelopment() && typeof window !== 'undefined') {
          const mock = getMockSession();
          if (mock && mounted) {
            setUser(mock.user);
            setProfile(mock.profile);
            setSession({ user: mock.user } as Session);
            setIsLoading(false);
            return;
          }
        }
        
        // Get current session from Supabase (from cookies)
        // This will restore the session if it exists
        const { session: s } = await SupabaseAuthService.getSession();
        if (!mounted) return;
        
        if (s?.user) {
          setSession(s);
          setUser(s.user);
          await loadUserProfile(s.user.id);
        }
      } catch (e) {
        console.error('Auth initialization error:', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    
    init();
    
    // Listen for auth state changes (e.g. TOKEN_REFRESHED, SIGNED_OUT).
    // Only clear state on explicit SIGNED_OUT so session is kept until user logs out.
    const { data: { subscription } } = SupabaseAuthService.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        loadUserProfile(newSession.user.id).catch(() => {});
      } else {
        setProfile(null);
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setSession(null);
      }
    });
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const signIn = useCallback(async (c: LoginCredentials) => {
    setIsLoading(true);
    try {
      if (isLocalDevelopment() && isMockTestCredentials(c.email, c.password)) {
        const mock = createMockSession();
        setMockSession(mock);
        setUser(mock.user);
        setProfile(mock.profile);
        setSession({ user: mock.user } as Session);
        return { error: null };
      }
      const r = await SupabaseAuthService.signIn(c);
      if (!r.error && r.user) await loadUserProfile(r.user.id);
      return { error: r.error };
    } finally {
      setIsLoading(false);
    }
  }, [loadUserProfile]);

  const signUp = useCallback(async (c: RegisterCredentials) => {
    setIsLoading(true);
    try {
      const r = await SupabaseAuthService.signUp(c);
      if (!r.error && r.user) await loadUserProfile(r.user.id);
      return { error: r.error };
    } finally {
      setIsLoading(false);
    }
  }, [loadUserProfile]);

  const signInWithOAuth = useCallback(async (p: OAuthProvider) => {
    return SupabaseAuthService.signInWithOAuth(p);
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isLocalDevelopment() && getMockSession()) {
        clearMockSession();
        setUser(null);
        setProfile(null);
        setSession(null);
        return { error: null };
      }
      const r = await SupabaseAuthService.signOut();
      if (!r.error) {
        setUser(null);
        setProfile(null);
        setSession(null);
      }
      return r;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadUserProfile(user.id);
  }, [user, loadUserProfile]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return { error: { code: 'USER_NOT_FOUND' as const, message: 'Not authenticated' } };
    const r = await SupabaseAuthService.updateUserProfile(user.id, updates);
    if (!r.error) await refreshProfile();
    return r;
  }, [user, refreshProfile]);

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
    refreshProfile,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
