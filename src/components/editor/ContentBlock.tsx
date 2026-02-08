'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Edit2, Image, Video, Music, Type } from 'lucide-react';
import PhotoGrid from '@/components/PhotoGrid';
import GalleryModal from '@/components/GalleryModal';
import { GalleryDisplayView } from '@/components/upload/GalleryDisplay';
import type { ContentBlock as ContentBlockType, ImageDisplayMode } from '@/types/editor';

interface ContentBlockProps {
  block: ContentBlockType;
  isSelected: boolean;
  isDark?: boolean;
  onClick: () => void;
  onEdit: () => void;
  onTextChange?: (blockId: string, content: string) => void;
}

const TEXTAREA_MIN_HEIGHT_PX = 72;

function useAutoHeightTextarea(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const h = el.scrollHeight;
    el.style.height = `${Math.max(TEXTAREA_MIN_HEIGHT_PX, h)}px`;
  }, []);

  useEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  return { ref, syncHeight };
}

export function ContentBlock({ block, isSelected, isDark = false, onClick, onEdit, onTextChange }: ContentBlockProps) {
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const { ref: textareaRef, syncHeight } = useAutoHeightTextarea(block.type === 'text' ? block.content : '');

  const renderContent = () => {
    switch (block.type) {
      case 'text':
        return (
          <textarea
            ref={textareaRef}
            value={block.content}
            onChange={(e) => {
              const v = e.target.value;
              onTextChange?.(block.id, v);
              syncHeight();
            }}
            onInput={syncHeight}
            onClick={(e) => e.stopPropagation()}
            placeholder="添加描述..."
            rows={1}
            maxLength={500}
            style={{ minHeight: TEXTAREA_MIN_HEIGHT_PX }}
            className={`w-full resize-none overflow-hidden text-base focus:outline-none bg-transparent rounded-xl py-3 placeholder:opacity-50 ${
              isDark
                ? 'text-white/80 placeholder:text-white/40 focus:bg-white/5'
                : 'text-gray-600 placeholder:text-gray-300 focus:bg-gray-50/80'
            }`}
            aria-label="文本内容"
          />
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
          <div
            className={`relative w-full ${displayMode === 'gallery' ? 'overflow-visible' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
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
              <div
                className={`flex h-48 items-center justify-center rounded-2xl ${
                  isDark ? 'bg-white/5' : 'bg-gray-100'
                }`}
              >
                <Image size={48} className={isDark ? 'text-white/20' : 'text-gray-300'} />
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
          <div
            className={`relative w-full overflow-hidden rounded-2xl ${
              isDark ? 'bg-white/5' : 'bg-gray-100'
            }`}
          >
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
                <Video size={48} className={isDark ? 'text-white/20' : 'text-gray-300'} />
              </div>
            )}
          </div>
        );
      case 'audio':
        return (
          <div
            className={`flex items-center gap-3 rounded-2xl p-4 ${
              isDark ? 'bg-white/5' : 'bg-gray-50'
            }`}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                isDark ? 'bg-white/10' : 'bg-black/5'
              }`}
            >
              <Music size={20} className={isDark ? 'text-white/70' : 'text-gray-600'} />
            </div>
            {block.content ? (
              <audio src={block.content} controls className="flex-1">
                Your browser does not support the audio tag.
              </audio>
            ) : (
              <span className={`flex-1 text-sm ${isDark ? 'text-white/50' : 'text-gray-400'}`}>
                点击上传音频...
              </span>
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
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`group relative cursor-pointer transition-all rounded-[20px] ${
        block.type === 'image' && block.metadata?.imageDisplayMode === 'gallery'
          ? 'overflow-visible'
          : 'overflow-hidden'
      }`}
    >
      <div className="py-4 md:py-5">
        {renderContent()}
      </div>

      {/* 非文本块：仅在被点击/选中时显示「编辑」按钮，不依赖 hover */}
      {isSelected && block.type !== 'text' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className={`absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold backdrop-blur-sm transition-all active:scale-95 ${
            isDark
              ? 'bg-white text-black hover:bg-white/95 shadow-lg'
              : 'bg-black text-white hover:bg-gray-800 shadow-lg'
          }`}
          aria-label="编辑内容块"
        >
          <Edit2 size={12} strokeWidth={2.5} />
          <span>编辑</span>
        </button>
      )}
    </div>
  );
}
