'use client';

import { Plus } from 'lucide-react';

interface AddBlockButtonProps {
  /** Called when user taps the add zone; parent opens edit panel in add mode. */
  onAddClick: () => void;
}

/** Apple TV style: pill CTA, soft shadow, refined typography */
export function AddBlockButton({ onAddClick }: AddBlockButtonProps) {
  return (
    <div className="relative flex justify-center">
      <button
        type="button"
        onClick={onAddClick}
        className="relative z-10 flex h-14 w-full max-w-[280px] items-center justify-center gap-2.5 rounded-full bg-[#1d1d1f] text-white hover:bg-[#424245] shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all duration-200 active:scale-[0.98]"
        aria-label="添加内容块"
      >
        <Plus size={20} strokeWidth={2.5} />
        <span className="text-[15px] font-semibold tracking-tight">添加内容</span>
      </button>
    </div>
  );
}
