'use client';

import { useState } from 'react';
import { Edit2, Image, Video, Music, Type } from 'lucide-react';
import type { ContentBlock as ContentBlockType } from '@/types/editor';

interface ContentBlockProps {
  block: ContentBlockType;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
}

export function ContentBlock({ block, isSelected, onClick, onEdit }: ContentBlockProps) {
  const [isHovered, setIsHovered] = useState(false);

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
      case 'image':
        return (
          <div className="relative w-full overflow-hidden rounded-2xl bg-gray-100">
            {block.content ? (
              <img
                src={block.content}
                alt="Content"
                className="h-auto w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-48 items-center justify-center">
                <Image size={48} className="text-gray-300" />
              </div>
            )}
          </div>
        );
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
      className={`group relative cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-black ring-offset-2' : ''
      }`}
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
      
      {isSelected && (
        <div className="absolute -bottom-1 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-black text-white">
          {getIcon()}
        </div>
      )}
    </div>
  );
}
