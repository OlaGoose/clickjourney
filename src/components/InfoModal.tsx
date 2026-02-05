'use client';

import type { GeminiResponse } from '@/types';

interface InfoModalProps {
  data: GeminiResponse | null;
  isLoading: boolean;
  onClose: () => void;
}

export default function InfoModal({ data, isLoading, onClose }: InfoModalProps) {
  if (!isLoading && !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-white"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h3 className="mb-4 text-xl font-bold text-white">Journey Intel</h3>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-white" />
            <p className="text-sm text-zinc-400">Contacting travel guide...</p>
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
            <p className="leading-relaxed text-zinc-200">{data?.text}</p>
            {data?.groundingChunks && data.groundingChunks.length > 0 && (
              <div className="mt-6 border-t border-zinc-700 pt-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Maps & Sources</h4>
                <div className="space-y-2">
                  {data.groundingChunks.map((chunk, idx) => {
                    const mapUri = chunk.maps?.uri;
                    const mapTitle = chunk.maps?.title ?? 'View on Google Maps';
                    const webUri = chunk.web?.uri;
                    const webTitle = chunk.web?.title ?? 'Source Link';
                    if (mapUri) {
                      return (
                        <a
                          key={idx}
                          href={mapUri}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center rounded-lg bg-zinc-800 p-3 transition-colors hover:bg-zinc-700 group"
                        >
                          <div className="mr-3 rounded-full bg-red-500/20 p-2 text-red-400 transition-colors group-hover:bg-red-500 group-hover:text-white">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{mapTitle}</div>
                            <div className="text-xs text-zinc-400">Google Maps</div>
                          </div>
                        </a>
                      );
                    }
                    if (webUri) {
                      return (
                        <a
                          key={idx}
                          href={webUri}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center rounded-lg bg-zinc-800 p-3 transition-colors hover:bg-zinc-700"
                        >
                          <div className="mr-3 text-blue-400">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="2" y1="12" x2="22" y2="12" />
                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            </svg>
                          </div>
                          <div className="max-w-[200px] truncate text-sm text-blue-300">{webTitle}</div>
                        </a>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
