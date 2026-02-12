'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CarouselItem } from '@/types/memory';
import GalleryModal from '@/components/GalleryModal';
import PhotoGrid from '@/components/PhotoGrid';
import { MemoryDetailHeader } from '@/components/memory-detail/MemoryDetailHeader';
import { MemoryService } from '@/lib/db/services/memory-service';

interface PhotoGalleryDetailProps {
  memory: CarouselItem;
  onBack: () => void;
}

function getGalleryImages(item: CarouselItem): string[] {
  if (Array.isArray(item.gallery) && item.gallery.length > 0) return item.gallery;
  return [];
}

export function PhotoGalleryDetail({ memory, onBack }: PhotoGalleryDetailProps) {
  const router = useRouter();
  const [showGallery, setShowGallery] = useState(false);
  const [initialGalleryIndex, setInitialGalleryIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const title = memory.detailTitle ?? memory.title ?? '';
  const description =
    memory.description ?? '探索世界，记录美好时光。';
  const images = getGalleryImages(memory);

  const handleImageClick = (index: number) => {
    setInitialGalleryIndex(index);
    setShowGallery(true);
  };

  const getShareUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/memories/${memory.id}?share=1`;
  }, [memory.id]);

  const handleShare = useCallback(async () => {
    const shareUrl = getShareUrl();
    const shareTitle = title || '回忆';
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
  }, [getShareUrl, title]);

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

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col animate-fadeIn bg-white font-sans text-black">
        <MemoryDetailHeader
          onBack={onBack}
          onShare={handleShare}
          moreMenu={
            <>
              <button type="button" onClick={handleEdit} className="w-full px-4 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-gray-100" role="menuitem">编辑</button>
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

        <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-8">
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
            <div className="px-4 py-8 text-center text-gray-500 text-sm">暂无图片</div>
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
