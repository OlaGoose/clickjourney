'use client';

/**
 * Memory storage: local-first with IndexedDB + Supabase sync.
 * - IndexedDB as primary storage (offline-first)
 * - Background sync to Supabase when authenticated
 * - Demo data for non-authenticated users
 */

import { MemoryService } from '../db/services/memory-service';
import { initializeDemoData, hasDemoData } from '../db/utils/demo-data';
import type { CarouselItem, NewMemoryInput } from '@/types';
import { getDemoGallerySlice } from './demo-gallery';

/** Original 4 cards for homepage carousel (with coordinates + description + participants for full linkage). */
const DEMO_ITEMS_MAIN: CarouselItem[] = [
  { id: '1', title: 'Severance', subtitle: 'Memory', image: 'https://picsum.photos/id/1015/600/400', color: 'rgb(44, 62, 80)', chord: [220, 261.63, 329.63], gallery: getDemoGallerySlice(4), coordinates: { lat: 40.7128, lng: -74.006, name: 'New York', country: 'USA' }, description: 'A weekend in New York: skyline views, street food, and late-night walks through Manhattan. This memory is where the journey really began.', participants: ['Felix', 'Aneka'] },
  { id: '2', title: 'Ted Lasso', subtitle: 'Memory', image: 'https://picsum.photos/id/1016/600/400', color: 'rgb(41, 128, 185)', chord: [261.63, 329.63, 392], gallery: getDemoGallerySlice(4), coordinates: { lat: 51.5074, lng: -0.1278, name: 'London', country: 'UK' }, description: 'London calling: fish and chips by the Thames, the sound of Big Ben, and rain that made every café feel like home.', participants: ['Mark', 'Sora', 'Felix'] },
  { id: '3', title: 'Foundation', subtitle: 'Memory', image: 'https://picsum.photos/id/1018/600/400', color: 'rgb(142, 68, 173)', chord: [196, 246.94, 293.66], gallery: getDemoGallerySlice(4), coordinates: { lat: 35.6762, lng: 139.6503, name: 'Tokyo', country: 'Japan' }, description: 'Tokyo nights: neon lights, ramen alleys, and the quiet of a temple garden. A city that never stops, but still finds peace.', participants: ['Aneka', 'Mark'] },
  { id: '4', title: 'The Morning Show', subtitle: 'Memory', image: 'https://picsum.photos/id/1019/600/400', color: 'rgb(192, 57, 43)', chord: [174.61, 220, 261.63], gallery: getDemoGallerySlice(4), coordinates: { lat: 48.8566, lng: 2.3522, name: 'Paris', country: 'France' }, description: 'Paris in spring: croissants at dawn, the Eiffel Tower at golden hour, and wine by the Seine. La vie en rose, for real.', participants: ['Felix', 'Aneka', 'Mark', 'Sora'] },
];

const MOCK_CARD_IMAGES = [1015, 1016, 1018, 1019, 1020, 1021, 1022, 1023, 1024];

/** Demo locations and descriptions for gallery mock cards (globe + callout linkage). */
const DEMO_COORDS = [
  { lat: 34.0522, lng: -118.2437, name: 'Los Angeles', country: 'USA' },
  { lat: -33.8688, lng: 151.2093, name: 'Sydney', country: 'Australia' },
  { lat: 41.9028, lng: 12.4964, name: 'Rome', country: 'Italy' },
  { lat: 52.52, lng: 13.405, name: 'Berlin', country: 'Germany' },
  { lat: 19.4326, lng: -99.1332, name: 'Mexico City', country: 'Mexico' },
  { lat: 22.3193, lng: 114.1694, name: 'Hong Kong', country: 'China' },
  { lat: -23.5505, lng: -46.6333, name: 'São Paulo', country: 'Brazil' },
  { lat: 55.7558, lng: 37.6173, name: 'Moscow', country: 'Russia' },
  { lat: 28.6139, lng: 77.209, name: 'New Delhi', country: 'India' },
];
const DEMO_GALLERY_DESCRIPTIONS = [
  'Sunset on the Pacific, palm trees and endless summer.',
  'Bondi Beach and harbour lights—Sydney at its best.',
  'Ancient streets and gelato. Rome in a day.',
  'Berlin walls and techno nights. History and now.',
  'Tacos, murals, and the buzz of Mexico City.',
  'Skyline and dim sum. Hong Kong never sleeps.',
  'Samba, street art, and the spirit of São Paulo.',
  'Red Square and winter light. Moscow in December.',
  'Spices, chaos, and chai. Delhi in full color.',
];

/** 9 cards for checking detail layout: 0–8 images (mock 详情页 0–8 张图). */
const DEMO_ITEMS_GALLERY_MOCK: CarouselItem[] = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
  id: `mock-gallery-${n}`,
  title: `${n} 张`,
  subtitle: '检查详情',
  image: `https://picsum.photos/id/${MOCK_CARD_IMAGES[n]}/600/400`,
  color: 'rgb(52, 73, 94)',
  chord: [220, 261.63, 329.63],
  gallery: getDemoGallerySlice(n),
  coordinates: DEMO_COORDS[n],
  description: DEMO_GALLERY_DESCRIPTIONS[n],
}));

const DEMO_ITEMS: CarouselItem[] = [...DEMO_ITEMS_MAIN, ...DEMO_ITEMS_GALLERY_MOCK];

const START_CARD: CarouselItem = {
  id: 'start-card',
  title: '12',
  subtitle: 'OCT',
  detailTitle: '2023',
  description: 'JOURNEY START',
  image: '',
  color: '#09090b',
  chord: [130.81, 196, 261.63],
  coordinates: { lat: 40.3956, lng: -74.1768, name: 'Orbit View', country: 'Space' },
};

const END_CARD: CarouselItem = {
  id: 'end-card',
  title: '04',
  subtitle: 'NOV',
  detailTitle: '2023',
  description: 'JOURNEY END',
  image: '',
  color: '#09090b',
  chord: [130.81, 164.81, 196],
  coordinates: { lat: 40.3956, lng: -74.1768, name: 'Orbit View', country: 'Space' },
};

/**
 * Build carousel list: start + memories (repeated) + end
 * Note: Demo fallback is now handled by IndexedDB demo data initialization
 */
export function buildCarouselItems(memories: CarouselItem[]): CarouselItem[] {
  // Repeat memories 3 times for carousel effect
  const middle = memories.length > 0 ? memories : [];
  return [START_CARD, ...middle, ...middle, ...middle, END_CARD];
}

/**
 * Fetch memories for user from IndexedDB
 * Local-first: reads from IndexedDB, syncs with Supabase in background
 */
export async function fetchMemoriesForUser(userId: string | null): Promise<CarouselItem[]> {
  if (typeof window === 'undefined') return [];
  
  try {
    // Initialize demo data for non-authenticated users if needed
    if (!userId) {
      const hasDemo = await hasDemoData();
      if (!hasDemo) {
        await initializeDemoData();
      }
    }
    
    // Fetch from IndexedDB (local-first)
    const memories = await MemoryService.listMemories(userId);
    return memories;
  } catch (e) {
    console.warn('fetchMemoriesForUser error:', e);
    return [];
  }
}

/**
 * Get carousel items from IndexedDB
 * Note: Database initialization should be done via DatabaseProvider in layout
 */
export async function getCarouselItems(userId: string | null): Promise<CarouselItem[]> {
  if (typeof window === 'undefined') return buildCarouselItems([]);
  
  // Fetch memories (demo data will be auto-initialized if needed)
  const memories = await fetchMemoriesForUser(userId);
  return buildCarouselItems(memories);
}

/**
 * Save a new memory to IndexedDB (local-first)
 * Automatically syncs to Supabase in background if authenticated
 */
export async function saveMemory(userId: string, item: NewMemoryInput | CarouselItem): Promise<{ error: string | null }> {
  if (typeof window === 'undefined') {
    return { error: 'Storage not available on server' };
  }
  
  try {
    const result = await MemoryService.createMemory(userId, item);
    return { error: result.error };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
