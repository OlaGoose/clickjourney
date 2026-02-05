'use client';

import { useState } from 'react';
import type { CarouselItem } from '@/types';
import { getDemoGallerySlice } from '@/lib/storage/demo-gallery';
import GalleryModal from './GalleryModal';
import PhotoGrid from './PhotoGrid';

interface MemoryDetailProps {
  item: CarouselItem;
  onBack: () => void;
}

const DEFAULT_GALLERY_LENGTH = 4;

function getGalleryImages(item: CarouselItem): string[] {
  if (Array.isArray(item.gallery)) return item.gallery;
  return getDemoGallerySlice(DEFAULT_GALLERY_LENGTH);
}

export default function MemoryDetail({ item, onBack }: MemoryDetailProps) {
  const [showGallery, setShowGallery] = useState(false);
  const [initialGalleryIndex, setInitialGalleryIndex] = useState(0);

  const category = item.category ?? '圣克鲁兹 · 文化之旅';
  const title = item.detailTitle ?? '圣克鲁斯冲浪漫步之旅';
  const description =
    item.description ??
    '探索大陆冲浪的发源地，在海滨漫步90分钟，前往 Steamer Lane，沿途停留，欣赏风景，导游会分享历史、文化和冲浪的乐趣。';
  const images = getGalleryImages(item);

  const handleImageClick = (index: number) => {
    setInitialGalleryIndex(index);
    setShowGallery(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col animate-fadeIn bg-white font-sans text-black">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-3">
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
          <div className="flex items-center gap-4">
            <button type="button" className="rounded-full p-1 hover:bg-gray-100" aria-label="Share">
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
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
            <button type="button" className="rounded-full p-1 hover:bg-gray-100" aria-label="Like">
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
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-4">
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

          <div className="px-4 py-6">
            <h1 className="mb-4 text-2xl font-bold leading-tight text-[#222222]">{title}</h1>
            <div className="text-justify text-[15px] font-light leading-relaxed text-[#222222] opacity-80">
              {description}
              <span className="mt-2 block">
                {description} {description}
              </span>
            </div>
          </div>
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
