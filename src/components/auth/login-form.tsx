'use client';

import { useState, memo, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { FormInput } from './form-input';
import { SubmitButton } from './submit-button';
import { ErrorMessage } from './error-message';
import { LoadingOverlay } from '@/components/ui/loading-overlay';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export const LoginForm = memo<LoginFormProps>(function LoginForm({
  onSuccess,
  onSwitchToRegister,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signIn, isLoading } = useAuth();
  const { t } = useLocale();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);
      try {
        const { error: err } = await signIn({ email, password });
        if (err) {
          setError(err.message);
          return;
        }
        onSuccess?.();
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, signIn, onSuccess]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'email') setEmail(value);
    else if (name === 'password') setPassword(value);
  }, []);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;
  const isFormValid = isEmailValid && isPasswordValid;

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        <FormInput
          id="login-email"
          name="email"
          type="email"
          label={t('auth.email')}
          placeholder={t('auth.enterEmail')}
          value={email}
          onChange={handleChange}
          disabled={isSubmitting || isLoading}
          autoComplete="email"
          required
          error={email && !isEmailValid ? t('auth.validEmail') : undefined}
        />
        <FormInput
          id="login-password"
          name="password"
          type="password"
          label={t('auth.password')}
          placeholder={t('auth.enterPassword')}
          value={password}
          onChange={handleChange}
          disabled={isSubmitting || isLoading}
          autoComplete="current-password"
          showPasswordToggle
          required
          error={password && !isPasswordValid ? t('auth.passwordMin6') : undefined}
        />
        <ErrorMessage error={error} />
        <SubmitButton
          type="submit"
          disabled={!isFormValid}
          loading={isSubmitting || isLoading}
        >
          {t('auth.continue')}
        </SubmitButton>
        {onSwitchToRegister && (
          <div className="mt-5 text-center">
            <span className="text-sm text-[#a1a1a6]">
              {t('auth.noAccount')}{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="cursor-pointer border-none bg-transparent font-semibold text-white underline hover:no-underline disabled:opacity-50"
                disabled={isSubmitting || isLoading}
              >
                {t('auth.signUp')}
              </button>
            </span>
          </div>
        )}
      </form>
      <LoadingOverlay
        isVisible={isSubmitting || isLoading}
        message={isSubmitting ? t('auth.signingIn') : t('auth.verifying')}
        showBackdrop
        size="md"
      />
    </>
  );
});
