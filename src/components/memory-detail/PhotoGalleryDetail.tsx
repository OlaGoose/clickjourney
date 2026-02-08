'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { CarouselItem } from '@/types/memory';
import { getDemoGallerySlice } from '@/lib/storage/demo-gallery';
import GalleryModal from '@/components/GalleryModal';
import PhotoGrid from '@/components/PhotoGrid';
import { MemoryService } from '@/lib/db/services/memory-service';

interface PhotoGalleryDetailProps {
  memory: CarouselItem;
  onBack: () => void;
}

const DEFAULT_GALLERY_LENGTH = 4;

function getGalleryImages(item: CarouselItem): string[] {
  if (Array.isArray(item.gallery) && item.gallery.length > 0) return item.gallery;
  return getDemoGallerySlice(DEFAULT_GALLERY_LENGTH);
}

export function PhotoGalleryDetail({ memory, onBack }: PhotoGalleryDetailProps) {
  const router = useRouter();
  const [showGallery, setShowGallery] = useState(false);
  const [initialGalleryIndex, setInitialGalleryIndex] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const category = memory.category ?? '旅行回忆';
  const title = memory.detailTitle ?? memory.title ?? '';
  const description =
    memory.description ?? '探索世界，记录美好时光。';
  const images = getGalleryImages(memory);

  const handleImageClick = (index: number) => {
    setInitialGalleryIndex(index);
    setShowGallery(true);
  };

  useEffect(() => {
    if (!moreOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreOpen]);

  const handleEdit = () => {
    setMoreOpen(false);
    router.push(`/memories/editor?id=${memory.id}`);
  };

  const handleDelete = async () => {
    setMoreOpen(false);
    
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
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-3 border-b border-gray-100">
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <span className="text-base font-semibold">{category}</span>
          <div className="flex items-center gap-1">
            <button type="button" className="rounded-full p-2 hover:bg-gray-100" aria-label="Share">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
            <button type="button" className="rounded-full p-2 hover:bg-gray-100" aria-label="Like">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className="rounded-full p-2 hover:bg-gray-100"
                aria-label="More actions"
                aria-expanded={moreOpen}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              </button>
              {moreOpen && (
                <div
                  className="absolute right-0 top-full mt-1 min-w-[140px] rounded-lg bg-white py-1 shadow-lg border border-gray-200 text-left z-50"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="w-full px-4 py-2 text-left text-[13px] text-black hover:bg-gray-100"
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
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-8">
          <div className="px-0 py-4">
            <h1 className="text-xl font-semibold text-black">{title}</h1>
            <p className="mt-3 whitespace-pre-wrap text-gray-800">{description}</p>
          </div>
          {images.length > 0 && (
            <div className="px-4">
              <PhotoGrid
                images={images}
                onImageClick={handleImageClick}
                totalCount={images.length}
                hasMoreImages={images.length > 6}
                ariaLabel="Trip photos"
              />
            </div>
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
