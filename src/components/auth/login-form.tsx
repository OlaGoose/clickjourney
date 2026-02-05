'use client';

import { useState, memo, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
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
          label="Email"
          placeholder="Enter your email"
          value={email}
          onChange={handleChange}
          disabled={isSubmitting || isLoading}
          autoComplete="email"
          required
          error={email && !isEmailValid ? 'Please enter a valid email' : undefined}
        />
        <FormInput
          id="login-password"
          name="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={handleChange}
          disabled={isSubmitting || isLoading}
          autoComplete="current-password"
          showPasswordToggle
          required
          error={password && !isPasswordValid ? 'Password must be at least 6 characters' : undefined}
        />
        <ErrorMessage error={error} />
        <SubmitButton
          type="submit"
          disabled={!isFormValid}
          loading={isSubmitting || isLoading}
        >
          Continue
        </SubmitButton>
        {onSwitchToRegister && (
          <div className="mt-5 text-center">
            <span className="text-sm text-[#a1a1a6]">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="cursor-pointer border-none bg-transparent font-semibold text-white underline hover:no-underline disabled:opacity-50"
                disabled={isSubmitting || isLoading}
              >
                Sign up
              </button>
            </span>
          </div>
        )}
      </form>
      <LoadingOverlay
        isVisible={isSubmitting || isLoading}
        message={isSubmitting ? 'Signing in...' : 'Verifying...'}
        showBackdrop
        size="md"
      />
    </>
  );
});
