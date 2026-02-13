'use client';

import { useState, useEffect } from 'react';

/**
 * Day/night theme based on user's local time (best practice for ambient UI).
 * Day: 06:00–21:59, Night: 22:00–05:59.
 * Updates every minute so theme switches without refresh.
 */
export function useDayNightTheme(): 'light' | 'dark' {
  const getTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') {
      // Server-side: default to light to avoid hydration mismatch
      return 'light';
    }
    const hour = new Date().getHours();
    return hour >= 6 && hour < 22 ? 'light' : 'dark';
  };

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(getTheme());
    const interval = setInterval(() => setTheme(getTheme()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Return light during SSR and before client hydration to prevent flash
  if (!mounted) {
    return 'light';
  }

  return theme;
}
