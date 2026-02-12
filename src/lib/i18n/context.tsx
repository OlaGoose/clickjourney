'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/lib/auth';
import type { Locale } from './locales';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  normalizeBrowserLocale,
} from './locales';
import en from './messages/en.json';
import es from './messages/es.json';
import ja from './messages/ja.json';
import zhHans from './messages/zh-Hans.json';
import type { MessageKey } from './types';

const MESSAGES: Record<Locale, typeof en> = {
  en,
  es: es as typeof en,
  ja: ja as typeof en,
  'zh-Hans': zhHans as typeof en,
};

const STORAGE_KEY = 'orbit_locale';

function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && SUPPORTED_LOCALES.includes(v as Locale)) return v as Locale;
  } catch {}
  return null;
}

function setStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {}
}

function getBrowserLocale(): Locale {
  if (typeof window === 'undefined' || !window.navigator?.language) return DEFAULT_LOCALE;
  const normalized = normalizeBrowserLocale(window.navigator.language);
  if (normalized) return normalized;
  const first = window.navigator.languages?.find((l) => normalizeBrowserLocale(l));
  return first ? normalizeBrowserLocale(first)! : DEFAULT_LOCALE;
}

function getMessage(messages: typeof en, key: MessageKey): string {
  const parts = key.split('.');
  let current: unknown = messages;
  for (const p of parts) {
    if (current != null && typeof current === 'object' && p in current) {
      current = (current as Record<string, unknown>)[p];
    } else {
      return key;
    }
  }
  return typeof current === 'string' ? current : key;
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
  isReady: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { profile, isAuthenticated, updateProfile } = useAuth();
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [isReady, setIsReady] = useState(false);

  // Resolve initial locale: user profile (logged in) → localStorage → browser → en
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fromProfile = isAuthenticated && profile?.settings?.locale;
    const profileLocale =
      typeof fromProfile === 'string' && SUPPORTED_LOCALES.includes(fromProfile as Locale)
        ? (fromProfile as Locale)
        : null;
    const stored = getStoredLocale();
    const browser = getBrowserLocale();

    const next = profileLocale ?? stored ?? browser;
    setLocaleState(next);
    if (!stored && !profileLocale) setStoredLocale(next);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next === 'zh-Hans' ? 'zh-Hans' : next;
    }
    setIsReady(true);
  }, [isAuthenticated, profile?.settings]);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      setStoredLocale(newLocale);
      if (typeof document !== 'undefined') {
        document.documentElement.lang =
          newLocale === 'zh-Hans' ? 'zh-Hans' : newLocale;
      }
      if (isAuthenticated && profile) {
        updateProfile({
          settings: { ...profile.settings, locale: newLocale },
        }).catch(() => {});
      }
    },
    [isAuthenticated, profile, updateProfile]
  );

  const t = useCallback(
    (key: MessageKey) => {
      const messages = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
      return getMessage(messages, key);
    },
    [locale]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t, isReady }),
    [locale, setLocale, t, isReady]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
}

export function useOptionalLocale(): LocaleContextValue | null {
  return useContext(LocaleContext);
}
