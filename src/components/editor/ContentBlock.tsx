'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Edit2, Image, Video, Music, Type, FileText, LayoutTemplate, Minus } from 'lucide-react';
import PhotoGrid from '@/components/PhotoGrid';
import GalleryModal from '@/components/GalleryModal';
import { GalleryDisplayView } from '@/components/upload/GalleryDisplay';
import { StaticBlockRenderer } from '@/components/cinematic/StaticBlockRenderer';
import { SectionBlockRenderer } from '@/components/editor/SectionBlockRenderer';
import { DividerBlock } from '@/components/editor/DividerBlock';
import { getCinematicPlaceholderImage } from '@/lib/editor-cinematic-templates';
import { sanitizeBlockHtml } from '@/lib/sanitize-block-html';
import type { ContentBlock as ContentBlockType, ImageDisplayMode } from '@/types/editor';
import type { StoryBlock } from '@/types/cinematic';

interface ContentBlockProps {
  block: ContentBlockType;
  /** Block index (for cinematic layout ordering). */
  index?: number;
  isSelected?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onTextChange?: (blockId: string, content: string) => void;
  /** When block is cinematic, called when user edits image/text in the block. */
  onCinematicUpdate?: (blockId: string, updates: Partial<StoryBlock>) => void;
  /** When true, render same layout as editor but non-interactive (for detail view) */
  readOnly?: boolean;
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

/** Map editor ContentBlock (cinematic) to StoryBlock for StaticBlockRenderer. */
function contentBlockToStoryBlock(block: ContentBlockType): StoryBlock {
  return {
    id: block.id,
    layout: block.metadata?.cinematicLayout ?? 'full_bleed',
    image: block.metadata?.cinematicImage || getCinematicPlaceholderImage(),
    text: block.content ?? '',
    imageFilter: block.metadata?.imageFilter,
    mood: block.metadata?.mood,
  };
}

/** Apple light mode only: clean white/gray surfaces, #1d1d1f text. */
export function ContentBlock({
  block,
  index = 0,
  isSelected = false,
  onClick,
  onEdit,
  onTextChange,
  onCinematicUpdate,
  readOnly = false,
}: ContentBlockProps) {
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const { ref: textareaRef, syncHeight } = useAutoHeightTextarea(block.type === 'text' ? block.content : '');

  const renderContent = () => {
    if (block.type === 'section') {
      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!readOnly) onClick?.();
          }}
          className="w-full"
        >
          <SectionBlockRenderer block={block} isEditMode={!readOnly} />
        </div>
      );
    }
    if (block.type === 'divider') {
      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!readOnly) onClick?.();
          }}
          className="w-full"
        >
          <DividerBlock
            style={block.metadata?.dividerStyle ?? 'default'}
            readOnly={readOnly}
          />
        </div>
      );
    }
    if (block.type === 'cinematic') {
      const storyBlock = contentBlockToStoryBlock(block);
      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!readOnly) onClick?.();
          }}
          className="rounded-2xl overflow-hidden"
        >
          <StaticBlockRenderer
            block={storyBlock}
            index={index}
            isEditMode={!readOnly}
            onUpdate={(id, updates) => onCinematicUpdate?.(id, updates)}
            isDark={false}
          />
        </div>
      );
    }

    const textBlockAlign = block.metadata?.textAlign === 'center' ? 'text-center' : block.metadata?.textAlign === 'right' ? 'text-right' : 'text-left';
    const textBlockSize = block.metadata?.fontSize === 'small' ? 'text-sm' : block.metadata?.fontSize === 'large' ? 'text-lg' : 'text-base';
    const textBlockColor = block.metadata?.textColor || '#1d1d1f';

    switch (block.type) {
      case 'text':
        if (readOnly) {
          return (
            <p
              className={`w-full ${textBlockSize} leading-relaxed whitespace-pre-wrap py-3 ${textBlockAlign}`}
              style={{ color: textBlockColor }}
            >
              {block.content || ''}
            </p>
          );
        }
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
            placeholder="描述"
            rows={1}
            maxLength={500}
            style={{ minHeight: TEXTAREA_MIN_HEIGHT_PX, color: textBlockColor }}
            className={`w-full resize-none overflow-hidden focus:outline-none bg-transparent rounded-xl py-3 placeholder:text-[#86868b] focus:bg-[#f5f5f7]/80 ${textBlockAlign} ${textBlockSize}`}
            aria-label="文本内容"
          />
        );
      case 'richtext': {
        const richHtml = block.content || '';
        const safeHtml = typeof document !== 'undefined' ? sanitizeBlockHtml(richHtml) : richHtml;
        const hasContent = richHtml.replace(/<[^>]+>/g, '').trim().length > 0;
        return (
          <div
            className={`w-full py-3 ${textBlockAlign}`}
            style={{ color: textBlockColor }}
            onClick={(e) => {
              e.stopPropagation();
              if (!readOnly) onClick?.();
            }}
          >
            {hasContent ? (
              <div
                className={`prose prose-neutral max-w-none w-full ${textBlockSize} leading-relaxed [&_a]:text-[#007aff] [&_a]:underline [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_ul]:list-disc [&_ol]:list-decimal [&_blockquote]:border-l-[3px] [&_blockquote]:border-[#86868b] [&_blockquote]:pl-3 [&_blockquote]:italic [&_p]:text-inherit [&_li]:text-inherit`}
                style={{ color: textBlockColor }}
                dangerouslySetInnerHTML={{ __html: safeHtml }}
              />
            ) : (
              <p className="text-[#86868b] text-[13px]">富文本</p>
            )}
          </div>
        );
      }
      case 'image': {
        // Ensure images are correctly extracted from metadata
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
            onClick={(e) => {
              e.stopPropagation();
              if (!readOnly) onClick?.();
            }}
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
              <div className="flex h-48 items-center justify-center rounded-2xl bg-[#f5f5f7]">
                <Image size={48} className="text-[#86868b]" />
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
          <div className="relative w-full overflow-hidden rounded-2xl bg-[#f5f5f7]">
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
                <Video size={48} className="text-[#86868b]" />
              </div>
            )}
          </div>
        );
      case 'audio':
        return block.content ? (
          <div className="rounded-full overflow-hidden bg-black/[0.06] ring-1 ring-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-1.5 w-full max-w-sm">
            <audio
              src={block.content}
              controls
              className="w-full h-8 [&::-webkit-media-controls-panel]:bg-transparent"
              aria-label="音频播放"
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        ) : (
          <div
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-black/[0.1] py-3.5 text-[#86868b] hover:border-black/[0.14] hover:bg-black/[0.02] transition-colors cursor-pointer"
            onClick={(e) => { e.stopPropagation(); if (!readOnly) onClick?.(); }}
            role="button"
            aria-label="添加音频"
          >
            <Music size={16} strokeWidth={2} aria-hidden />
            <span className="text-[13px] font-medium">添加音频</span>
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
      case 'richtext':
        return <FileText size={14} />;
      case 'image':
        return <Image size={14} />;
      case 'cinematic':
        return <Image size={14} />;
      case 'video':
        return <Video size={14} />;
      case 'audio':
        return <Music size={14} />;
      case 'section':
        return <LayoutTemplate size={14} />;
      case 'divider':
        return <Minus size={14} />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={readOnly ? undefined : (e) => { e.stopPropagation(); onClick?.(); }}
      className={`group relative transition-all rounded-[20px] ${
        readOnly ? '' : 'cursor-pointer'
      } ${
        block.type === 'image' && block.metadata?.imageDisplayMode === 'gallery'
          ? 'overflow-visible'
          : 'overflow-hidden'
      } ${block.metadata?.showBorder ? 'ring-2 ring-black/[0.12]' : ''}`}
    >
      <div className="py-2 md:py-3">
        {renderContent()}
      </div>

      {!readOnly && isSelected && onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="absolute top-2 right-2 flex items-center gap-1 rounded-full pl-2.5 pr-2.5 py-1.5 text-[11px] font-semibold bg-[#1d1d1f] text-white hover:bg-[#424245] shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all duration-200 active:scale-[0.98]"
          aria-label="编辑内容块"
        >
          <Edit2 size={10} strokeWidth={2.5} />
          <span>编辑</span>
        </button>
      )}
    </div>
  );
}
