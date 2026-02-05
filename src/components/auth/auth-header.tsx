'use client';

import { memo } from 'react';

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
}

export const AuthHeader = memo<AuthHeaderProps>(function AuthHeader({
  title,
  subtitle,
}) {
  return (
    <div className="mb-6 flex max-w-sm flex-col items-center text-center">
      <h1 className="m-0 text-left text-xl font-semibold leading-tight text-[#f5f5f7]">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-left text-sm leading-5 text-[#a1a1a6]">
          {subtitle}
        </p>
      )}
    </div>
  );
});
