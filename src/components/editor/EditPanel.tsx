'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Upload, Trash2, Image as ImageIcon, Video as VideoIcon, Music as MusicIcon } from 'lucide-react';
import type { ContentBlock } from '@/types/editor';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (block) {
      setContent(block.content);
      setFileName(block.metadata?.fileName || '');
    }
  }, [block]);

  useEffect(() => {
    if (isOpen && block?.type === 'text' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, block?.type]);

  if (!block) return null;

  const handleSave = () => {
    onSave({
      ...block,
      content,
      metadata: {
        ...block.metadata,
        fileName: fileName || undefined,
      },
    });
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setContent(url);
    setFileName(file.name);
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
          <div className="flex-1 px-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {content ? (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-2xl bg-gray-100">
                  <img src={content} alt="Preview" className="h-auto w-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 active:scale-95"
                >
                  <Upload size={16} />
                  替换图片
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUploadClick}
                className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 transition-all hover:border-gray-300 hover:bg-gray-100 active:scale-[0.99]"
              >
                <ImageIcon size={32} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-600">点击上传图片</span>
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
