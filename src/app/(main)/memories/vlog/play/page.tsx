'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VlogPlayer } from '@/components/vlog/VlogPlayer';
import { VLOG_SESSION_KEY, type VlogData } from '@/types/vlog';

export default function VlogPlayPage() {
  const router = useRouter();
  const [data, setData] = useState<VlogData | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(VLOG_SESSION_KEY);
      if (!raw) {
        router.replace('/memories/vlog');
        return;
      }
      const parsed = JSON.parse(raw) as Partial<VlogData>;
      if (
        !Array.isArray(parsed.images) ||
        !Array.isArray(parsed.subtitles) ||
        !Array.isArray(parsed.youtubeIds)
      ) {
        router.replace('/memories/vlog');
        return;
      }
      setData({
        location: typeof parsed.location === 'string' ? parsed.location : '',
        images: parsed.images,
        videos: Array.isArray(parsed.videos) ? parsed.videos : [],
        audio: parsed.audio ?? null,
        recordedAudio: parsed.recordedAudio ?? null,
        subtitles: parsed.subtitles,
        filterPreset: parsed.filterPreset ?? 'Original',
        youtubeIds: parsed.youtubeIds,
      });
    } catch {
      router.replace('/memories/vlog');
    }
  }, [router]);

  const handleExit = () => {
    router.push('/memories/vlog');
  };

  if (data === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return <VlogPlayer data={data} onExit={handleExit} />;
}
