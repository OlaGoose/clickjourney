'use client';

import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from './auth-context';

const AUTH_REDIRECT_KEY = 'orbit-auth-redirect';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useOptionalAuth() {
  return useContext(AuthContext);
}

export function useAuthGuard() {
  const ctx = useOptionalAuth();
  const router = useRouter();
  const isAuthenticated = !!ctx?.user;
  const loading = ctx?.isLoading ?? false;
  const user = ctx?.user ?? null;

  const redirectToAuth = (redirectPath?: string) => {
    if (typeof window === 'undefined') return;
    const current = window.location.pathname;
    if (current !== '/auth') {
      sessionStorage.setItem(AUTH_REDIRECT_KEY, redirectPath || current);
    }
    router.push('/auth');
  };

  const getRedirectPath = () => sessionStorage.getItem(AUTH_REDIRECT_KEY) || '/';
  const clearRedirectPath = () => sessionStorage.removeItem(AUTH_REDIRECT_KEY);

  return {
    isAuthenticated,
    loading,
    user,
    redirectToAuth,
    getRedirectPath,
    clearRedirectPath,
  };
}
