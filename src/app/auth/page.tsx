'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';
import { SocialLoginSection } from '@/components/auth/social-login-section';
import { AuthHeader } from '@/components/auth/auth-header';
import { useAuthGuard } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const router = useRouter();
  const { t } = useLocale();
  const { isAuthenticated, getRedirectPath, clearRedirectPath } = useAuthGuard();

  useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = getRedirectPath();
      clearRedirectPath();
      router.push(redirectPath);
    }
  }, [isAuthenticated, getRedirectPath, clearRedirectPath, router]);

  const switchMode = useCallback((newMode: 'login' | 'register') => {
    setMode(newMode);
  }, []);

  const handleEmailLogin = useCallback(() => setShowEmailForm(true), []);

  return (
    <div className="min-h-screen overflow-auto bg-black text-[#f5f5f7]">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <nav className="flex h-14 items-center justify-between px-5">
          <Link
            href="/"
            className="text-xl font-semibold text-white no-underline"
            aria-label="Orbit Journey"
          >
            Orbit Journey
          </Link>
          <span className="text-sm font-medium text-[#a1a1a6]">{t('auth.help')}</span>
        </nav>
      </header>

      <main className="flex min-h-screen flex-col items-center px-5 pt-[4rem]">
        <div className="w-full max-w-md flex-1 py-8">
          <AuthHeader
            title={mode === 'login' ? t('auth.signInTitle') : t('auth.signUpTitle')}
            subtitle={
              mode === 'login'
                ? t('auth.signInSubtitle')
                : t('auth.signUpSubtitle')
            }
          />

          <div className="mb-8 w-full">
            <SocialLoginSection onEmailLogin={handleEmailLogin} />

            <div className="my-4 flex items-center justify-center">
              <div className="h-px w-full border-b border-white/20" role="separator" />
            </div>

            <AnimatePresence mode="wait">
              {showEmailForm ? (
                <motion.div
                  key="email-form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {mode === 'login' ? (
                    <LoginForm onSwitchToRegister={() => switchMode('register')} />
                  ) : (
                    <RegisterForm onSwitchToLogin={() => switchMode('login')} />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="social"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="py-5 text-center"
                >
                  <p className="m-0 text-sm text-[#a1a1a6]">{t('auth.continueWith')}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="text-center text-xs leading-relaxed text-[#6e6e73]">
            {t('auth.termsPrefix')}
            <a href="#" className="text-white underline hover:no-underline">{t('auth.terms')}</a>
            {t('auth.termsAnd')}
            <a href="#" className="text-white underline hover:no-underline">{t('auth.privacyPolicy')}</a>
            {t('auth.termsSuffix')}
          </p>
        </div>
      </main>
    </div>
  );
}
