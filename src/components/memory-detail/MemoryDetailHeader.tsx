'use client';

import { useState, useRef, useEffect } from 'react';

interface MemoryDetailHeaderProps {
  onBack: () => void;
  onShare?: () => void;
  /** Menu content for the "..." dropdown (e.g. Edit, Delete). Clicks on buttons inside will close the menu. */
  moreMenu?: React.ReactNode;
}

const TITLE = '旅行回忆';

export function MemoryDetailHeader({ onBack, onShare, moreMenu }: MemoryDetailHeaderProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreOpen]);

  const handleMoreContentClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) setMoreOpen(false);
  };

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-3 border-b border-gray-100">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
        aria-label="Back"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>
      <span className="text-base font-semibold">{TITLE}</span>
      <div className="flex items-center gap-1">
        {onShare != null && (
          <button
            type="button"
            onClick={onShare}
            className="rounded-full p-2 hover:bg-gray-100"
            aria-label="Share"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
        )}
        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="rounded-full p-2 hover:bg-gray-100"
            aria-label="More actions"
            aria-expanded={moreOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
          {moreOpen && moreMenu != null && (
            <div
              className="absolute right-0 top-full mt-1 min-w-[140px] rounded-lg bg-white py-1 shadow-lg border border-gray-200 text-left z-50"
              role="menu"
              onClick={handleMoreContentClick}
            >
              {moreMenu}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
