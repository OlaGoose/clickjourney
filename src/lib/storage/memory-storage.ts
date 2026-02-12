'use client';

/**
 * Memory storage: local-first with IndexedDB + Supabase sync.
 * - IndexedDB as primary storage (offline-first)
 * - Background sync to Supabase when authenticated
 * - Demo data for non-authenticated users
 */

import { MemoryService, carouselItemToUpdateInput } from '../db/services/memory-service';
import { initializeDemoData, hasDemoData } from '../db/utils/demo-data';
import { isDemoDataEnabled } from '../db/utils/environment';
import type { CarouselItem, NewMemoryInput } from '@/types';
import { getLocalCinematicItems } from '@/lib/cinematic-storage';

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
 * Build carousel list: start + memories + end (each memory shown once)
 * Note: Demo fallback is now handled by IndexedDB demo data initialization
 */
export function buildCarouselItems(memories: CarouselItem[]): CarouselItem[] {
  const middle = memories.length > 0 ? memories : [];
  return [START_CARD, ...middle, END_CARD];
}

/**
 * Fetch memories for user from IndexedDB
 * Local-first: reads from IndexedDB, syncs with Supabase in background
 */
export async function fetchMemoriesForUser(userId: string | null): Promise<CarouselItem[]> {
  if (typeof window === 'undefined') return [];
  
  try {
    // Initialize demo data only when enabled (dev or NEXT_PUBLIC_ENABLE_DEMO_DATA)
    if (!userId && isDemoDataEnabled()) {
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
 * Merges upload-generated cinematic memories (local-only when not authenticated).
 */
export async function getCarouselItems(userId: string | null): Promise<CarouselItem[]> {
  if (typeof window === 'undefined') return buildCarouselItems([]);

  const memories = await fetchMemoriesForUser(userId);
  const localCinematic = userId == null ? getLocalCinematicItems() : [];
  const merged = [...memories, ...localCinematic];
  return buildCarouselItems(merged);
}

/**
 * Save a new memory to IndexedDB (local-first)
 * Automatically syncs to Supabase in background if authenticated
 * Returns created item (with id) so callers can e.g. store cinematic script by id
 */
export async function saveMemory(
  userId: string,
  item: NewMemoryInput | CarouselItem
): Promise<{ data: CarouselItem | null; error: string | null }> {
  if (typeof window === 'undefined') {
    return { data: null, error: 'Storage not available on server' };
  }

  try {
    const result = await MemoryService.createMemory(userId, item);
    return { data: result.data, error: result.error };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/**
 * Update an existing memory by id (local-first, syncs in background when authenticated)
 */
export async function updateMemory(
  userId: string | null,
  id: string,
  partial: Partial<CarouselItem>
): Promise<{ data: CarouselItem | null; error: string | null }> {
  if (typeof window === 'undefined') {
    return { data: null, error: 'Storage not available on server' };
  }

  try {
    const updateInput = carouselItemToUpdateInput(partial);
    const result = await MemoryService.updateMemory(id, updateInput);
    return { data: result.data, error: result.error };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/**
 * Delete a memory by id (local-first, syncs in background when authenticated)
 */
export async function deleteMemory(
  id: string
): Promise<{ error: string | null }> {
  if (typeof window === 'undefined') {
    return { error: 'Storage not available on server' };
  }

  try {
    const result = await MemoryService.deleteMemory(id);
    return { error: result.error };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
