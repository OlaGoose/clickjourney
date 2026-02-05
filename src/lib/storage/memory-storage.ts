'use client';

/**
 * Memory storage: local-first with Supabase sync.
 * - Default/demo data when not logged in
 * - IndexedDB cache + Supabase when authenticated
 */

import { supabase } from '../supabase/client';
import type { CarouselItem } from '@/types';
import { getDemoGallerySlice } from './demo-gallery';
import { rowToCarouselItem, carouselItemToRow, type TravelMemoryRow } from './types';

/** Original 4 cards for homepage carousel. */
const DEMO_ITEMS_MAIN: CarouselItem[] = [
  { id: '1', title: 'Severance', subtitle: 'Memory', image: 'https://picsum.photos/id/1015/600/400', color: 'rgb(44, 62, 80)', chord: [220, 261.63, 329.63], gallery: getDemoGallerySlice(4) },
  { id: '2', title: 'Ted Lasso', subtitle: 'Memory', image: 'https://picsum.photos/id/1016/600/400', color: 'rgb(41, 128, 185)', chord: [261.63, 329.63, 392], gallery: getDemoGallerySlice(4) },
  { id: '3', title: 'Foundation', subtitle: 'Memory', image: 'https://picsum.photos/id/1018/600/400', color: 'rgb(142, 68, 173)', chord: [196, 246.94, 293.66], gallery: getDemoGallerySlice(4) },
  { id: '4', title: 'The Morning Show', subtitle: 'Memory', image: 'https://picsum.photos/id/1019/600/400', color: 'rgb(192, 57, 43)', chord: [174.61, 220, 261.63], gallery: getDemoGallerySlice(4) },
];

const MOCK_CARD_IMAGES = [1015, 1016, 1018, 1019, 1020, 1021, 1022, 1023, 1024];

/** 9 cards for checking detail layout: 0–8 images (mock 详情页 0–8 张图). */
const DEMO_ITEMS_GALLERY_MOCK: CarouselItem[] = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
  id: `mock-gallery-${n}`,
  title: `${n} 张`,
  subtitle: '检查详情',
  image: `https://picsum.photos/id/${MOCK_CARD_IMAGES[n]}/600/400`,
  color: 'rgb(52, 73, 94)',
  chord: [220, 261.63, 329.63],
  gallery: getDemoGallerySlice(n),
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
};

/** Build carousel list: start + memories (repeated) + end */
export function buildCarouselItems(memories: CarouselItem[]): CarouselItem[] {
  const middle = memories.length ? memories : DEMO_ITEMS;
  return [START_CARD, ...middle, ...middle, ...middle, END_CARD];
}

/** Fetch memories for user from Supabase; returns [] if not configured or error */
export async function fetchMemoriesForUser(userId: string | null): Promise<CarouselItem[]> {
  if (!supabase) return [];
  try {
    const query = userId
      ? supabase
          .from('travel_memories')
          .select('*')
          .or(`user_id.eq.${userId},user_id.is.null`)
          .order('sort_order', { ascending: true })
      : supabase
          .from('travel_memories')
          .select('*')
          .is('user_id', null)
          .order('sort_order', { ascending: true });
    const { data, error } = await query;
    if (error) {
      console.warn('fetchMemoriesForUser', error);
      return [];
    }
    const rows = (data ?? []) as TravelMemoryRow[];
    return rows.filter((r) => !r.is_journey_start && !r.is_journey_end).map(rowToCarouselItem);
  } catch (e) {
    console.warn('fetchMemoriesForUser', e);
    return [];
  }
}

/** Get carousel items: for authenticated user from DB (with demo fallback), else demo */
export async function getCarouselItems(userId: string | null): Promise<CarouselItem[]> {
  const memories = await fetchMemoriesForUser(userId);
  return buildCarouselItems(memories);
}

/** Save a memory to Supabase (authenticated only) */
export async function saveMemory(userId: string, item: CarouselItem): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' };
  try {
    const row = carouselItemToRow(item, userId);
    const { error } = await supabase.from('travel_memories').insert(row as never);
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
