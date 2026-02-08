'use client';

import { ArrowLeft, Check } from 'lucide-react';

interface EditorHeaderProps {
  isDark?: boolean;
  onBack: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

export function EditorHeader({ isDark = false, onBack, onSave, isSaving = false }: EditorHeaderProps) {
  return (
    <div
      className={`sticky top-0 z-10 grid grid-cols-3 items-center px-4 py-3 transition-colors duration-300 ${
        isDark
          ? 'bg-[#0a0a0a]/95 backdrop-blur-xl'
          : 'bg-white/95 backdrop-blur-xl'
      }`}
    >
      <button
        type="button"
        onClick={onBack}
        className={`justify-self-start -ml-2 rounded-full p-2.5 transition-all active:scale-95 ${
          isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-black'
        }`}
        aria-label="Back"
      >
        <ArrowLeft size={20} strokeWidth={2} />
      </button>
      <span
        className={`justify-self-center text-base font-semibold ${isDark ? 'text-white' : 'text-black'}`}
      >
        编辑旅程
      </span>
      <div className="justify-self-end">
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className={`rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all active:scale-95 ${
          isSaving
            ? isDark
              ? 'bg-white/10 text-white/40 cursor-not-allowed'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : isDark
              ? 'bg-white text-black hover:bg-white/90 shadow-lg'
              : 'bg-black text-white hover:bg-gray-800 shadow-lg'
        }`}
        aria-label="Save"
      >
        {isSaving ? (
          <span className="flex items-center gap-1.5">
            <span
              className={`h-3 w-3 animate-spin rounded-full border-2 border-t-transparent ${
                isDark ? 'border-white/30 border-t-white' : 'border-gray-400 border-t-white'
              }`}
            />
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
