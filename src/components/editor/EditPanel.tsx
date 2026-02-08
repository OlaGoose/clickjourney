'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Upload, Trash2, Image as ImageIcon, Video as VideoIcon, Music as MusicIcon, LayoutGrid, Images } from 'lucide-react';
import PhotoGrid from '@/components/PhotoGrid';
import { GalleryDisplayView } from '@/components/upload/GalleryDisplay';
import type { ContentBlock, ImageDisplayMode } from '@/types/editor';

const MAX_IMAGES = 6;

/** Returns true if the block has meaningful content (no empty blocks). */
function blockHasContent(b: ContentBlock): boolean {
  switch (b.type) {
    case 'text':
      return (b.content ?? '').trim().length > 0;
    case 'image':
      const imgs = b.metadata?.images?.length ? b.metadata.images : b.content ? [b.content] : [];
      return imgs.length > 0;
    case 'video':
    case 'audio':
      return (b.content ?? '').length > 0;
    default:
      return false;
  }
}

interface EditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  block: ContentBlock | null;
  onSave: (block: ContentBlock) => void;
  onDelete: () => void;
  /** Called when panel is closed with no content, so parent can remove the block. */
  onDiscard?: () => void;
  isDark?: boolean;
}

export function EditPanel({ isOpen, onClose, block, onSave, onDelete, onDiscard, isDark = false }: EditPanelProps) {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageDisplayMode, setImageDisplayMode] = useState<ImageDisplayMode>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (block) {
      setContent(block.content);
      setFileName(block.metadata?.fileName || '');
      if (block.type === 'image') {
        const list = block.metadata?.images?.length
          ? block.metadata.images
          : block.content
            ? [block.content]
            : [];
        setImages(list);
        setImageDisplayMode(block.metadata?.imageDisplayMode ?? 'grid');
      }
    }
  }, [block]);

  useEffect(() => {
    if (isOpen && block?.type === 'text' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, block?.type]);

  if (!block) return null;

  /** Current state as a block (for empty check when closing without save). */
  const getCurrentBlock = (): ContentBlock => {
    if (block.type === 'image') {
      return {
        ...block,
        content: images[0] ?? '',
        metadata: {
          ...block.metadata,
          images: images.length ? images : undefined,
          imageDisplayMode,
        },
      };
    }
    return {
      ...block,
      content,
      metadata: { ...block.metadata, fileName: fileName || undefined },
    };
  };

  const handleSave = () => {
    const updated = getCurrentBlock();
    if (!blockHasContent(updated)) {
      onDiscard?.();
      onClose();
      return;
    }
    onSave(updated);
    onClose();
  };

  const handleClose = () => {
    if (!blockHasContent(getCurrentBlock())) {
      onDiscard?.();
    }
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const list = Array.from(files).map((file) => URL.createObjectURL(file));
    if (block.type === 'image') {
      setImages((prev) => [...prev, ...list].slice(0, MAX_IMAGES));
    } else {
      const file = files[0];
      if (file) {
        setContent(URL.createObjectURL(file));
        setFileName(file.name);
      }
    }
    e.target.value = '';
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const renderEditor = () => {
    switch (block.type) {
      case 'text':
        return (
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入文本内容..."
              className={`h-full w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed rounded-2xl focus:outline-none placeholder:opacity-50 ${
                isDark
                  ? 'text-white placeholder:text-white/40 focus:bg-white/5'
                  : 'text-gray-800 placeholder:text-gray-400 focus:bg-gray-50/80'
              }`}
              rows={8}
            />
          </div>
        );

      case 'image':
        return (
          <div className="flex-1 px-4 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            {/* 呈现形式：网格 / 相册 — pill toggle Apple-style */}
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                呈现形式
              </span>
              <div className={`flex rounded-full p-0.5 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                <button
                  type="button"
                  onClick={() => setImageDisplayMode('grid')}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-95 ${
                    imageDisplayMode === 'grid'
                      ? isDark
                        ? 'bg-white text-black shadow-sm'
                        : 'bg-white text-black shadow-sm'
                      : isDark
                        ? 'text-white/70 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-pressed={imageDisplayMode === 'grid'}
                >
                  <LayoutGrid size={14} />
                  网格
                </button>
                <button
                  type="button"
                  onClick={() => setImageDisplayMode('gallery')}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-95 ${
                    imageDisplayMode === 'gallery'
                      ? isDark
                        ? 'bg-white text-black shadow-sm'
                        : 'bg-white text-black shadow-sm'
                      : isDark
                        ? 'text-white/70 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-pressed={imageDisplayMode === 'gallery'}
                >
                  <Images size={14} />
                  相册
                </button>
              </div>
            </div>
            {images.length > 0 ? (
              <div className="space-y-3">
                {imageDisplayMode === 'gallery' ? (
                  <GalleryDisplayView
                    images={images}
                    ariaLabel="编辑区块照片"
                    className="max-h-[320px]"
                  />
                ) : (
                  <PhotoGrid
                    images={images}
                    totalCount={images.length}
                    ariaLabel="编辑区块照片"
                    className="max-h-[320px]"
                  />
                )}
                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition-all active:scale-95 ${
                      isDark
                        ? 'bg-white/10 text-white hover:bg-white/20'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Upload size={16} />
                    添加图片（{images.length}/{MAX_IMAGES}）
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUploadClick}
                className={`flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl transition-all hover:opacity-90 active:scale-[0.99] ${
                  isDark
                    ? 'bg-white/5 hover:bg-white/10'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <ImageIcon size={32} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                <span className={`text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                  点击上传图片（可多选，最多 {MAX_IMAGES} 张）
                </span>
              </button>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="flex-1 px-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {content ? (
              <div className="space-y-3">
                <div className={`relative overflow-hidden rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                  <video src={content} controls className="h-auto w-full">
                    Your browser does not support the video tag.
                  </video>
                </div>
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition-all active:scale-95 ${
                    isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Upload size={16} />
                  替换视频
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUploadClick}
                className={`flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl transition-all hover:opacity-90 active:scale-[0.99] ${
                  isDark
                    ? 'bg-white/5 hover:bg-white/10'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <VideoIcon size={32} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                <span className={`text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                  点击上传视频
                </span>
              </button>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="flex-1 px-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {content ? (
              <div className="space-y-3">
                <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <audio src={content} controls className="w-full">
                    Your browser does not support the audio tag.
                  </audio>
                  {fileName && (
                    <p className={`mt-2 text-xs truncate ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      {fileName}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition-all active:scale-95 ${
                    isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Upload size={16} />
                  替换音频
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUploadClick}
                className={`flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl transition-all hover:opacity-90 active:scale-[0.99] ${
                  isDark
                    ? 'bg-white/5 hover:bg-white/10'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <MusicIcon size={32} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                <span className={`text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                  点击上传音频
                </span>
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop — 与面板同步淡入；关闭时先收再淡出 */}
      <div
        className={`fixed inset-0 z-40 backdrop-blur-md transition-opacity duration-300 ${
          isDark ? 'bg-black/50' : 'bg-black/25'
        } ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={handleClose}
        aria-hidden
      />

      {/* Panel — iOS 风格：从下往上拉起（带轻微 overshoot），从上往下收进去 */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-[32px] shadow-[0_-8px_32px_rgba(0,0,0,0.15)] ${
          isDark ? 'bg-[#1c1c1e]' : 'bg-white'
        } ${
          isOpen
            ? 'translate-y-0 animate-sheetSlideUp'
            : 'translate-y-full transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]'
        }`}
      >
        {/* Drag Handle */}
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className={`h-1 w-10 rounded-full ${isDark ? 'bg-white/30' : 'bg-gray-300'}`} />
        </div>

        {/* Header — 标题水平居中，左右对称布局 */}
        <div className="grid grid-cols-3 items-center px-4 pb-3">
          <button
            type="button"
            onClick={onDelete}
            className={`justify-self-start flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-95 ${
              isDark
                ? 'text-red-400 hover:bg-red-500/20'
                : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <Trash2 size={14} />
            删除
          </button>
          <h3
            className={`justify-self-center text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            {block.type === 'text' && '编辑文本'}
            {block.type === 'image' && '编辑图片'}
            {block.type === 'video' && '编辑视频'}
            {block.type === 'audio' && '编辑音频'}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className={`justify-self-end rounded-full p-2.5 transition-all active:scale-95 ${
              isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'
            }`}
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {renderEditor()}
        </div>

        {/* Footer — 无边框 */}
        <div className="p-4">
          <button
            type="button"
            onClick={handleSave}
            className={`w-full rounded-full py-3.5 text-[15px] font-semibold transition-all active:scale-95 ${
              isDark
                ? 'bg-white text-black hover:bg-white/95 shadow-lg'
                : 'bg-black text-white hover:bg-gray-800 shadow-lg'
            }`}
          >
            完成
          </button>
        </div>
      </div>
    </>
  );
}
