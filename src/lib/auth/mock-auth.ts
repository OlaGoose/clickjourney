/**
 * Mock auth for local/dev: default test account when NEXT_PUBLIC_ENABLE_MOCK_AUTH=true
 */

import type { User } from '@supabase/supabase-js';
import type { UserProfile } from './types';

const MOCK_USER_ID = 'mock-orbit-user-001';
const MOCK_TEST_EMAIL = 'test@orbit.local';
const MOCK_TEST_PASSWORD = 'test1234';

export const MOCK_TEST_ACCOUNT = {
  email: MOCK_TEST_EMAIL,
  password: MOCK_TEST_PASSWORD,
};

export interface MockSession {
  user: User;
  profile: UserProfile;
}

/**
 * Whether mock auth is active (mock login/session allowed).
 * By default only in development or Vercel preview; set NEXT_PUBLIC_ALLOW_MOCK_IN_PRODUCTION=true
 * to allow mock auth in production (e.g. for demo sites). Use with caution.
 */
export function isLocalDevelopment(): boolean {
  const isMockEnabled = process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true';
  if (!isMockEnabled) return false;
  const allowInProduction = process.env.NEXT_PUBLIC_ALLOW_MOCK_IN_PRODUCTION === 'true';
  if (allowInProduction) return true;
  const isDev = process.env.NODE_ENV === 'development';
  const isPreview = process.env.VERCEL_ENV === 'preview';
  return isDev || isPreview;
}

export function isMockTestCredentials(email: string, password: string): boolean {
  return email === MOCK_TEST_EMAIL && password === MOCK_TEST_PASSWORD;
}

function createMockUser(): User {
  const now = new Date().toISOString();
  return {
    id: MOCK_USER_ID,
    email: MOCK_TEST_EMAIL,
    user_metadata: { username: 'orbit_test' },
    app_metadata: {},
    aud: 'authenticated',
    created_at: now,
    updated_at: now,
  } as User;
}

function createMockProfile(): UserProfile {
  const now = new Date().toISOString();
  return {
    id: MOCK_USER_ID,
    email: MOCK_TEST_EMAIL,
    username: 'orbit_test',
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=orbit`,
    tier: 'free',
    settings: {},
    created_at: now,
    updated_at: now,
  };
}

export function getMockSession(): MockSession | null {
  if (!isLocalDevelopment() || typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('orbit_mock_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.user) return null;
    return parsed as MockSession;
  } catch {
    return null;
  }
}

export function setMockSession(session: MockSession): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('orbit_mock_session', JSON.stringify(session));
  }
}

export function clearMockSession(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('orbit_mock_session');
  }
}

export function createMockSession(): MockSession {
  return {
    user: createMockUser(),
    profile: createMockProfile(),
  };
}
