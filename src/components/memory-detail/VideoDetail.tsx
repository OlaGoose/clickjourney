'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { CarouselItem, MemoryVisibility } from '@/types/memory';
import { MemoryDetailHeader } from '@/components/memory-detail/MemoryDetailHeader';
import { MemoryService } from '@/lib/db/services/memory-service';
import { updateMemory } from '@/lib/storage';
import { useOptionalAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';

interface VideoDetailProps {
  memory: CarouselItem;
  onBack: () => void;
  isOwner?: boolean;
  /** When true (public share), hide header and show read-only content only. */
  shareView?: boolean;
}

export function VideoDetail({ memory, onBack, isOwner = false, shareView = false }: VideoDetailProps) {
  const router = useRouter();
  const { t } = useLocale();
  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [visibility, setVisibility] = useState<MemoryVisibility>(memory.visibility ?? 'private');
  const title = memory.detailTitle ?? memory.title ?? '';
  const description = memory.description ?? '';
  const videos = memory.videoUrls ?? [];

  useEffect(() => {
    setVisibility(memory.visibility ?? 'private');
  }, [memory.visibility]);

  const handleVisibilityChange = useCallback(
    async (v: MemoryVisibility) => {
      setVisibility(v);
      if (!userId) return;
      await updateMemory(userId, memory.id, { visibility: v });
    },
    [userId, memory.id]
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fadeIn bg-black font-sans text-white">
      {!shareView && (
        <MemoryDetailHeader
          onBack={onBack}
          visibility={visibility}
          onVisibilityChange={isOwner ? handleVisibilityChange : undefined}
          moreMenu={
            isOwner ? (
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
            ) : undefined
          }
        />
      )}

      {shareView && (
        <div className="absolute top-0 left-0 z-20 p-4 text-white/80">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 hover:opacity-100 opacity-80 transition-opacity"
          >
            <ArrowLeft size={20} aria-hidden />
            <span className="text-sm font-medium">{t('memory.back') || 'Back'}</span>
          </button>
        </div>
      )}

      <div className={`flex-1 overflow-hidden ${shareView ? 'pt-4' : ''}`}>
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
