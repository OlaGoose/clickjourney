'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { CarouselItem } from '@/types/memory';
import { MemoryService } from '@/lib/db/services/memory-service';

interface VideoDetailProps {
  memory: CarouselItem;
  onBack: () => void;
}

export function VideoDetail({ memory, onBack }: VideoDetailProps) {
  const router = useRouter();
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const category = memory.category ?? '视频回忆';
  const title = memory.detailTitle ?? memory.title ?? '';
  const description = memory.description ?? '';
  const videos = memory.videoUrls ?? [];

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
      
      router.push('/');
    } catch (e) {
      console.error('Failed to delete memory:', e);
      alert('删除失败，请重试');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fadeIn bg-black font-sans text-white">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-black/80 backdrop-blur-xl px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 rounded-full p-2 transition-colors hover:bg-white/10"
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
        <span className="text-base font-semibold">{category}</span>
        <div className="flex items-center gap-1">
          <button type="button" className="rounded-full p-2 hover:bg-white/10" aria-label="Share">
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
          <button type="button" className="rounded-full p-2 hover:bg-white/10" aria-label="Like">
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
              className="rounded-full p-2 hover:bg-white/10"
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
                className="absolute right-0 top-full mt-1 min-w-[140px] rounded-lg bg-[#1a1a1a] py-1 shadow-lg border border-white/10 text-left z-50"
                role="menu"
              >
                <button
                  type="button"
                  onClick={handleEdit}
                  className="w-full px-4 py-2 text-left text-[13px] text-white hover:bg-white/5"
                  role="menuitem"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full px-4 py-2 text-left text-[13px] text-red-500 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  role="menuitem"
                >
                  {isDeleting ? '删除中...' : '删除'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {videos.length > 0 ? (
          <div className="flex h-full flex-col">
            <div className="relative flex-1 bg-black">
              <video
                key={videos[activeVideoIndex]}
                src={videos[activeVideoIndex]}
                controls
                autoPlay
                className="h-full w-full object-contain"
              />
            </div>
            
            {videos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-4 py-3 bg-black/60">
                {videos.map((video, index) => (
                  <button
                    key={video}
                    type="button"
                    onClick={() => setActiveVideoIndex(index)}
                    className={`relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg transition-all ${
                      index === activeVideoIndex
                        ? 'ring-2 ring-white'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <video
                      src={video}
                      className="h-full w-full object-cover"
                      muted
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            No videos available
          </div>
        )}
      </div>

      {(title || description) && (
        <div className="bg-gradient-to-t from-black to-transparent px-4 py-4">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {description && <p className="mt-2 text-sm text-gray-300">{description}</p>}
        </div>
      )}
    </div>
  );
}
