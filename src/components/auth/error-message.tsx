'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';

interface ErrorMessageProps {
  error: string | null;
  className?: string;
}

export const ErrorMessage = memo<ErrorMessageProps>(function ErrorMessage({
  error,
  className = '',
}) {
  if (!error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`my-3 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <span>{error}</span>
    </motion.div>
  );
});
