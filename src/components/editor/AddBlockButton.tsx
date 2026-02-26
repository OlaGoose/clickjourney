'use client';

import { Plus } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

interface AddBlockButtonProps {
  /** Called when user taps the add zone; parent opens edit panel in add mode. */
  onAddClick: () => void;
}

/** Apple TV style: pill CTA, soft shadow, refined typography. Renders only the button (parent controls fixed/sticky). */
export function AddBlockButton({ onAddClick }: AddBlockButtonProps) {
  const { t } = useLocale();
  return (
    <button
      type="button"
      onClick={onAddClick}
      className="relative z-10 flex h-14 min-w-[200px] w-full max-w-[280px] items-center justify-center gap-2.5 rounded-full bg-[#1d1d1f] text-white hover:bg-[#424245] shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all duration-200 active:scale-[0.98]"
      aria-label={t('editor.addContentBlock')}
    >
      <Plus size={20} strokeWidth={2.5} />
      <span className="text-[15px] font-semibold tracking-tight">{t('editor.addContentHeading')}</span>
    </button>
  );
}
