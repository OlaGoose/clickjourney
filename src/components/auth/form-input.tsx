'use client';

import { useState, memo, forwardRef } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface FormInputProps {
  id: string;
  name: string;
  type?: 'text' | 'email' | 'password';
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  autoComplete?: string;
  showPasswordToggle?: boolean;
  error?: string;
  required?: boolean;
}

export const FormInput = memo(forwardRef<HTMLInputElement, FormInputProps>(function FormInput(
  {
    id,
    name,
    type = 'text',
    label,
    placeholder,
    value,
    onChange,
    disabled = false,
    autoComplete,
    showPasswordToggle = false,
    error,
    required = false,
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputType = type === 'password' && showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium text-[#a1a1a6]"
      >
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      <div
        className={`relative flex w-full items-center rounded-lg border bg-white/5 px-3 py-2 transition-all ${
          isFocused
            ? 'border-white/30 ring-2 ring-white/10'
            : 'border-white/10'
        } ${error ? 'border-red-400/50' : ''}`}
      >
        <input
          ref={ref}
          id={id}
          name={name}
          type={inputType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-label={label}
          aria-required={required}
          aria-invalid={!!error}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full resize-none border-none bg-transparent p-0 text-[15px] leading-[30px] text-[#f5f5f7] outline-none placeholder:text-[#6e6e73]"
          disabled={disabled}
        />
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 flex items-center justify-center border-none bg-transparent p-1 text-[#a1a1a6]"
            disabled={disabled}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}));
