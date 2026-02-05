'use client';

import { useState, useEffect, useRef } from 'react';

interface GalleryModalProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function GalleryModal({ images, initialIndex, onClose }: GalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startX = useRef(0);
  const currentX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowRight' && currentIndex < images.length - 1) setCurrentIndex((c) => c + 1);
    if (e.key === 'ArrowLeft' && currentIndex > 0) setCurrentIndex((c) => c - 1);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    currentX.current = e.touches[0].clientX;
    setDragOffset(currentX.current - startX.current);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    const diff = currentX.current - startX.current;
    const threshold = typeof window !== 'undefined' ? window.innerWidth * 0.2 : 200;
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex > 0) setCurrentIndex((prev) => prev - 1);
      else if (diff < 0 && currentIndex < images.length - 1) setCurrentIndex((prev) => prev + 1);
    }
    setDragOffset(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startX.current = e.clientX;
    currentX.current = e.clientX;
    setDragOffset(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    currentX.current = e.clientX;
    setDragOffset(currentX.current - startX.current);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    const diff = currentX.current - startX.current;
    const threshold = typeof window !== 'undefined' ? window.innerWidth * 0.2 : 200;
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex > 0) setCurrentIndex((prev) => prev - 1);
      else if (diff < 0 && currentIndex < images.length - 1) setCurrentIndex((prev) => prev + 1);
    }
    setDragOffset(0);
    setIsDragging(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col animate-fadeIn bg-white"
      role="dialog"
      aria-modal="true"
      aria-label="Gallery"
    >
      <div className="relative z-20 flex items-center justify-between bg-white px-4 py-3 text-[#222222] md:py-4">
        <button type="button" className="rounded-full p-2 text-[#222222] transition-colors hover:bg-gray-100" aria-label="Grid view">
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="block h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="m9.37 10.02c.18-1.04.46-2.59.82-4.67.38-2.18 2.46-3.63 4.63-3.24l11.82 2.08c2.18.38 3.63 2.46 3.24 4.63l-2.08 11.82c-.38 2.18-2.46 3.63-4.63 3.24-.51-.09-.9-.16-1.15-.2" />
            <path d="m6 10h12c2.21 0 4 1.79 4 4v12c0 2.21-1.79 4-4 4H6c-2.21 0-4-1.79-4-4V14c0-2.21 1.79-4 4-4z" />
          </svg>
        </button>
        <div className="text-sm font-medium text-[#222222]">
          {currentIndex + 1} / {images.length}
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-2 text-[#222222] transition-colors hover:bg-gray-100" aria-label="Close">
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="block h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="m6 6 20 20M26 6 6 26" />
          </svg>
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative flex h-full w-full flex-1 items-center overflow-hidden bg-white"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="flex h-full w-full"
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {images.map((img, index) => (
            <div key={index} className="flex h-full w-full flex-shrink-0 items-center justify-center p-4 md:p-12">
              <div className="relative overflow-hidden" style={{ borderRadius: 32, maxWidth: '100%', maxHeight: '100%' }}>
                <img
                  src={img}
                  alt={`Slide ${index + 1}`}
                  draggable={false}
                  className="max-h-[80vh] max-w-full select-none object-contain md:object-cover"
                  style={{ borderRadius: 32 }}
                />
              </div>
            </div>
          ))}
        </div>

        {!isDragging && (
          <>
            {currentIndex > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((c) => c - 1);
                }}
                className="absolute left-6 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-[#222222] shadow-lg transition-transform hover:scale-105 md:flex"
                aria-label="Previous"
              >
                <svg viewBox="0 0 32 32" className="block h-4 w-4" fill="none" stroke="currentColor" strokeWidth={4}>
                  <path d="M28 16H2M17 4l11.3 11.3a1 1 0 0 1 0 1.4L17 28" transform="scale(-1, 1) translate(-32, 0)" />
                </svg>
              </button>
            )}
            {currentIndex < images.length - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((c) => c + 1);
                }}
                className="absolute right-6 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-[#222222] shadow-lg transition-transform hover:scale-105 md:flex"
                aria-label="Next"
              >
                <svg viewBox="0 0 32 32" className="block h-4 w-4" fill="none" stroke="currentColor" strokeWidth={4}>
                  <path d="M28 16H2M17 4l11.3 11.3a1 1 0 0 1 0 1.4L17 28" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
