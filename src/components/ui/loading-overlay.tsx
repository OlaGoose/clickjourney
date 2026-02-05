'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSpinner } from '@/components/auth/loading-spinner';
import { ANIMATION_DURATION, SPRING_CONFIG } from '@/config/animations';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  showBackdrop?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingOverlay = memo<LoadingOverlayProps>(function LoadingOverlay({
  isVisible,
  message = 'Loading...',
  showBackdrop = true,
  size = 'md',
  className = '',
}) {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: ANIMATION_DURATION.FAST }}
        className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        {showBackdrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
        )}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={SPRING_CONFIG.FAST}
          className="relative flex flex-col items-center p-8"
        >
          <LoadingSpinner size={size} />
          <p className="mt-4 font-medium text-[#f5f5f7]">{message}</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});
