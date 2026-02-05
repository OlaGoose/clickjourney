'use client';

import { memo } from 'react';
import { LoadingSpinner } from './loading-spinner';

interface SubmitButtonProps {
  type?: 'submit' | 'button';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'success';
  className?: string;
}

export const SubmitButton = memo<SubmitButtonProps>(function SubmitButton({
  type = 'submit',
  disabled = false,
  loading = false,
  children,
  onClick,
  variant = 'primary',
  className = '',
}) {
  const isDisabled = disabled || loading;

  const base =
    'inline-flex h-12 w-full select-none items-center justify-center whitespace-nowrap rounded-xl border-none text-base font-semibold transition-all';
  const disabledClass =
    'cursor-not-allowed bg-[#3a3a3c] text-[#6e6e73]';
  const primaryClass =
    'cursor-pointer bg-white text-black hover:bg-white/90 active:scale-[0.98]';
  const successClass =
    'cursor-pointer bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98]';

  const variantClass = variant === 'success' ? successClass : primaryClass;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`${base} mt-4 ${isDisabled ? disabledClass : variantClass} ${className}`}
      aria-disabled={isDisabled}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <LoadingSpinner size="sm" color={isDisabled ? '#6e6e73' : '#000'} />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
});
