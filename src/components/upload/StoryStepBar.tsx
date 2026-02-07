'use client';

export interface StoryStepBarProps {
  /** Number of segments (default 3, like Instagram stories). */
  steps?: number;
  /** Current step index, 0-based. */
  currentStep?: number;
  /** Progress within current segment, 0–1. Use for timer-based fill (e.g. story duration). */
  progress?: number;
  /** Optional className for the container (e.g. for safe area). */
  className?: string;
  /** Light = white track/fill (on dark bg use dark variant). */
  variant?: 'light' | 'dark';
}

/**
 * Instagram Story–style step progress bar: full-width row of segments,
 * each with a track (opacity-50) and an optional fill that animates left-to-right.
 * Configurable and responsive.
 */
export function StoryStepBar({
  steps = 3,
  currentStep = 0,
  progress = 1,
  className = '',
  variant = 'light',
}: StoryStepBarProps) {
  const safeStep = Math.max(0, Math.min(currentStep, steps - 1));
  const safeProgress = Math.max(0, Math.min(progress, 1));
  const trackClass = variant === 'dark' ? 'bg-white/30' : 'bg-white';
  const fillClass = variant === 'dark' ? 'bg-white/80' : 'bg-white';

  return (
    <div
      role="progressbar"
      aria-valuenow={safeStep}
      aria-valuemin={0}
      aria-valuemax={steps - 1}
      aria-label={`Step ${safeStep + 1} of ${steps}`}
      className={`flex w-full items-stretch gap-0.5 sm:gap-1 ${className}`}
    >
      {Array.from({ length: steps }, (_, i) => {
        const isPassed = i < safeStep;
        const isCurrent = i === safeStep;
        const fillPercent = isPassed ? 100 : isCurrent ? safeProgress * 100 : 0;

        return (
          <div
            key={i}
            className="relative flex-1 min-w-0 h-[3px] overflow-hidden rounded-full"
          >
            <div
              className={`h-full w-full opacity-50 transition-all duration-500 rounded-full ${trackClass}`}
              aria-hidden
            />
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-linear pointer-events-none ${fillClass}`}
              style={{ width: `${fillPercent}%` }}
              aria-hidden
            />
          </div>
        );
      })}
    </div>
  );
}
