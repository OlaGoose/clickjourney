/**
 * Demo data initialization
 * Populates IndexedDB with 3 demo memories for non-authenticated users,
 * one per card type: photo-gallery, cinematic, rich-story (all with images).
 */

import { MemoryRepository } from '../repositories/memory-repository';
import { getDB } from '../core/schema';
import { getDemoGallerySlice } from '@/lib/storage/demo-gallery';
import type { CreateMemoryInput } from '../repositories/memory-repository';

/** 3 demo items: one per memory type, all with images */
const DEMO_ITEMS: ReadonlyArray<{
  type: 'photo-gallery' | 'cinematic' | 'rich-story';
  title: string;
  description: string;
  color: string;
  coord: { lat: number; lng: number; name: string; country: string };
  picsumId: number;
  galleryCount: number;
  richContent?: string;
  editorBlocksJson?: string;
}> = [
  {
    type: 'photo-gallery',
    title: 'Photo Gallery',
    description: 'A weekend in New York: skyline views, street food, and late-night walks through Manhattan.',
    color: 'rgb(44, 62, 80)',
    coord: { lat: 40.7128, lng: -74.006, name: 'New York', country: 'USA' },
    picsumId: 1015,
    galleryCount: 4,
  },
  {
    type: 'cinematic',
    title: 'Cinematic Story',
    description: 'Tokyo nights: neon lights, ramen alleys, and the quiet of a temple garden. A city that never stops.',
    color: 'rgb(142, 68, 173)',
    coord: { lat: 35.6762, lng: 139.6503, name: 'Tokyo', country: 'Japan' },
    picsumId: 1018,
    galleryCount: 3,
  },
  {
    type: 'rich-story',
    title: 'Rich Story',
    description: 'Paris in spring: croissants at dawn, the Eiffel Tower at golden hour, and wine by the Seine.',
    color: 'rgb(192, 57, 43)',
    coord: { lat: 48.8566, lng: 2.3522, name: 'Paris', country: 'France' },
    picsumId: 1019,
    galleryCount: 3,
    richContent: '<p>Paris in spring: croissants at dawn, the Eiffel Tower at golden hour, and wine by the Seine. La vie en rose, for real. This rich story memory includes both text and images.</p>',
    editorBlocksJson: JSON.stringify([
      { id: '1', type: 'text', content: 'Paris in spring: croissants at dawn, the Eiffel Tower at golden hour.', order: 0 },
      { id: '2', type: 'image', content: 'https://picsum.photos/id/1019/600/400', order: 1, metadata: { images: ['https://picsum.photos/id/1019/600/400'] } },
    ]),
  },
];

/** In-memory lock to prevent concurrent initializeDemoData (avoids duplicate inserts) */
let demoInitPromise: Promise<void> | null = null;

/**
 * Check if demo data exists
 */
export async function hasDemoData(): Promise<boolean> {
  try {
    const count = await MemoryRepository.count({ userId: null });
    return count > 0;
  } catch {
    return false;
  }
}

/**
 * Initialize demo data in IndexedDB (3 cards: photo-gallery, cinematic, rich-story).
 * Only creates if no demo data exists; uses a single promise to avoid duplicate concurrent init.
 */
export async function initializeDemoData(): Promise<void> {
  if (demoInitPromise) return demoInitPromise;
  demoInitPromise = (async () => {
    try {
      if (await hasDemoData()) return;

      const demoRecords: CreateMemoryInput[] = DEMO_ITEMS.map((item, i) => ({
        userId: null,
        type: item.type,
        title: item.title,
        subtitle: 'Memory',
        imageUrl: `https://picsum.photos/id/${item.picsumId}/600/400`,
        color: item.color,
        chord: [220, 261.63, 329.63],
        detailTitle: null,
        category: null,
        galleryUrls: getDemoGallerySlice(item.galleryCount),
        description: item.description,
        richContent: item.richContent ?? `<p>${item.description}</p>`,
        editorBlocksJson: item.editorBlocksJson ?? null,
        audioUrls: [],
        videoUrls: [],
        lat: item.coord.lat,
        lng: item.coord.lng,
        placeName: item.coord.name,
        placeAddress: `${item.coord.name}, ${item.coord.country}`,
        sortOrder: i,
        isJourneyStart: false,
        isJourneyEnd: false,
      }));

      for (const record of demoRecords) {
        await MemoryRepository.create(record);
      }
      console.log(`Initialized ${demoRecords.length} demo memories`);
    } catch (e) {
      console.error('Failed to initialize demo data:', e);
      demoInitPromise = null;
    }
  })();
  return demoInitPromise;
}

/**
 * Clear demo data and reset init lock so demo can be re-initialized later
 */
export async function clearDemoData(): Promise<void> {
  try {
    demoInitPromise = null;
    const db = getDB();
    const demoRecords = (await db.memories.toArray()).filter((r) => r.userId === null);
    for (const record of demoRecords) {
      await db.memories.delete(record.id);
    }
  } catch (e) {
    console.error('Failed to clear demo data:', e);
  }
}
