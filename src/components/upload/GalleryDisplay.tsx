'use client';

import { useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import type { GalleryProps } from '@/types/upload';

/** Shared polaroid layout: position/rotation by index and total. Used by GalleryDisplay and GalleryDisplayView. */
export function getGalleryImageStyle(index: number, total: number) {
    let sizeClass = 'w-64 h-64 md:w-80 md:h-80';
    if (total === 2) sizeClass = 'w-56 h-56 md:w-72 md:h-72';
    if (total === 3) sizeClass = 'w-48 h-48 md:w-64 md:h-64';
    if (total >= 4 && total <= 6) sizeClass = 'w-40 h-40 md:w-52 md:h-52';
    if (total >= 7) sizeClass = 'w-32 h-32 md:w-40 md:h-40';

    let x = 0;
    let y = 0;
    let r = 0;
    let z = index + 10;

    if (total === 1) {
      r = -3;
    } else if (total === 2) {
      if (index === 0) {
        x = -30;
        y = 5;
        r = -6;
        z = 10;
      }
      if (index === 1) {
        x = 30;
        y = -5;
        r = 6;
        z = 20;
      }
    } else if (total === 3) {
      if (index === 0) {
        x = -45;
        y = -15;
        r = -8;
        z = 10;
      }
      if (index === 1) {
        x = 45;
        y = -10;
        r = 8;
        z = 20;
      }
      if (index === 2) {
        x = 0;
        y = 20;
        r = -2;
        z = 30;
      }
    } else if (total === 4) {
      if (index === 0) {
        x = -40;
        y = -40;
        r = -5;
        z = 10;
      }
      if (index === 1) {
        x = 40;
        y = -40;
        r = 5;
        z = 11;
      }
      if (index === 2) {
        x = -40;
        y = 40;
        r = 3;
        z = 12;
      }
      if (index === 3) {
        x = 40;
        y = 40;
        r = -4;
        z = 13;
      }
    } else if (total === 5) {
      if (index === 0) {
        x = -55;
        y = -45;
        r = -8;
        z = 10;
      }
      if (index === 1) {
        x = 55;
        y = -45;
        r = 8;
        z = 11;
      }
      if (index === 2) {
        x = -55;
        y = 45;
        r = 4;
        z = 12;
      }
      if (index === 3) {
        x = 55;
        y = 45;
        r = -6;
        z = 13;
      }
      if (index === 4) {
        x = 0;
        y = 0;
        r = 2;
        z = 20;
      }
    } else {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const xBase = (col - 1) * 65;
      const yBase = (row - 1) * 60;
      const randomX = ((index * 17) % 20) - 10;
      const randomY = ((index * 23) % 20) - 10;
      const randomR = ((index * 13) % 20) - 10;
      x = xBase + randomX;
      y = yBase + randomY;
      r = randomR;
    }

  return {
    className: `absolute top-1/2 left-1/2 origin-center transition-all duration-700 ease-out ${sizeClass}`,
    style: {
      transform: `translate(calc(-50% + ${x}%), calc(-50% + ${y}%)) rotate(${r}deg)`,
      zIndex: z,
    },
  };
}

/**
 * Airbnb-style gallery: polaroid-like cards with "perfectly messy" layout.
 * Click a card to show replace/delete actions in a glass bubble.
 */
export function GalleryDisplay({ images, onDelete, onReplace }: GalleryProps) {
  const count = images.length;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const handleImageClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveId(activeId === id ? null : id);
  };

  const handleImageLoad = (id: string) => {
    setLoadedImages((prev) => new Set(prev).add(id));
  };

  return (
    <div
      className="relative w-full h-full flex justify-center items-center"
      onClick={() => setActiveId(null)}
    >
      {images.map((img, index) => {
        const { className, style } = getGalleryImageStyle(index, count);
        const isActive = activeId === img.id;
        const isLoaded = loadedImages.has(img.id);

        return (
          <div
            key={img.id}
            className={`${className} group cursor-pointer`}
            style={{
              ...style,
              zIndex: isActive ? 100 : style.zIndex,
            }}
            onClick={(e) => handleImageClick(e, img.id)}
          >
            <div
              className={`
                relative w-full h-full rounded-[32px] overflow-hidden bg-white
                transition-all duration-300
                ${
                  isActive
                    ? 'ring-[3px] ring-black/10 scale-[1.02] shadow-[0_20px_60px_rgba(0,0,0,0.3)]'
                    : 'shadow-[0_8px_40px_rgba(0,0,0,0.18)] hover:scale-105 hover:shadow-[0_12px_50px_rgba(0,0,0,0.22)]'
                }
              `}
            >
              {/* Skeleton placeholder */}
              {!isLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 animate-pulse">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border-3 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
                  </div>
                </div>
              )}
              
              {/* Image with blur-up effect */}
              <img
                src={img.url}
                alt={`Gallery ${index + 1}`}
                className={`w-full h-full object-cover transition-all duration-700 ease-out ${
                  isLoaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-lg scale-105'
                }`}
                onLoad={() => handleImageLoad(img.id)}
                loading="eager"
                decoding="async"
                style={{
                  willChange: isLoaded ? 'auto' : 'opacity, filter, transform',
                }}
              />
              <div className="absolute inset-0 rounded-[32px] ring-1 ring-black/5 pointer-events-none" />
            </div>

            {isActive && (
              <div
                className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex items-center bg-white/70 backdrop-blur-2xl rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/40 p-2 opacity-100 transition-all duration-200 z-[101]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onReplace(img.id)}
                  className="p-2.5 rounded-full hover:bg-black/5 text-gray-700 hover:text-black transition-colors"
                  title="Replace"
                  aria-label="Replace photo"
                >
                  <RefreshCw size={16} strokeWidth={2.5} />
                </button>
                <div className="w-px h-4 bg-black/10 mx-1" />
                <button
                  type="button"
                  onClick={() => onDelete(img.id)}
                  className="p-2.5 rounded-full hover:bg-red-50 text-red-500 transition-colors"
                  title="Delete"
                  aria-label="Delete photo"
                >
                  <Trash2 size={16} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export interface GalleryDisplayViewProps {
  images: string[];
  onImageClick?: (index: number) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Read-only polaroid gallery (same layout as upload page). For editor image blocks.
 */
export function GalleryDisplayView({
  images,
  onImageClick,
  className = '',
  ariaLabel = '相册',
}: GalleryDisplayViewProps) {
  const count = images.length;
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(new Set());

  if (count === 0) return null;

  const minHeightClass =
    count >= 6 ? 'min-h-[400px]' : count >= 4 ? 'min-h-[360px]' : 'min-h-[280px]';

  return (
    <div
      className={`relative w-full ${minHeightClass} flex justify-center items-center overflow-visible ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      {images.map((src, index) => {
        const { className: cardClass, style } = getGalleryImageStyle(index, count);
        const isLoaded = loadedIndices.has(index);

        return (
          <button
            key={`${index}-${src.slice(0, 30)}`}
            type="button"
            className={`${cardClass} cursor-pointer text-left`}
            style={style}
            onClick={() => onImageClick?.(index)}
            aria-label={`第 ${index + 1} 张照片，共 ${count} 张`}
          >
            <div className="relative w-full h-full rounded-[32px] overflow-hidden bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_50px_rgba(0,0,0,0.22)]">
              {!isLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 animate-pulse">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
                  </div>
                </div>
              )}
              <img
                src={src}
                alt=""
                className={`w-full h-full object-cover transition-all duration-700 ease-out ${
                  isLoaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-lg scale-105'
                }`}
                onLoad={() => setLoadedIndices((prev) => new Set(prev).add(index))}
                loading={index < 2 ? 'eager' : 'lazy'}
              />
              <div className="absolute inset-0 rounded-[32px] ring-1 ring-black/5 pointer-events-none" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
