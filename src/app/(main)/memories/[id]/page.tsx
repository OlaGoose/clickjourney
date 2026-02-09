'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { MemoryService } from '@/lib/db/services/memory-service';
import { getScriptForCard } from '@/lib/cinematic-storage';
import { inferMemoryType, type CarouselItem } from '@/types/memory';
import type { DirectorScript } from '@/types/cinematic';
import { PhotoGalleryDetail } from '@/components/memory-detail/PhotoGalleryDetail';
import { CinematicDetail } from '@/components/memory-detail/CinematicDetail';
import { RichStoryDetail } from '@/components/memory-detail/RichStoryDetail';
import { VideoDetail } from '@/components/memory-detail/VideoDetail';

export default function MemoryPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const shareView = searchParams.get('share') === '1';

  const [memory, setMemory] = useState<CarouselItem | null>(null);
  const [script, setScript] = useState<DirectorScript | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setError('Invalid memory ID');
      return;
    }
    async function loadMemory() {
      try {
        setIsLoading(true);
        setError(null);

        const item = await MemoryService.getMemory(id);
        if (!item) {
          setError('Memory not found');
          return;
        }

        setMemory(item);

        // Load cinematic script if this is a cinematic memory
        const memoryType = inferMemoryType(item);
        if (memoryType === 'cinematic') {
          const cinematicScript = getScriptForCard(id);
          setScript(cinematicScript);
        }
      } catch (e) {
        console.error('Failed to load memory:', e);
        setError('Failed to load memory');
      } finally {
        setIsLoading(false);
      }
    }

    loadMemory();
  }, [id]);

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error || !memory) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black p-8 text-center">
        <p className="text-lg text-white">{error || 'Memory not found'}</p>
        <button
          type="button"
          onClick={handleBack}
          className="rounded-full bg-white px-6 py-2 text-sm font-medium text-black hover:bg-gray-100"
        >
          Go Back
        </button>
      </div>
    );
  }

  const memoryType = inferMemoryType(memory);

  switch (memoryType) {
    case 'cinematic':
      return <CinematicDetail memory={memory} script={script} onBack={handleBack} />;
    case 'rich-story':
      return <RichStoryDetail memory={memory} onBack={handleBack} shareView={shareView} />;
    case 'video':
      return <VideoDetail memory={memory} onBack={handleBack} />;
    case 'photo-gallery':
    default:
      return <PhotoGalleryDetail memory={memory} onBack={handleBack} />;
  }
}
