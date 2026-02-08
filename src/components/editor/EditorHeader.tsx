'use client';

import { Check } from 'lucide-react';
import { NotionTopbar, NotionTopbarButton } from '@/components/NotionTopbar';

interface EditorHeaderProps {
  onBack: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

/** Notion-style black topbar: Back | 编辑旅程 | Save. */
export function EditorHeader({ onBack, onSave, isSaving = false }: EditorHeaderProps) {
  return (
    <NotionTopbar
      onBack={onBack}
      title="编辑旅程"
      rightActions={
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex p-1.5 flex-shrink-0 items-center justify-center gap-1.5 rounded-md text-white/90 transition-[background] duration-[20ms] ease-in hover:bg-white/[0.08] active:bg-white/[0.12] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ marginInlineEnd: 14 }}
          aria-label="Save"
        >
          {isSaving ? (
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <Check className="h-5 w-5 shrink-0" strokeWidth={2.5} />
          )}
          <span className="text-[13px] font-medium">保存</span>
        </button>
      }
    />
  );
}
