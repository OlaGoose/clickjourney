'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ContentBlock } from '@/components/editor/ContentBlock';
import { MemoryDetailHeader } from '@/components/memory-detail/MemoryDetailHeader';
import { MemoryService } from '@/lib/db/services/memory-service';
import { updateMemory } from '@/lib/storage';
import { copyMemoryShareLink } from '@/lib/share-link';
import { useOptionalAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import type { CarouselItem, MemoryVisibility } from '@/types/memory';

interface RichStoryDetailProps {
  memory: CarouselItem;
  onBack: () => void;
  /** When true, only the content area is shown (no header). Used for shared links. */
  shareView?: boolean;
  isOwner?: boolean;
}

/** Renders rich-story memory with same layout as memories/editor (read-only). Header has visibility (public/private) and "..." menu (Edit, Delete). */
export function RichStoryDetail({ memory, onBack, shareView = false, isOwner = false }: RichStoryDetailProps) {
  const router = useRouter();
  const { t } = useLocale();
  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;
  const [isDeleting, setIsDeleting] = useState(false);
  const [visibility, setVisibility] = useState<MemoryVisibility>(memory.visibility ?? 'private');

  const title = memory.detailTitle ?? memory.title ?? '';
  const description = memory.description ?? '';
  const blocks = (memory.editorBlocks ?? []).slice().sort((a, b) => a.order - b.order);
  const hasBlocks = blocks.length > 0;
  const richContent = memory.richContent ?? '';

  useEffect(() => {
    setVisibility(memory.visibility ?? 'private');
  }, [memory.visibility]);

  const handleVisibilityChange = useCallback(
    async (v: MemoryVisibility) => {
      setVisibility(v);
      if (!userId) return;
      await updateMemory(userId, memory.id, { visibility: v });
      if (v === 'public') {
        const copied = await copyMemoryShareLink(memory.id);
        if (copied) alert(t('memory.linkCopied'));
      }
    },
    [userId, memory.id, t]
  );

  const handleEdit = () => {
    router.push(`/memories/editor?id=${memory.id}`);
  };

  const handleDelete = async () => {
    const confirmed = confirm(t('memory.deleteConfirm'));
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const { error } = await MemoryService.deleteMemory(memory.id);
      if (error) {
        alert(`${t('memory.deleteFailed')} ${error}`);
        setIsDeleting(false);
        return;
      }

      router.push('/');
    } catch (e) {
      console.error('Failed to delete memory:', e);
      alert(t('memory.deleteFailed'));
      setIsDeleting(false);
    }
  };

  const contentBody = (
    <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto pb-24 pt-4 bg-[#fbfbfd]">
      <div className="px-8 pt-4 space-y-4 max-w-2xl mx-auto min-h-full">
        <div className="pt-2">
          <h1 className="text-2xl font-bold text-[#1d1d1f]">{title || t('memory.untitled')}</h1>
        </div>
        {description ? (
          <div>
            <p className="w-full resize-none text-base text-[#1d1d1f] leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          </div>
        ) : null}

        {hasBlocks ? (
          <div className="space-y-3 pt-2">
            {blocks.map((block, index) => (
              <ContentBlock key={block.id} block={block} index={index} readOnly />
            ))}
          </div>
        ) : richContent ? (
          <div
            className="prose prose-sm max-w-none text-gray-800 [&_p]:my-2 [&_img]:rounded-lg [&_img]:my-4"
            dangerouslySetInnerHTML={{ __html: richContent }}
          />
        ) : null}
      </div>
    </div>
  );

  if (shareView) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-[#fbfbfd] text-[#1d1d1f] relative">
        <div className="absolute top-0 left-0 z-20 p-4 text-[#1d1d1f]/80">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 hover:opacity-100 opacity-80 transition-opacity"
          >
            <ArrowLeft size={20} aria-hidden />
            <span className="text-sm font-medium">{t('memory.back') || 'Back'}</span>
          </button>
        </div>
        <div className="pt-12">{contentBody}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col min-h-screen animate-fadeIn font-sans bg-[#fbfbfd] text-[#1d1d1f] relative">
      <MemoryDetailHeader
        title={title || undefined}
        onBack={onBack}
        visibility={visibility}
        onVisibilityChange={isOwner ? handleVisibilityChange : undefined}
        moreMenu={
          isOwner ? (
            <>
              <button
                type="button"
                onClick={handleEdit}
                className="w-full px-4 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-gray-100"
                role="menuitem"
              >
                {t('common.edit')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full px-4 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                role="menuitem"
              >
                {isDeleting ? t('memory.deleting') : t('memory.delete')}
              </button>
            </>
          ) : undefined
        }
      />

      {contentBody}
    </div>
  );
}
