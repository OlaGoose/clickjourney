/*
 * @Author: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @Date: 2026-02-07 17:05:24
 * @LastEditors: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @LastEditTime: 2026-02-07 17:14:33
 * @FilePath: /orbit-journey-next/src/components/upload/ErrorDisplay.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface ErrorDisplayProps {
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] max-w-md w-full mx-4"
        >
          <div className="bg-red-500/90 backdrop-blur-xl border border-red-400/20 rounded-2xl shadow-2xl p-4 relative">
            {/* Close button */}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="absolute top-3 right-3 p-1 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <X size={16} className="text-white" />
              </button>
            )}

            {/* Error content */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <AlertCircle className="text-white" size={20} strokeWidth={2} />
              </div>
              <div className="flex-1 pr-6">
                <h3 className="text-white font-semibold text-sm mb-1">
                  Generation Failed
                </h3>
                <p className="text-white/90 text-xs leading-relaxed">
                  {error}
                </p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white text-xs font-medium"
                  >
                    <RefreshCw size={14} />
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
