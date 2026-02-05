'use client';

import { memo } from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const LoadingSpinner = memo<LoadingSpinnerProps>(function LoadingSpinner({
  size = 'md',
  color = '#f5f5f7',
  className = '',
}) {
  const sizeMap = { sm: '16px', md: '24px', lg: '32px' };
  const spinnerSize = sizeMap[size];

  return (
    <div
      className={className}
      style={{
        display: 'inline-block',
        width: spinnerSize,
        height: spinnerSize,
        border: `2px solid ${color}20`,
        borderTop: `2px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite',
        willChange: 'transform',
      }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading</span>
    </div>
  );
});
