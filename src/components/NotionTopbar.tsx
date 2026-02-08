'use client';

import { ReactNode } from 'react';

export interface NotionTopbarProps {
  onBack: () => void;
  title: string;
  /** Right-side actions (e.g. Share, Save, More menu). */
  rightActions?: ReactNode;
}

/**
 * Notion-style mobile topbar: fixed black bar, 44px, back + title + actions.
 * Unified header for memories/editor and memories/cinematic.
 */
export function NotionTopbar({ onBack, title, rightActions }: NotionTopbarProps) {
  return (
    <header
      role="banner"
      className="notion-topbar-mobile fixed top-0 left-0 right-0 z-30 flex h-[44px] w-full max-w-[100vw] shrink-0 items-center justify-between bg-black"
      style={{
        boxShadow: '0 0.3333333333333333px 0 rgba(255,255,255,0.08)',
        paddingInline: 0,
      }}
    >
      <div className="flex min-w-0 flex-1 flex-shrink items-center overflow-hidden h-full">
        <button
          type="button"
          className="flex h-full w-9 flex-shrink-0 items-center justify-center text-[#f5f5f7] transition-[background] duration-[20ms] ease-in hover:bg-white/[0.08] active:bg-white/[0.12] ml-1"
          onClick={onBack}
          aria-label="Back"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M12.79 3.22a.75.75 0 0 1 0 1.06L7.56 9.5l5.23 5.22a.75.75 0 1 1-1.06 1.06l-5.75-5.75a.75.75 0 0 1 0-1.06l5.75-5.75a.75.75 0 0 1 1.06 0Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <div
          className="flex flex-1 items-center overflow-hidden whitespace-nowrap text-ellipsis text-base leading-tight text-[#f5f5f7] mx-0 min-w-0 max-w-full h-full"
          style={{ marginInline: '0 8px' }}
        >
          <span className="block truncate">{title}</span>
        </div>
      </div>
      <div className="flex flex-shrink-0 flex-grow-0 items-center h-full px-1 pr-2">
        {rightActions}
      </div>
    </header>
  );
}

/** Button style matching Notion topbar right actions (Share / More). */
export function NotionTopbarButton({
  onClick,
  'aria-label': ariaLabel,
  'aria-expanded': ariaExpanded,
  'aria-haspopup': ariaHaspopup,
  children,
  className = '',
}: {
  onClick?: () => void;
  'aria-label'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid' | boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex p-1 flex-shrink-0 items-center justify-center rounded-md text-white/70 transition-[background] duration-[20ms] ease-in hover:bg-white/[0.08] active:bg-white/[0.12] ${className}`}
      style={{ marginInlineEnd: 14 }}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHaspopup}
    >
      {children}
    </button>
  );
}
