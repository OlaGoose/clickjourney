'use client';

import { useRouter } from 'next/navigation';
import { NotionTopbar } from '@/components/NotionTopbar';
import { useLocale } from '@/lib/i18n';
import { SUPPORTED_LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

export default function SettingsPage() {
  const router = useRouter();
  const { t, locale, setLocale, isReady } = useLocale();
  const { isAuthenticated } = useAuth();
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    if (!savedMessage) return;
    const id = setTimeout(() => setSavedMessage(false), 2000);
    return () => clearTimeout(id);
  }, [savedMessage]);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    if (isAuthenticated) setSavedMessage(true);
  };

  return (
    <div className="min-h-screen bg-black text-[#f5f5f7]">
      <NotionTopbar
        onBack={() => router.back()}
        title={t('settings.title')}
      />

      <main
        className="mx-auto max-w-2xl px-4 pt-12 pb-24"
        style={{ paddingTop: 'calc(44px + 1.5rem)' }}
      >
        {/* General section */}
        <section className="mb-10">
          <h2 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-[#a1a1a6]">
            {t('settings.general')}
          </h2>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
            {/* Language row */}
            <div className="border-b border-white/10 px-4 py-3">
              <p className="mb-3 text-sm font-medium text-[#f5f5f7]">
                {t('settings.appLanguage')}
              </p>
              <p className="mb-4 text-xs text-[#a1a1a6]">
                {t('settings.languageDescription')}
              </p>
              {isReady && (
                <div className="flex flex-col gap-1">
                  {SUPPORTED_LOCALES.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => handleLocaleChange(loc)}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-[15px] text-[#f5f5f7] transition-colors hover:bg-white/10 active:bg-white/15"
                    >
                      <span>{LOCALE_LABELS[loc]}</span>
                      {locale === loc && (
                        <CheckIcon className="h-5 w-5 text-[rgb(0,113,227)]" aria-hidden />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Placeholder rows for future settings (appearance, notifications, privacy) */}
            <div className="border-b border-white/10 px-4 py-3 opacity-60">
              <p className="text-sm font-medium text-[#f5f5f7]">{t('settings.appearance')}</p>
              <p className="text-xs text-[#a1a1a6]">Coming soon</p>
            </div>
            <div className="border-b border-white/10 px-4 py-3 opacity-60">
              <p className="text-sm font-medium text-[#f5f5f7]">{t('settings.notifications')}</p>
              <p className="text-xs text-[#a1a1a6]">Coming soon</p>
            </div>
            <div className="px-4 py-3 opacity-60">
              <p className="text-sm font-medium text-[#f5f5f7]">{t('settings.privacy')}</p>
              <p className="text-xs text-[#a1a1a6]">Coming soon</p>
            </div>
          </div>
        </section>

        {savedMessage && (
          <p className="text-center text-sm text-emerald-400" role="status">
            {t('settings.saved')}
          </p>
        )}
      </main>
    </div>
  );
}
