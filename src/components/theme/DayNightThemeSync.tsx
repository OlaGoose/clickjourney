'use client';

import { useDayNightTheme } from '@/hooks/useDayNightTheme';

/**
 * Mounts useDayNightTheme so theme is synced to document.documentElement (class "dark").
 * Place once in root layout so Tailwind dark: works app-wide before vlog/upload mount.
 */
export function DayNightThemeSync() {
  useDayNightTheme();
  return null;
}
