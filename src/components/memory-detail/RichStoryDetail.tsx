'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ContentBlock } from '@/components/editor/ContentBlock';
import { MemoryService } from '@/lib/db/services/memory-service';
import type { CarouselItem } from '@/types/memory';

interface RichStoryDetailProps {
  memory: CarouselItem;
  onBack: () => void;
}

/** Renders rich-story memory with same layout as memories/editor (read-only). Header "..." menu includes Edit and Delete. */
export function RichStoryDetail({ memory, onBack }: RichStoryDetailProps) {
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const category = memory.category ?? '故事回忆';
  const title = memory.detailTitle ?? memory.title ?? '';
  const description = memory.description ?? '';
  const blocks = (memory.editorBlocks ?? []).slice().sort((a, b) => a.order - b.order);
  const hasBlocks = blocks.length > 0;
  const richContent = memory.richContent ?? '';

  useEffect(() => {
    if (!moreOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreOpen]);

  const handleEdit = () => {
    setMoreOpen(false);
    router.push(`/memories/editor?id=${memory.id}`);
  };

  const handleDelete = async () => {
    setMoreOpen(false);
    
    const confirmed = confirm('确定要删除这个回忆吗？此操作无法撤销。');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const { error } = await MemoryService.deleteMemory(memory.id);
      if (error) {
        alert(`删除失败：${error}`);
        setIsDeleting(false);
        return;
      }
      
      // Successfully deleted, navigate back to home
      router.push('/');
    } catch (e) {
      console.error('Failed to delete memory:', e);
      alert('删除失败，请重试');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fadeIn font-sans bg-[#fbfbfd] text-[#1d1d1f]">
      {/* Header: same structure as editor (Notion-style), with ... menu that includes Edit */}
      <div className="sticky top-0 z-10 flex items-center justify-between h-11 px-4 bg-[#1d1d1f] text-white">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 rounded-md p-1.5 transition-colors hover:bg-white/[0.08]"
          aria-label="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="text-[13px] font-medium truncate">{category}</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="rounded-md p-1.5 hover:bg-white/[0.08]"
            aria-label="Share"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 hover:bg-white/[0.08]"
            aria-label="Like"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="rounded-md p-1.5 hover:bg-white/[0.08]"
              aria-label="More actions"
              aria-expanded={moreOpen}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>
            {moreOpen && (
              <div
                className="absolute right-0 top-full mt-1 min-w-[140px] rounded-lg bg-white py-1 shadow-lg border border-black/8 text-left z-50"
                role="menu"
              >
                <button
                  type="button"
                  onClick={handleEdit}
                  className="w-full px-4 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-gray-100"
                  role="menuitem"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full px-4 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  role="menuitem"
                >
                  {isDeleting ? '删除中...' : '删除'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content: same layout as editor — title, description, blocks */}
      <div className="no-scrollbar flex-1 overflow-y-auto pb-24 pt-4">
        <div className="px-8 pt-4 space-y-4 max-w-2xl mx-auto">
          <div className="pt-2">
            <h1 className="text-2xl font-bold text-[#1d1d1f]">{title || '无标题'}</h1>
          </div>
          {description ? (
            <div>
              <p className="w-full resize-none text-base text-[#1d1d1f] leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
            </div>
          ) : null}

          {hasBlocks ? (
            <div className="space-y-3 pt-2">
              {blocks.map((block) => (
                <ContentBlock key={block.id} block={block} readOnly />
              ))}
            </div>
          ) : richContent ? (
            <div
              className="prose prose-sm max-w-none text-gray-800 [&_p]:my-2 [&_img]:rounded-lg [&_img]:my-4"
              dangerouslySetInnerHTML={{ __html: richContent }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
