'use client';

import { useState, useEffect } from 'react';

/**
 * Day/night theme based on user's local time (best practice for ambient UI).
 * Day: 06:00–21:59, Night: 22:00–05:59.
 * Updates every minute so theme switches without refresh.
 * Syncs to document.documentElement.classList ('dark') so Tailwind dark: works app-wide.
 */
export function useDayNightTheme(): 'light' | 'dark' {
  const getTheme = (): 'light' | 'dark' => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 22 ? 'light' : 'dark';
  };

  // Client: use local time for initial state so first paint is correct. Server: default light.
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof window !== 'undefined' ? getTheme() : 'light'
  );

  useEffect(() => {
    const sync = () => {
      const next = getTheme();
      setTheme(next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    };
    sync();
    const interval = setInterval(sync, 60_000);
    return () => clearInterval(interval);
  }, []);

  return theme;
}
