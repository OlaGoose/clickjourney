'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { VlogPlayer } from '@/components/vlog/VlogPlayer';
import { MemoryService } from '@/lib/db/services/memory-service';
import { carouselItemToVlogData } from '@/lib/vlog-to-memory';
import { VLOG_SESSION_KEY, type VlogData } from '@/types/vlog';
import type { CarouselItem } from '@/types/memory';

function normalizeVlogData(parsed: Partial<VlogData> | null): VlogData | null {
  if (!parsed || !Array.isArray(parsed.subtitles) || !Array.isArray(parsed.youtubeIds)) return null;
  return {
    location: typeof parsed.location === 'string' ? parsed.location : '',
    images: Array.isArray(parsed.images) ? parsed.images : [],
    videos: Array.isArray(parsed.videos) ? parsed.videos : [],
    audio: parsed.audio ?? null,
    recordedAudio: parsed.recordedAudio ?? null,
    subtitles: parsed.subtitles,
    filterPreset: parsed.filterPreset ?? 'Original',
    youtubeIds: parsed.youtubeIds,
  };
}

function VlogPlayFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );
}

function VlogPlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromQuery = searchParams.get('id');

  const [data, setData] = useState<VlogData | null>(null);
  const [memoryId, setMemoryId] = useState<string | null>(idFromQuery || null);
  const [loading, setLoading] = useState(true);

  const loadByMemoryId = useCallback(
    async (id: string): Promise<VlogData | null> => {
      let item: CarouselItem | null = await MemoryService.getMemory(id);
      if (!item) {
        try {
          const res = await fetch(`/api/memories/${id}`);
          if (res.ok) item = (await res.json()) as CarouselItem;
        } catch {
          // ignore
        }
      }
      if (!item) return null;
      if (item.type !== 'vlog') return null;
      const vlogData = item.vlogDataJson
        ? normalizeVlogData(JSON.parse(item.vlogDataJson) as Partial<VlogData>)
        : carouselItemToVlogData(item);
      return vlogData ?? null;
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        if (idFromQuery) {
          setMemoryId(idFromQuery);
          const vlogData = await loadByMemoryId(idFromQuery);
          if (!cancelled && vlogData) {
            setData(vlogData);
            return;
          }
          if (!cancelled && !vlogData) {
            router.replace(`/memories/${idFromQuery}`);
            return;
          }
        }

        const raw = sessionStorage.getItem(VLOG_SESSION_KEY);
        if (!raw) {
          if (!idFromQuery) router.replace('/memories/vlog');
          return;
        }
        const parsed = JSON.parse(raw) as Partial<VlogData>;
        const normalized = normalizeVlogData(parsed);
        if (!cancelled && normalized) {
          setData(normalized);
          setMemoryId(sessionStorage.getItem('vlogMemoryId'));
        } else if (!cancelled) {
          router.replace('/memories/vlog');
        }
      } catch {
        if (!cancelled) router.replace('/memories/vlog');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [idFromQuery, loadByMemoryId, router]);

  const handleExit = useCallback(() => {
    if (memoryId && memoryId.startsWith('vlog-') === false) {
      router.push(`/memories/${memoryId}`);
    } else {
      router.push('/memories/vlog');
    }
  }, [memoryId, router]);

  if (loading || data === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return <VlogPlayer data={data} onExit={handleExit} />;
}

export default function VlogPlayPage() {
  return (
    <Suspense fallback={<VlogPlayFallback />}>
      <VlogPlayContent />
    </Suspense>
  );
}
