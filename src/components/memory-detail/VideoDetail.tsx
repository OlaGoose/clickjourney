'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CarouselItem } from '@/types/memory';
import { MemoryDetailHeader } from '@/components/memory-detail/MemoryDetailHeader';
import { MemoryService } from '@/lib/db/services/memory-service';
import { useLocale } from '@/lib/i18n';

interface VideoDetailProps {
  memory: CarouselItem;
  onBack: () => void;
}

export function VideoDetail({ memory, onBack }: VideoDetailProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const title = memory.detailTitle ?? memory.title ?? '';
  const description = memory.description ?? '';
  const videos = memory.videoUrls ?? [];

  const getShareUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/memories/${memory.id}?share=1`;
  }, [memory.id]);

  const handleShare = useCallback(async () => {
    const shareUrl = getShareUrl();
    const shareTitle = title || t('memory.defaultTitle');
    const shareData = { title: shareTitle, url: shareUrl };
    if (typeof navigator !== 'undefined' && navigator.share) {
      const canShare = typeof navigator.canShare === 'function' ? navigator.canShare(shareData) : true;
      if (canShare) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      if (typeof window !== 'undefined' && window.open) window.open(shareUrl, '_blank', 'noopener');
    }
  }, [getShareUrl, title, t]);

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fadeIn bg-black font-sans text-white">
      <MemoryDetailHeader
        onBack={onBack}
        onShare={handleShare}
        moreMenu={
          <>
            <button type="button" onClick={handleEdit} className="w-full px-4 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-gray-100" role="menuitem">{t('common.edit')}</button>
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
        }
      />

      <div className="flex-1 overflow-hidden">
        {videos.length > 0 ? (
          <div className="flex h-full flex-col">
            <div className="relative flex-1 bg-black">
              <video
                key={videos[activeVideoIndex]}
                src={videos[activeVideoIndex]}
                controls
                autoPlay
                className="h-full w-full object-contain"
              />
            </div>
            
            {videos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-4 py-3 bg-black/60">
                {videos.map((video, index) => (
                  <button
                    key={video}
                    type="button"
                    onClick={() => setActiveVideoIndex(index)}
                    className={`relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg transition-all ${
                      index === activeVideoIndex
                        ? 'ring-2 ring-white'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <video
                      src={video}
                      className="h-full w-full object-cover"
                      muted
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            {t('memory.noVideos')}
          </div>
        )}
      </div>

      {(title || description) && (
        <div className="bg-gradient-to-t from-black to-transparent px-4 py-4">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {description && <p className="mt-2 text-sm text-gray-300">{description}</p>}
        </div>
      )}
    </div>
  );
}
