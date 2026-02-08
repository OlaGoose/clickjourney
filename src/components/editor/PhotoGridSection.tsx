'use client';

import { useState, useRef } from 'react';
import PhotoGrid from '@/components/PhotoGrid';
import GalleryModal from '@/components/GalleryModal';
import { Camera } from 'lucide-react';

interface PhotoGridSectionProps {
  images: string[];
  onUpdateImages: (images: string[]) => void;
}

export function PhotoGridSection({ images, onUpdateImages }: PhotoGridSectionProps) {
  const [showGallery, setShowGallery] = useState(false);
  const [initialGalleryIndex, setInitialGalleryIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageClick = (index: number) => {
    const hasImage = images[index];
    if (hasImage) {
      setInitialGalleryIndex(index);
      setShowGallery(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const newUrls = Array.from(files).map((file) => URL.createObjectURL(file));
    const updatedImages = [...images, ...newUrls].slice(0, 4);
    onUpdateImages(updatedImages);
    e.target.value = '';
  };

  // Ensure exactly 4 images (pad with placeholders if needed)
  const displayImages = [...images];
  while (displayImages.length < 4) {
    displayImages.push('');
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
        aria-hidden
      />

      <div className="px-4 pb-4">
        <div className="relative">
          <PhotoGrid
            images={displayImages}
            onImageClick={handleImageClick}
            totalCount={images.length}
            ariaLabel="旅程照片"
          />
          {images.length > 0 && images.length <= 4 && (
            <button
              type="button"
              onClick={handleAddImage}
              className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-white backdrop-blur-sm transition-all hover:bg-black active:scale-95"
              aria-label="添加照片"
            >
              <Camera size={18} strokeWidth={2} />
            </button>
          )}
          {images.length === 0 && (
            <button
              type="button"
              onClick={handleAddImage}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[36px] bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
            >
              <Camera size={40} strokeWidth={1.5} />
              <span className="text-sm font-medium">点击添加照片</span>
            </button>
          )}
        </div>
      </div>

      {showGallery && images.length > 0 && (
        <GalleryModal
          images={images}
          initialIndex={initialGalleryIndex}
          onClose={() => setShowGallery(false)}
        />
      )}
    </>
  );
}
