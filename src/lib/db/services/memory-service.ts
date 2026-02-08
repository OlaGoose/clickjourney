/**
 * Memory Service
 * High-level business logic layer for memory operations
 * Provides a unified API for the application
 */

import { MemoryRepository, type CreateMemoryInput, type UpdateMemoryInput } from '../repositories/memory-repository';
import { SyncEngine } from '../sync/sync-engine';
import type { MemoryRecord } from '../core/schema';
import type { CarouselItem, NewMemoryInput } from '@/types/memory';
import type { LocationData } from '@/types/memory';

/**
 * Convert CarouselItem to MemoryRecord
 */
export function carouselItemToMemoryRecord(
  item: Partial<CarouselItem> & { title: string; subtitle: string; image: string; color: string },
  userId: string | null,
  opts: { sortOrder?: number; isJourneyStart?: boolean; isJourneyEnd?: boolean } = {}
): CreateMemoryInput {
  return {
    userId,
    type: item.type ?? null,
    title: item.title,
    subtitle: item.subtitle,
    imageUrl: item.image,
    color: item.color,
    chord: Array.isArray(item.chord) ? item.chord : [130.81, 196, 261.63],
    detailTitle: item.detailTitle ?? null,
    category: item.category ?? null,
    galleryUrls: Array.isArray(item.gallery) ? item.gallery : [],
    description: item.description ?? null,
    richContent: item.richContent ?? null,
    audioUrls: Array.isArray(item.audioUrls) ? item.audioUrls : [],
    videoUrls: Array.isArray(item.videoUrls) ? item.videoUrls : [],
    lat: item.coordinates?.lat ?? null,
    lng: item.coordinates?.lng ?? null,
    placeName: item.coordinates?.name ?? null,
    placeAddress: item.coordinates?.address ?? null,
    sortOrder: opts.sortOrder ?? 0,
    isJourneyStart: opts.isJourneyStart ?? false,
    isJourneyEnd: opts.isJourneyEnd ?? false,
  };
}

/**
 * Convert MemoryRecord to CarouselItem
 */
export function memoryRecordToCarouselItem(record: MemoryRecord): CarouselItem {
  const coords: LocationData | undefined =
    record.lat != null && record.lng != null
      ? {
          lat: record.lat,
          lng: record.lng,
          name: record.placeName ?? '',
          address: record.placeAddress ?? undefined,
        }
      : undefined;

  return {
    id: record.id,
    type: record.type as any, // Cast to MemoryType; null handled by inferMemoryType
    title: record.title,
    subtitle: record.subtitle,
    image: record.imageUrl,
    color: record.color,
    chord: record.chord,
    detailTitle: record.detailTitle ?? undefined,
    category: record.category ?? undefined,
    gallery: record.galleryUrls,
    description: record.description ?? undefined,
    richContent: record.richContent ?? undefined,
    audioUrls: record.audioUrls,
    videoUrls: record.videoUrls,
    coordinates: coords,
  };
}

/**
 * Environment detection
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

function isMockAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true';
}

export class MemoryService {
  /**
   * Initialize the service and start sync if authenticated
   */
  static async initialize(userId: string | null): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // In development with mock auth, don't sync to Supabase
      const shouldSync = userId && !(isDevelopment() && isMockAuthEnabled());
      
      if (shouldSync) {
        // Check if this is first time - do initial sync if no local data
        const count = await MemoryRepository.count({ userId });
        
        if (count === 0) {
          // First time - do full sync from Supabase
          await SyncEngine.initialSync(userId);
        } else {
          // Already have data - do incremental sync
          await SyncEngine.sync(userId);
        }
        
        // Start background sync (every 30 seconds)
        SyncEngine.startAutoSync(userId, 30000);
      }
    } catch (e) {
      console.error('MemoryService initialization failed:', e);
    }
  }

  /**
   * Cleanup on logout
   */
  static async cleanup(userId?: string): Promise<void> {
    if (typeof window === 'undefined') return;

    SyncEngine.stopAutoSync();
    
    if (userId) {
      // Clear user's data
      await MemoryRepository.clear(userId);
    }
  }

  /**
   * Create a new memory
   */
  static async createMemory(
    userId: string | null,
    input: NewMemoryInput | CarouselItem
  ): Promise<{ data: CarouselItem | null; error: string | null }> {
    try {
      // Get max sort order
      const memories = await MemoryRepository.list({ userId, sortBy: 'sortOrder', sortDirection: 'desc', limit: 1 });
      const maxSortOrder = memories.length > 0 ? memories[0].sortOrder : -1;
      
      // Convert to MemoryRecord
      const recordInput = carouselItemToMemoryRecord(
        input as Partial<CarouselItem> & { title: string; subtitle: string; image: string; color: string },
        userId,
        { sortOrder: maxSortOrder + 1 }
      );
      
      // Create in IndexedDB (local-first)
      const record = await MemoryRepository.create(recordInput);
      
      // Trigger sync in background (non-blocking)
      if (userId && !(isDevelopment() && isMockAuthEnabled())) {
        SyncEngine.push().catch(console.error);
      }
      
      // Convert back to CarouselItem
      const item = memoryRecordToCarouselItem(record);
      
      return { data: item, error: null };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create memory';
      return { data: null, error: message };
    }
  }

  /**
   * Get memory by ID
   */
  static async getMemory(id: string): Promise<CarouselItem | null> {
    try {
      const record = await MemoryRepository.getById(id);
      return record ? memoryRecordToCarouselItem(record) : null;
    } catch (e) {
      console.error('getMemory error:', e);
      return null;
    }
  }

  /**
   * List memories for user
   */
  static async listMemories(userId: string | null): Promise<CarouselItem[]> {
    try {
      const records = await MemoryRepository.list({
        userId,
        sortBy: 'sortOrder',
        sortDirection: 'asc',
      });
      
      return records
        .filter((r) => !r.isJourneyStart && !r.isJourneyEnd)
        .map(memoryRecordToCarouselItem);
    } catch (e) {
      console.error('listMemories error:', e);
      return [];
    }
  }

  /**
   * Update memory
   */
  static async updateMemory(
    id: string,
    input: UpdateMemoryInput
  ): Promise<{ data: CarouselItem | null; error: string | null }> {
    try {
      const record = await MemoryRepository.update(id, input);
      
      if (!record) {
        return { data: null, error: 'Memory not found' };
      }
      
      // Trigger sync in background
      SyncEngine.push().catch(console.error);
      
      return { data: memoryRecordToCarouselItem(record), error: null };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update memory';
      return { data: null, error: message };
    }
  }

  /**
   * Delete memory
   */
  static async deleteMemory(id: string): Promise<{ error: string | null }> {
    try {
      const success = await MemoryRepository.delete(id);
      
      if (!success) {
        return { error: 'Memory not found' };
      }
      
      // Trigger sync in background
      SyncEngine.push().catch(console.error);
      
      return { error: null };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete memory';
      return { error: message };
    }
  }

  /**
   * Reorder memories
   */
  static async reorderMemories(updates: Array<{ id: string; sortOrder: number }>): Promise<{ error: string | null }> {
    try {
      await MemoryRepository.updateSortOrder(updates);
      
      // Trigger sync in background
      SyncEngine.push().catch(console.error);
      
      return { error: null };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to reorder memories';
      return { error: message };
    }
  }

  /**
   * Manual sync trigger
   */
  static async sync(userId: string | null): Promise<{ success: boolean; error: string | null }> {
    if (!userId || (isDevelopment() && isMockAuthEnabled())) {
      return { success: false, error: 'Sync not available in mock mode' };
    }

    try {
      const result = await SyncEngine.sync(userId);
      return {
        success: result.success,
        error: result.errors.length > 0 ? result.errors.join(', ') : null,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sync failed';
      return { success: false, error: message };
    }
  }

  /**
   * Get sync status
   */
  static async getSyncStatus() {
    try {
      return await SyncEngine.getSyncStatus();
    } catch (e) {
      console.error('getSyncStatus error:', e);
      return { pending: 0, synced: 0, errors: 0, conflicts: 0 };
    }
  }

  /**
   * Check if local data exists
   */
  static async hasLocalData(userId: string | null): Promise<boolean> {
    try {
      const count = await MemoryRepository.count({ userId });
      return count > 0;
    } catch (e) {
      return false;
    }
  }
}
