'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ContentBlock } from '@/components/editor/ContentBlock';
import { MemoryDetailHeader } from '@/components/memory-detail/MemoryDetailHeader';
import { MemoryService } from '@/lib/db/services/memory-service';
import type { CarouselItem } from '@/types/memory';

const SHARE_FEEDBACK_MS = 2200;

interface RichStoryDetailProps {
  memory: CarouselItem;
  onBack: () => void;
  /** When true, only the content area is shown (no header). Used for shared links. */
  shareView?: boolean;
}

/** Renders rich-story memory with same layout as memories/editor (read-only). Header has Share and "..." menu (Edit, Delete). */
export function RichStoryDetail({ memory, onBack, shareView = false }: RichStoryDetailProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<'idle' | 'copied' | 'shared'>('idle');
  const shareFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const title = memory.detailTitle ?? memory.title ?? '';
  const description = memory.description ?? '';
  const blocks = (memory.editorBlocks ?? []).slice().sort((a, b) => a.order - b.order);
  const hasBlocks = blocks.length > 0;
  const richContent = memory.richContent ?? '';

  useEffect(() => {
    return () => {
      if (shareFeedbackTimerRef.current) clearTimeout(shareFeedbackTimerRef.current);
    };
  }, []);

  const clearShareFeedback = useCallback(() => {
    if (shareFeedbackTimerRef.current) {
      clearTimeout(shareFeedbackTimerRef.current);
      shareFeedbackTimerRef.current = null;
    }
    setShareFeedback('idle');
  }, []);

  const getShareUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/memories/${memory.id}?share=1`;
  }, [memory.id]);

  const handleShare = useCallback(async () => {
    const shareUrl = getShareUrl();
    const shareTitle = title || '回忆';
    const shareText = description ? description.slice(0, 120) : shareTitle;

    const shareData = { title: shareTitle, text: shareText, url: shareUrl };

    if (typeof navigator !== 'undefined' && navigator.share) {
      const canShare = typeof navigator.canShare === 'function' ? navigator.canShare(shareData) : true;
      if (canShare) {
        try {
          await navigator.share(shareData);
          setShareFeedback('shared');
          shareFeedbackTimerRef.current = setTimeout(clearShareFeedback, SHARE_FEEDBACK_MS);
          return;
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback('copied');
      shareFeedbackTimerRef.current = setTimeout(clearShareFeedback, SHARE_FEEDBACK_MS);
    } catch {
      if (typeof window !== 'undefined' && window.open) {
        window.open(shareUrl, '_blank', 'noopener');
      }
    }
  }, [getShareUrl, title, description, clearShareFeedback]);

  const handleEdit = () => {
    router.push(`/memories/editor?id=${memory.id}`);
  };

  const handleDelete = async () => {
    const confirmed = confirm('确定要删除这个回忆吗？此操作无法撤销。');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const { error } = await MemoryService.deleteMemory(memory.id);
      if (error) {
        alert(`删除失败：${error}`);
        setIsDeleting(false);
        return;
      }

      router.push('/');
    } catch (e) {
      console.error('Failed to delete memory:', e);
      alert('删除失败，请重试');
      setIsDeleting(false);
    }
  };

  const contentBody = (
    <div className="no-scrollbar flex-1 overflow-y-auto pb-24 pt-4">
      <div className="px-8 pt-4 space-y-4 max-w-2xl mx-auto">
        <div className="pt-2">
          <h1 className="text-2xl font-bold text-[#1d1d1f]">{title || '无标题'}</h1>
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
      <div className="min-h-screen flex flex-col font-sans bg-[#fbfbfd] text-[#1d1d1f]">
        {contentBody}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fadeIn font-sans bg-[#fbfbfd] text-[#1d1d1f] relative">
      <MemoryDetailHeader
        onBack={onBack}
        onShare={handleShare}
        moreMenu={
          <>
            <button
              type="button"
              onClick={handleEdit}
              className="w-full px-4 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-gray-100"
              role="menuitem"
            >
              编辑
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full px-4 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              role="menuitem"
            >
              {isDeleting ? '删除中...' : '删除'}
            </button>
          </>
        }
      />
      {shareFeedback !== 'idle' && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-12 z-20 px-3 py-1.5 rounded-full bg-white/95 text-[#1d1d1f] text-[13px] font-medium shadow-lg animate-fadeIn pointer-events-none"
          role="status"
          aria-live="polite"
        >
          {shareFeedback === 'copied' ? '链接已复制' : '已分享'}
        </div>
      )}

      {contentBody}
    </div>
  );
}
