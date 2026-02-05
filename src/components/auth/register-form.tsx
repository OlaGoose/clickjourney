'use client';

import { useState, memo, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { FormInput } from './form-input';
import { SubmitButton } from './submit-button';
import { ErrorMessage } from './error-message';
import { LoadingOverlay } from '@/components/ui/loading-overlay';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const RegisterForm = memo<RegisterFormProps>(function RegisterForm({
  onSuccess,
  onSwitchToLogin,
}) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signUp, isLoading } = useAuth();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);
      try {
        const { error: err } = await signUp({
          email,
          password,
          username: username || undefined,
        });
        if (err) {
          setError(err.message);
          return;
        }
        onSuccess?.();
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, username, signUp, onSuccess]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'username') setUsername(value);
    else if (name === 'email') setEmail(value);
    else if (name === 'password') setPassword(value);
    else if (name === 'confirmPassword') setConfirmPassword(value);
  }, []);

  const isUsernameValid = username.length >= 3;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 8;
  const isPasswordMatch = password === confirmPassword && confirmPassword.length > 0;
  const isFormValid =
    isUsernameValid && isEmailValid && isPasswordValid && isPasswordMatch;

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        <FormInput
          id="register-username"
          name="username"
          type="text"
          label="Username"
          placeholder="Choose a username"
          value={username}
          onChange={handleChange}
          disabled={isSubmitting || isLoading}
          autoComplete="username"
          required
          error={username && !isUsernameValid ? 'At least 3 characters' : undefined}
        />
        <FormInput
          id="register-email"
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
          id="register-password"
          name="password"
          type="password"
          label="Password"
          placeholder="Choose a password"
          value={password}
          onChange={handleChange}
          disabled={isSubmitting || isLoading}
          autoComplete="new-password"
          showPasswordToggle
          required
          error={password && !isPasswordValid ? 'At least 8 characters' : undefined}
        />
        <FormInput
          id="register-confirm-password"
          name="confirmPassword"
          type="password"
          label="Confirm password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={handleChange}
          disabled={isSubmitting || isLoading}
          autoComplete="new-password"
          showPasswordToggle
          required
          error={
            confirmPassword && !isPasswordMatch ? 'Passwords do not match' : undefined
          }
        />
        <ErrorMessage error={error} />
        <SubmitButton
          type="submit"
          disabled={!isFormValid}
          loading={isSubmitting || isLoading}
          variant="success"
        >
          Continue
        </SubmitButton>
        {onSwitchToLogin && (
          <div className="mt-5 text-center">
            <span className="text-sm text-[#a1a1a6]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="cursor-pointer border-none bg-transparent font-semibold text-white underline hover:no-underline disabled:opacity-50"
                disabled={isSubmitting || isLoading}
              >
                Sign in
              </button>
            </span>
          </div>
        )}
      </form>
      <LoadingOverlay
        isVisible={isSubmitting || isLoading}
        message={isSubmitting ? 'Creating account...' : 'Verifying...'}
        showBackdrop
        size="md"
      />
    </>
  );
});
