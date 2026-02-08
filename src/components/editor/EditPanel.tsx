'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Upload, Trash2, Image as ImageIcon, Video as VideoIcon, Music as MusicIcon, LayoutGrid, Images } from 'lucide-react';
import PhotoGrid from '@/components/PhotoGrid';
import { GalleryDisplayView } from '@/components/upload/GalleryDisplay';
import type { ContentBlock, ImageDisplayMode } from '@/types/editor';

const MAX_IMAGES = 6;

interface EditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  block: ContentBlock | null;
  onSave: (block: ContentBlock) => void;
  onDelete: () => void;
}

export function EditPanel({ isOpen, onClose, block, onSave, onDelete }: EditPanelProps) {
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

  const handleSave = () => {
    if (block.type === 'image') {
      onSave({
        ...block,
        content: images[0] ?? '',
        metadata: {
          ...block.metadata,
          images: images.length ? images : undefined,
          imageDisplayMode,
        },
      });
    } else {
      onSave({
        ...block,
        content,
        metadata: {
          ...block.metadata,
          fileName: fileName || undefined,
        },
      });
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
              className="h-full w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-gray-800 placeholder:text-gray-400 focus:outline-none"
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
            {/* 呈现形式：网格 / 相册 */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">呈现形式</span>
              <div className="flex rounded-full bg-gray-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setImageDisplayMode('grid')}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    imageDisplayMode === 'grid' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-pressed={imageDisplayMode === 'grid'}
                >
                  <LayoutGrid size={14} />
                  网格
                </button>
                <button
                  type="button"
                  onClick={() => setImageDisplayMode('gallery')}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    imageDisplayMode === 'gallery' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-gray-900'
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
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 active:scale-95"
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
                className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 transition-all hover:border-gray-300 hover:bg-gray-100 active:scale-[0.99]"
              >
                <ImageIcon size={32} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-600">点击上传图片（可多选，最多 {MAX_IMAGES} 张）</span>
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
                <div className="relative overflow-hidden rounded-2xl bg-gray-100">
                  <video src={content} controls className="h-auto w-full">
                    Your browser does not support the video tag.
                  </video>
                </div>
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 active:scale-95"
                >
                  <Upload size={16} />
                  替换视频
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUploadClick}
                className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 transition-all hover:border-gray-300 hover:bg-gray-100 active:scale-[0.99]"
              >
                <VideoIcon size={32} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-600">点击上传视频</span>
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
                <div className="rounded-2xl bg-gray-50 p-4">
                  <audio src={content} controls className="w-full">
                    Your browser does not support the audio tag.
                  </audio>
                  {fileName && (
                    <p className="mt-2 text-xs text-gray-500 truncate">{fileName}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 active:scale-95"
                >
                  <Upload size={16} />
                  替换音频
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUploadClick}
                className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 transition-all hover:border-gray-300 hover:bg-gray-100 active:scale-[0.99]"
              >
                <MusicIcon size={32} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-600">点击上传音频</span>
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
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-[32px] bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag Handle */}
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 pb-3">
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-red-600 transition-all hover:bg-red-50 active:scale-95"
          >
            <Trash2 size={14} />
            删除
          </button>
          <h3 className="text-sm font-semibold text-gray-900">
            {block.type === 'text' && '编辑文本'}
            {block.type === 'image' && '编辑图片'}
            {block.type === 'video' && '编辑视频'}
            {block.type === 'audio' && '编辑音频'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 transition-colors hover:bg-gray-100"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {renderEditor()}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-full bg-black py-3 text-sm font-semibold text-white transition-all hover:bg-gray-800 active:scale-95"
          >
            完成
          </button>
        </div>
      </div>
    </>
  );
}
