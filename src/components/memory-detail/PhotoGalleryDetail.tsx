'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { CarouselItem, MemoryVisibility } from '@/types/memory';
import GalleryModal from '@/components/GalleryModal';
import PhotoGrid from '@/components/PhotoGrid';
import { MemoryDetailHeader } from '@/components/memory-detail/MemoryDetailHeader';
import { MemoryService } from '@/lib/db/services/memory-service';
import { updateMemory } from '@/lib/storage';
import { copyMemoryShareLink } from '@/lib/share-link';
import { useOptionalAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';

interface PhotoGalleryDetailProps {
  memory: CarouselItem;
  onBack: () => void;
  isOwner?: boolean;
  /** When true (public share), hide header and show read-only content only. */
  shareView?: boolean;
}

function getGalleryImages(item: CarouselItem): string[] {
  if (Array.isArray(item.gallery) && item.gallery.length > 0) return item.gallery;
  return [];
}

export function PhotoGalleryDetail({ memory, onBack, isOwner = false, shareView = false }: PhotoGalleryDetailProps) {
  const router = useRouter();
  const { t } = useLocale();
  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;
  const [showGallery, setShowGallery] = useState(false);
  const [initialGalleryIndex, setInitialGalleryIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [visibility, setVisibility] = useState<MemoryVisibility>(memory.visibility ?? 'private');

  const title = memory.detailTitle ?? memory.title ?? '';
  const description =
    memory.description ?? t('memory.defaultDescription');
  const images = getGalleryImages(memory);

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

  const handleImageClick = (index: number) => {
    setInitialGalleryIndex(index);
    setShowGallery(true);
  };

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
    <>
      <div className="fixed inset-0 z-50 flex flex-col animate-fadeIn bg-white font-sans text-black">
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
          <div className="absolute top-0 left-0 z-20 p-4 text-black/80">
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

        <div className={`no-scrollbar flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-8 overscroll-contain ${shareView ? 'pt-12' : ''}`} style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          <div className="px-0 py-4">
            <h1 className="text-xl font-semibold text-black">{title}</h1>
            <p className="mt-3 whitespace-pre-wrap text-gray-800">{description}</p>
          </div>
          {images.length > 0 ? (
            <div className="px-4">
              <PhotoGrid
                images={images}
                onImageClick={handleImageClick}
                totalCount={images.length}
                hasMoreImages={images.length > 6}
                ariaLabel="Trip photos"
              />
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">{t('memory.noPhotos')}</div>
          )}
        </div>
      </div>

      {showGallery && (
        <GalleryModal
          images={images}
          initialIndex={initialGalleryIndex}
          onClose={() => setShowGallery(false)}
        />
      )}
    </>
  );
}
