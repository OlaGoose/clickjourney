/**
 * Supported locales. Default/fallback: en.
 * Browser language is used when no user preference is set.
 */
export const SUPPORTED_LOCALES = ['en', 'es', 'ja', 'zh-Hans'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Map browser language (e.g. zh-CN, zh-TW) to our locale. */
export function normalizeBrowserLocale(browserLang: string): Locale | null {
  const lower = browserLang.split(/[-_]/)[0]?.toLowerCase() ?? '';
  const full = browserLang.split(/[-_]/).map((s) => s.toLowerCase()).join('-');
  if (SUPPORTED_LOCALES.includes(full as Locale)) return full as Locale;
  if (lower === 'en') return 'en';
  if (lower === 'es') return 'es';
  if (lower === 'ja') return 'ja';
  if (lower === 'zh') {
    // zh-CN, zh-SG -> zh-Hans; zh-TW, zh-HK -> could add zh-Hant later
    return full === 'zh-cn' || full === 'zh-sg' || full.startsWith('zh-') ? 'zh-Hans' : 'zh-Hans';
  }
  return null;
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  ja: '日本語',
  'zh-Hans': '简体中文',
};
