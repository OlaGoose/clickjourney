'use client';

import type { DividerStyle } from '@/types/editor';

export interface DividerBlockProps {
  /** Visual style: thin hairline, default line, or with center accent. */
  style?: DividerStyle;
  /** When true, used in read-only / detail view (no interactive padding). */
  readOnly?: boolean;
  className?: string;
}

/**
 * Apple-style divider: refined, generous spacing, subtle line.
 * - thin: 0.5px hairline, minimal weight
 * - default: 1px line, balanced
 * - accent: 1px line with a small center dot (product-page style)
 */
export function DividerBlock({
  style = 'default',
  readOnly = false,
  className = '',
}: DividerBlockProps) {
  const paddingY = readOnly ? 'py-5' : 'py-6';
  const isThin = style === 'thin';
  const isAccent = style === 'accent';

  const lineClass = 'border-0 bg-black/[0.08]';
  const lineHeight = isThin ? 'h-px' : 'h-[1px]';

  return (
    <div
      role="separator"
      aria-hidden="true"
      className={`w-full flex items-center justify-center ${paddingY} ${className}`}
    >
      {isAccent ? (
        <span className="flex items-center gap-3 w-full max-w-[240px]">
          <span
            className={`flex-1 min-w-0 shrink ${lineHeight} ${lineClass}`}
            style={isThin ? { transform: 'scaleY(0.5)' } : undefined}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-black/[0.14] shrink-0"
            aria-hidden
          />
          <span
            className={`flex-1 min-w-0 shrink ${lineHeight} ${lineClass}`}
            style={isThin ? { transform: 'scaleY(0.5)' } : undefined}
          />
        </span>
      ) : (
        <hr
          className={`w-full max-w-[280px] ${lineHeight} ${lineClass}`}
          style={isThin ? { transform: 'scaleY(0.5)' } : undefined}
        />
      )}
    </div>
  );
}
