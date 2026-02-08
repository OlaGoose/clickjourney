'use client';

import { useState } from 'react';
import { Edit2, Image, Video, Music, Type } from 'lucide-react';
import PhotoGrid from '@/components/PhotoGrid';
import GalleryModal from '@/components/GalleryModal';
import { GalleryDisplayView } from '@/components/upload/GalleryDisplay';
import type { ContentBlock as ContentBlockType, ImageDisplayMode } from '@/types/editor';

interface ContentBlockProps {
  block: ContentBlockType;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
}

export function ContentBlock({ block, isSelected, onClick, onEdit }: ContentBlockProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const renderContent = () => {
    switch (block.type) {
      case 'text':
        return (
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
              {block.content || '点击编辑文本内容...'}
            </p>
          </div>
        );
      case 'image': {
        const images = block.metadata?.images?.length
          ? block.metadata.images
          : block.content
            ? [block.content]
            : [];
        const displayMode: ImageDisplayMode = block.metadata?.imageDisplayMode ?? 'grid';
        const openGallery = (index: number) => {
          setGalleryIndex(index);
          setShowGallery(true);
        };
        return (
          <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
            {images.length > 0 ? (
              displayMode === 'gallery' ? (
                <GalleryDisplayView
                  images={images}
                  onImageClick={openGallery}
                  ariaLabel="区块照片"
                />
              ) : (
                <PhotoGrid
                  images={images}
                  onImageClick={openGallery}
                  totalCount={images.length}
                  ariaLabel="区块照片"
                />
              )
            ) : (
              <div className="flex h-48 items-center justify-center rounded-2xl bg-gray-100">
                <Image size={48} className="text-gray-300" />
              </div>
            )}
            {images.length > 0 && showGallery && (
              <GalleryModal
                images={images}
                initialIndex={galleryIndex}
                onClose={() => setShowGallery(false)}
              />
            )}
          </div>
        );
      }
      case 'video':
        return (
          <div className="relative w-full overflow-hidden rounded-2xl bg-gray-100">
            {block.content ? (
              <video
                src={block.content}
                controls
                className="h-auto w-full"
                poster={block.metadata?.thumbnail}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="flex h-48 items-center justify-center">
                <Video size={48} className="text-gray-300" />
              </div>
            )}
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5">
              <Music size={20} className="text-gray-600" />
            </div>
            {block.content ? (
              <audio src={block.content} controls className="flex-1">
                Your browser does not support the audio tag.
              </audio>
            ) : (
              <span className="flex-1 text-sm text-gray-400">点击上传音频...</span>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const getIcon = () => {
    switch (block.type) {
      case 'text':
        return <Type size={14} />;
      case 'image':
        return <Image size={14} />;
      case 'video':
        return <Video size={14} />;
      case 'audio':
        return <Music size={14} />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative cursor-pointer transition-all"
    >
      {renderContent()}
      
      {(isHovered || isSelected) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/80 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-black active:scale-95"
          aria-label="编辑内容块"
        >
          <Edit2 size={12} strokeWidth={2.5} />
          <span>编辑</span>
        </button>
      )}
    </div>
  );
}
