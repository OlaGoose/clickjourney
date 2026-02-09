'use client';

import { Plus } from 'lucide-react';

interface AddBlockButtonProps {
  /** Called when user taps the add zone; parent opens edit panel in add mode. */
  onAddClick: () => void;
}

/** Apple light mode: rounded rectangle "add" zone, same position as before. No popover. */
export function AddBlockButton({ onAddClick }: AddBlockButtonProps) {
  return (
    <div className="relative flex justify-center">
      <button
        type="button"
        onClick={onAddClick}
        className="relative z-10 flex h-14 w-full max-w-[280px] items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] text-white hover:bg-[#424245] shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all active:scale-[0.98]"
        aria-label="添加内容块"
      >
        <Plus size={20} strokeWidth={2.5} />
        <span className="text-[15px] font-semibold">添加内容</span>
      </button>
    </div>
  );
}
