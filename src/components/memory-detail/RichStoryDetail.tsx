'use client';

import type { CarouselItem } from '@/types/memory';

interface RichStoryDetailProps {
  memory: CarouselItem;
  onBack: () => void;
}

export function RichStoryDetail({ memory, onBack }: RichStoryDetailProps) {
  const category = memory.category ?? '故事回忆';
  const title = memory.detailTitle ?? memory.title ?? '';
  const content = memory.richContent ?? '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fadeIn bg-white font-sans text-black">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
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
        <div className="flex items-center gap-4">
          <button type="button" className="rounded-full p-1 hover:bg-gray-100" aria-label="Share">
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
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
          <button type="button" className="rounded-full p-1 hover:bg-gray-100" aria-label="Like">
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
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto">
        <article className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="mb-6 text-3xl font-bold leading-tight text-black md:text-4xl">{title}</h1>
          <div
            className="prose prose-lg max-w-none text-gray-800 
              [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4
              [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3
              [&_p]:my-4 [&_p]:leading-relaxed
              [&_img]:rounded-lg [&_img]:my-6
              [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </article>
      </div>
    </div>
  );
}
