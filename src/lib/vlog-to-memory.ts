'use client';

import type { VlogData } from '@/types/vlog';
import type { NewMemoryInput } from '@/types/memory';
import { resolveCoordinatesForLocation } from './upload-to-memory';

const DEFAULT_CHORD = [196, 246.94, 293.66];
const DEFAULT_COLOR = 'rgb(88, 28, 135)'; // Purple for vlog

/**
 * Convert VlogData to CarouselItem (NewMemoryInput) for database storage.
 * Vlog type: short-form video memories with subtitles, filters, and mixed media.
 */
export function vlogToCarouselItem(vlogData: VlogData): NewMemoryInput {
  const firstImage = vlogData.images[0] ?? '';
  const location = vlogData.location?.trim() || 'My Vlog';
  const coordinates = resolveCoordinatesForLocation(location);
  
  // Use first subtitle line as description preview
  const description = vlogData.subtitles[0] ?? 'A cinematic vlog moment';
  
  // Combine all media URLs for gallery
  const gallery = [
    ...vlogData.images,
    ...vlogData.videos,
    // YouTube thumbnails for preview
    ...vlogData.youtubeIds.map(id => `https://img.youtube.com/vi/${id}/hqdefault.jpg`)
  ];

  return {
    type: 'vlog',
    title: location,
    subtitle: 'VLOG',
    image: firstImage,
    color: DEFAULT_COLOR,
    chord: DEFAULT_CHORD,
    detailTitle: location,
    category: 'Vlog',
    description: description.length > 80 ? description.slice(0, 80) + '…' : description,
    gallery,
    coordinates,
    // Store audio URLs for playback
    audioUrls: [vlogData.audio, vlogData.recordedAudio].filter(Boolean) as string[],
    // Store videos
    videoUrls: vlogData.videos,
  };
}

/**
 * Reconstruct VlogData from a saved CarouselItem for playback.
 * This allows loading a saved vlog from the database and playing it.
 */
export function carouselItemToVlogData(item: any): VlogData | null {
  try {
    // Check if this is a vlog type or has vlog data stored
    const vlogDataJson = item.vlogDataJson;
    if (vlogDataJson) {
      // If full vlog data was stored, use it directly
      return JSON.parse(vlogDataJson) as VlogData;
    }

    // Otherwise, reconstruct from CarouselItem fields (basic reconstruction)
    const images = (item.gallery || []).filter((url: string) => 
      !url.startsWith('https://img.youtube.com') && 
      !url.includes('youtube.com') &&
      !(item.videoUrls || []).includes(url)
    );

    // Extract YouTube IDs from gallery if they were stored as thumbnail URLs
    const youtubeIds = (item.gallery || [])
      .filter((url: string) => url.includes('youtube.com'))
      .map((url: string) => {
        const match = url.match(/\/vi\/([^/]+)\//);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];

    return {
      location: item.title || '',
      images,
      videos: item.videoUrls || [],
      audio: (item.audioUrls && item.audioUrls[0]) || null,
      recordedAudio: (item.audioUrls && item.audioUrls[1]) || null,
      subtitles: item.description ? [item.description] : [],
      filterPreset: 'Original',
      youtubeIds,
    };
  } catch (error) {
    console.error('Failed to reconstruct VlogData:', error);
    return null;
  }
}
