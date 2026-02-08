'use client';

import { ArrowLeft, Check } from 'lucide-react';

interface EditorHeaderProps {
  onBack: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

export function EditorHeader({ onBack, onSave, isSaving = false }: EditorHeaderProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-3 border-b border-gray-100">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
        aria-label="Back"
      >
        <ArrowLeft size={20} strokeWidth={2} />
      </button>
      <span className="text-base font-semibold">编辑旅程</span>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          isSaving
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-black text-white hover:bg-gray-800 active:scale-95'
        }`}
        aria-label="Save"
      >
        {isSaving ? (
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            保存中
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Check size={14} />
            保存
          </span>
        )}
      </button>
    </div>
  );
}
