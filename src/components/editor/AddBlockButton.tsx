'use client';

import { useState } from 'react';
import { Plus, Type, Image, Video, Music, X } from 'lucide-react';

interface AddBlockButtonProps {
  onAddBlock: (type: 'text' | 'image' | 'video' | 'audio') => void;
}

/** Apple light mode only: white menu, black primary button. */
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

          {/* Options Menu — Apple light: white card, soft shadow */}
          <div className="absolute bottom-16 z-40 flex flex-col gap-0.5 rounded-[22px] p-1.5 animate-menuPopIn origin-bottom bg-white border border-black/[0.06] shadow-[0_20px_40px_-16px_rgba(0,0,0,0.12),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
            {blockTypes.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => handleAddBlock(type)}
                className="flex items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors duration-150 active:scale-[0.98]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#f5f5f7]">
                  <Icon size={17} strokeWidth={2} className="text-[#6e6e73]" />
                </div>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Main Button — Apple primary: black pill */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`relative z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1d1d1f] text-white hover:bg-[#424245] shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all hover:scale-105 active:scale-95 ${isExpanded ? 'rotate-45' : ''}`}
        aria-label={isExpanded ? '关闭菜单' : '添加内容块'}
      >
        {isExpanded ? <X size={22} strokeWidth={2.5} /> : <Plus size={22} strokeWidth={2.5} />}
      </button>
    </div>
  );
}
