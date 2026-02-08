'use client';

import { useState } from 'react';
import { Plus, Type, Image, Video, Music, X } from 'lucide-react';

interface AddBlockButtonProps {
  isDark?: boolean;
  onAddBlock: (type: 'text' | 'image' | 'video' | 'audio') => void;
}

export function AddBlockButton({ isDark = false, onAddBlock }: AddBlockButtonProps) {
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

          {/* Options Menu — Airbnb warmth + Apple refinement: soft shadow, generous radius, subtle border */}
          <div
            className={`absolute bottom-16 z-40 flex flex-col gap-0.5 rounded-[22px] p-1.5 animate-menuPopIn origin-bottom ${
              isDark
                ? 'bg-[#2d2d30] border border-white/[0.06] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)]'
                : 'bg-white border border-gray-200/80 shadow-[0_20px_40px_-16px_rgba(0,0,0,0.12),0_8px_24px_-8px_rgba(0,0,0,0.08)]'
            }`}
          >
            {blockTypes.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => handleAddBlock(type)}
                className={`flex items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] font-medium transition-colors duration-150 active:scale-[0.98] ${
                  isDark
                    ? 'text-white/95 hover:bg-white/[0.08]'
                    : 'text-gray-800 hover:bg-gray-50'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${
                    isDark ? 'bg-white/[0.1]' : 'bg-gray-100'
                  }`}
                >
                  <Icon size={17} strokeWidth={2} className={isDark ? 'text-white/90' : 'text-gray-600'} />
                </div>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Main Button — pill style, Apple/upload primary CTA */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`relative z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 ${
          isDark
            ? 'bg-white text-black hover:bg-white/95'
            : 'bg-black text-white hover:bg-gray-800'
        } ${isExpanded ? 'rotate-45' : ''}`}
        aria-label={isExpanded ? '关闭菜单' : '添加内容块'}
      >
        {isExpanded ? <X size={22} strokeWidth={2.5} /> : <Plus size={22} strokeWidth={2.5} />}
      </button>
    </div>
  );
}
