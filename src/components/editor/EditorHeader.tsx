'use client';

import { ArrowLeft, Check } from 'lucide-react';

interface EditorHeaderProps {
  onBack: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

/** Apple light mode only: white header, black text, minimal chrome. */
export function EditorHeader({ onBack, onSave, isSaving = false }: EditorHeaderProps) {
  return (
    <div className="sticky top-0 z-10 grid grid-cols-3 items-center px-4 py-3 bg-[#fbfbfd]/95 backdrop-blur-xl border-b border-black/[0.06]">
      <button
        type="button"
        onClick={onBack}
        className="justify-self-start -ml-2 rounded-full p-2.5 text-[#1d1d1f] hover:bg-black/[0.04] transition-all active:scale-95"
        aria-label="Back"
      >
        <ArrowLeft size={20} strokeWidth={2} />
      </button>
      <span className="justify-self-center text-base font-semibold text-[#1d1d1f]">
        编辑旅程
      </span>
      <div className="justify-self-end">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className={`rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all active:scale-95 ${
            isSaving
              ? 'bg-[#e8e8ed] text-[#86868b] cursor-not-allowed'
              : 'bg-[#1d1d1f] text-white hover:bg-[#424245] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          }`}
          aria-label="Save"
        >
          {isSaving ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#86868b]/30 border-t-[#1d1d1f]" />
              保存中
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Check size={14} strokeWidth={2.5} />
              保存
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
