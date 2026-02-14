'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Loader2 } from 'lucide-react';
import type { CarouselItem, MemoryVisibility } from '@/types/memory';
import type { VlogData } from '@/types/vlog';
import { carouselItemToVlogData } from '@/lib/vlog-to-memory';
import { useLocale } from '@/lib/i18n';
import { useOptionalAuth } from '@/lib/auth';
import { updateMemory } from '@/lib/storage';
import { MemoryService } from '@/lib/db/services/memory-service';
import { copyMemoryShareLink } from '@/lib/share-link';

interface VlogDetailProps {
  memory: CarouselItem;
  onBack: () => void;
  isOwner: boolean;
}

export function VlogDetail({ memory, onBack, isOwner }: VlogDetailProps) {
  const router = useRouter();
  const { t } = useLocale();
  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;
  const [vlogData, setVlogData] = useState<VlogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [visibility, setVisibility] = useState<MemoryVisibility>(memory.visibility ?? 'private');
  const [visibilityMenuOpen, setVisibilityMenuOpen] = useState(false);

  useEffect(() => {
    // Load vlog data from memory
    try {
      let data: VlogData | null = null;
      
      // Try to load from vlogDataJson first (full data)
      if (memory.vlogDataJson) {
        data = JSON.parse(memory.vlogDataJson) as VlogData;
      } else {
        // Fallback: reconstruct from CarouselItem fields
        data = carouselItemToVlogData(memory);
      }
      
      setVlogData(data);
    } catch (error) {
      console.error('Failed to load vlog data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [memory]);

  useEffect(() => {
    setVisibility(memory.visibility ?? 'private');
  }, [memory.visibility]);

  const handlePlay = () => {
    if (vlogData && memory.id) {
      // Play by memory id so URL is stable and does not overwrite other vlogs
      router.push(`/memories/vlog/play?id=${encodeURIComponent(memory.id)}`);
    }
  };

  const handleVisibilityChange = useCallback(
    async (v: MemoryVisibility) => {
      setVisibility(v);
      if (!userId) return;
      await updateMemory(userId, memory.id, { visibility: v });
      
      // If setting to public, copy share link to clipboard
      if (v === 'public') {
        const copied = await copyMemoryShareLink(memory.id);
        if (copied) {
          alert(t('memory.linkCopied') || '链接已复制');
        }
      }
    },
    [userId, memory.id, memory.title, memory.description, t]
  );

  const handleDelete = async () => {
    const confirmed = confirm(t('memory.deleteConfirm') || 'Delete this vlog? This action cannot be undone.');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const { error } = await MemoryService.deleteMemory(memory.id);
      if (error) {
        alert(`${t('memory.deleteFailed')} ${error}`);
        setIsDeleting(false);
        return;
      }
      router.push('/');
    } catch (e) {
      console.error('Failed to delete memory:', e);
      alert(t('memory.deleteFailed'));
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!vlogData) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black p-8 text-center">
        <p className="text-lg text-white">Failed to load vlog data</p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full bg-white px-6 py-2 text-sm font-medium text-black hover:bg-gray-100"
        >
          {t('memory.back') || 'Go Back'}
        </button>
      </div>
    );
  }

  // Use a persistent URL for hero; blob URLs are invalid after reload and cause hydration/ERR_FILE_NOT_FOUND
  const firstImage = vlogData.images[0] || memory.image;
  const hasValidHeroUrl =
    typeof firstImage === 'string' &&
    firstImage.length > 0 &&
    !firstImage.startsWith('blob:');

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
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
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">{t('memory.back') || 'Back'}</span>
        </button>
        
        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              {/* Visibility Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setVisibilityMenuOpen((v) => !v)}
                  className="rounded-full px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  {visibility === 'public' ? (t('memory.visibilityPublic') || 'Public') : (t('memory.visibilityPrivate') || 'Private')}
                </button>
                {visibilityMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 min-w-[180px] rounded-xl bg-white/95 backdrop-blur-md py-1 shadow-xl z-50"
                    onClick={() => setVisibilityMenuOpen(false)}
                  >
                    <button
                      type="button"
                      className={`w-full px-4 py-2 text-left text-sm ${visibility === 'private' ? 'font-medium bg-gray-100' : ''} text-black hover:bg-gray-50`}
                      onClick={() => handleVisibilityChange('private')}
                    >
                      {t('memory.visibilityPrivate') || 'Private'} — {t('memory.onlyYouCanSee') || 'Only you'}
                    </button>
                    <button
                      type="button"
                      className={`w-full px-4 py-2 text-left text-sm ${visibility === 'public' ? 'font-medium bg-gray-100' : ''} text-black hover:bg-gray-50`}
                      onClick={() => handleVisibilityChange('public')}
                    >
                      {t('memory.visibilityPublic') || 'Public'} — {t('memory.anyoneWithLinkCanView') || 'Anyone with link'}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Delete Button */}
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 rounded-full bg-white/10 hover:bg-red-500/20 text-white hover:text-red-400 transition-colors disabled:opacity-50"
                title={t('memory.delete') || 'Delete'}
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
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-32">
        {/* Hero Image: only render img when URL is persistent (not blob) to avoid hydration and ERR_FILE_NOT_FOUND */}
        <div className="relative w-full aspect-[9/16] md:aspect-video rounded-2xl overflow-hidden mb-6 bg-black/80">
          {hasValidHeroUrl ? (
          <img
            src={firstImage}
            alt={memory.title}
            className="w-full h-full object-cover"
          />
          ) : (
          <div className="w-full h-full flex items-center justify-center text-white/60 text-center px-6">
            <span className="text-lg font-medium">{memory.title || 'VLOG'}</span>
          </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Play Button Overlay */}
          <button
            type="button"
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center group"
          >
            <div className="p-6 rounded-full bg-white/20 backdrop-blur-md group-hover:bg-white/30 transition-all group-hover:scale-110">
              <Play size={40} className="fill-white text-white ml-1" />
            </div>
          </button>
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {memory.title}
            </h1>
            <p className="text-white/60 text-sm uppercase tracking-wide">
              {memory.category || 'VLOG'}
            </p>
          </div>

          {memory.description && (
            <p className="text-white/80 text-lg leading-relaxed">
              {memory.description}
            </p>
          )}

          {/* Subtitles Preview */}
          {vlogData.subtitles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-white/60 text-sm uppercase tracking-wide">
                {t('vlog.subtitles') || 'Subtitles'}
              </h3>
              <div className="space-y-2">
                {vlogData.subtitles.slice(0, 3).map((subtitle, idx) => (
                  <p key={idx} className="text-white/70 italic">
                    "{subtitle}"
                  </p>
                ))}
                {vlogData.subtitles.length > 3 && (
                  <p className="text-white/50 text-sm">
                    +{vlogData.subtitles.length - 3} more...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Media Count */}
          <div className="flex gap-6 text-white/60 text-sm">
            {vlogData.images.length > 0 && (
              <div>
                <span className="font-semibold text-white">{vlogData.images.length}</span> {t('vlog.photos') || 'Photos'}
              </div>
            )}
            {vlogData.videos.length > 0 && (
              <div>
                <span className="font-semibold text-white">{vlogData.videos.length}</span> {t('vlog.videos') || 'Videos'}
              </div>
            )}
            {vlogData.youtubeIds.length > 0 && (
              <div>
                <span className="font-semibold text-white">{vlogData.youtubeIds.length}</span> YouTube Clips
              </div>
            )}
          </div>

          {/* Filter Info */}
          {vlogData.filterPreset && vlogData.filterPreset !== 'Original' && (
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8m-4-4h8" />
              </svg>
              <span>Filter: <span className="text-white font-medium">{vlogData.filterPreset}</span></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
