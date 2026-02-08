'use client';

import { useState } from 'react';
import { Plus, Type, Image, Video, Music, X } from 'lucide-react';

interface AddBlockButtonProps {
  onAddBlock: (type: 'text' | 'image' | 'video' | 'audio') => void;
}

export function AddBlockButton({ onAddBlock }: AddBlockButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const blockTypes = [
    { type: 'text' as const, icon: Type, label: '文本' },
    { type: 'image' as const, icon: Image, label: '图片' },
    { type: 'video' as const, icon: Video, label: '视频' },
    { type: 'audio' as const, icon: Music, label: '音频' },
  ];

  const handleAddBlock = (type: 'text' | 'image' | 'video' | 'audio') => {
    onAddBlock(type);
    setIsExpanded(false);
  };

  return (
    <div className="relative flex justify-center">
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsExpanded(false)}
          />
          
          {/* Options Menu */}
          <div className="absolute bottom-16 z-40 flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl border border-gray-100 animate-fadeIn">
            {blockTypes.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => handleAddBlock(type)}
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                  <Icon size={16} />
                </div>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Main Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`relative z-40 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${
          isExpanded ? 'rotate-45' : ''
        }`}
        aria-label={isExpanded ? '关闭菜单' : '添加内容块'}
      >
        {isExpanded ? <X size={20} strokeWidth={2.5} /> : <Plus size={20} strokeWidth={2.5} />}
      </button>
    </div>
  );
}
