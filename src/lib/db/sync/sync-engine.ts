/**
 * Sync Engine
 * Handles bidirectional sync between IndexedDB and Supabase
 * Local-first strategy with optimistic updates
 */

import { MemoryRepository } from '../repositories/memory-repository';
import { getDB, type MemoryRecord, type SyncQueueItem } from '../core/schema';
import { supabase } from '@/lib/supabase/client';
import type { TravelMemoryRow } from '@/lib/storage/types';

/**
 * Convert MemoryRecord to TravelMemoryRow (for Supabase)
 */
function memoryRecordToRow(record: MemoryRecord): Omit<TravelMemoryRow, 'created_at' | 'updated_at'> {
  return {
    id: record.id,
    user_id: record.userId,
    type: record.type,
    title: record.title,
    subtitle: record.subtitle,
    image_url: record.imageUrl,
    color: record.color,
    chord: record.chord,
    detail_title: record.detailTitle,
    category: record.category,
    gallery_urls: record.galleryUrls,
    description: record.description,
    rich_content: record.richContent,
    editor_blocks_json: record.editorBlocksJson ?? null,
    audio_urls: record.audioUrls,
    video_urls: record.videoUrls,
    lat: record.lat,
    lng: record.lng,
    place_name: record.placeName,
    place_address: record.placeAddress,
    sort_order: record.sortOrder,
    is_journey_start: record.isJourneyStart,
    is_journey_end: record.isJourneyEnd,
  };
}

/**
 * Convert TravelMemoryRow to MemoryRecord (from Supabase)
 */
function rowToMemoryRecord(row: TravelMemoryRow): MemoryRecord {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    subtitle: row.subtitle,
    imageUrl: row.image_url,
    color: row.color,
    chord: Array.isArray(row.chord) ? row.chord : [],
    detailTitle: row.detail_title,
    category: row.category,
    galleryUrls: Array.isArray(row.gallery_urls) ? row.gallery_urls : [],
    description: row.description,
    richContent: row.rich_content,
    editorBlocksJson: row.editor_blocks_json ?? null,
    audioUrls: Array.isArray(row.audio_urls) ? row.audio_urls : [],
    videoUrls: Array.isArray(row.video_urls) ? row.video_urls : [],
    lat: row.lat,
    lng: row.lng,
    placeName: row.place_name,
    placeAddress: row.place_address,
    sortOrder: row.sort_order,
    isJourneyStart: row.is_journey_start,
    isJourneyEnd: row.is_journey_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: 'synced',
    lastSyncAt: new Date().toISOString(),
    syncError: null,
    localVersion: 1,
    remoteVersion: 1,
    isDeleted: false,
    deletedAt: null,
  };
}

export interface SyncResult {
  success: boolean;
  pulledCount: number;
  pushedCount: number;
  errors: string[];
}

export class SyncEngine {
  private static isSyncing = false;
  private static syncInterval: NodeJS.Timeout | null = null;

  /**
   * Check if Supabase is available
   */
  private static isSupabaseAvailable(): boolean {
    return supabase !== null && supabase !== undefined;
  }

  /**
   * Pull data from Supabase to IndexedDB
   * Only fetch records updated since last sync
   */
  static async pull(userId: string | null): Promise<{ count: number; errors: string[] }> {
    if (!this.isSupabaseAvailable()) {
      return { count: 0, errors: ['Supabase not configured'] };
    }

    const errors: string[] = [];
    
    try {
      // Get last sync timestamp from metadata
      const db = getDB();
      const lastSyncMeta = await db.metadata.get('lastPullSync');
      const lastSyncAt = lastSyncMeta?.value as string | undefined;
      
      // Build query
      let query = supabase
        .from('travel_memories')
        .select('*')
        .order('updated_at', { ascending: false });
      
      // Filter by user
      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      } else {
        query = query.is('user_id', null);
      }
      
      // Only fetch updated records if we have a last sync time
      if (lastSyncAt) {
        query = query.gt('updated_at', lastSyncAt);
      }
      
      const { data, error } = await query;
      
      if (error) {
        errors.push(`Pull error: ${error.message}`);
        return { count: 0, errors };
      }
      
      const rows = (data ?? []) as TravelMemoryRow[];
      
      if (rows.length > 0) {
        // Convert and upsert to IndexedDB
        const records = rows.map(rowToMemoryRecord);
        
        // Merge with local records (keep local changes if pending)
        for (const remote of records) {
          const local = await MemoryRepository.getById(remote.id);
          
          if (local) {
            // Local exists - check if we should merge
            if (local.syncStatus === 'pending') {
              // Keep local changes, mark as conflict if remote is newer
              if (new Date(remote.updatedAt) > new Date(local.updatedAt)) {
                await db.memories.put({
                  ...local,
                  syncStatus: 'conflict',
                  remoteVersion: remote.localVersion,
                });
              }
              continue;
            }
          }
          
          // No conflict - use remote version
          await db.memories.put(remote);
        }
        
        // Update last sync timestamp
        await db.metadata.put({
          key: 'lastPullSync',
          value: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      
      return { count: rows.length, errors };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown pull error';
      errors.push(message);
      return { count: 0, errors };
    }
  }

  /**
   * Push pending changes from IndexedDB to Supabase
   */
  static async push(): Promise<{ count: number; errors: string[] }> {
    if (!this.isSupabaseAvailable()) {
      return { count: 0, errors: ['Supabase not configured'] };
    }

    const errors: string[] = [];
    let pushedCount = 0;
    
    try {
      // Only push user-owned records; skip demo data (userId null) — RLS only allows user_id = auth.uid()
      const allPending = await MemoryRepository.getPendingSync();
      const pending = allPending.filter((r) => r.userId != null);

      for (const record of pending) {
        try {
          if (record.isDeleted) {
            // Delete from Supabase
            const { error } = await supabase
              .from('travel_memories')
              .delete()
              .eq('id', record.id);
            
            if (error) throw error;
            
            // Hard delete from local after successful sync
            await MemoryRepository.hardDelete(record.id);
          } else {
            // Upsert to Supabase
            const row = memoryRecordToRow(record);
            const { error } = await supabase
              .from('travel_memories')
              .upsert(row as never);
            
            if (error) throw error;
            
            // Mark as synced
            await MemoryRepository.markAsSynced(record.id, record.localVersion);
          }
          
          pushedCount++;
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          errors.push(`Push error for ${record.id}: ${message}`);
          await MemoryRepository.markAsSyncError(record.id, message);
        }
      }
      
      return { count: pushedCount, errors };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown push error';
      errors.push(message);
      return { count: pushedCount, errors };
    }
  }

  /**
   * Full bidirectional sync
   */
  static async sync(userId: string | null): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        pulledCount: 0,
        pushedCount: 0,
        errors: ['Sync already in progress'],
      };
    }

    this.isSyncing = true;
    
    try {
      // Push first (send local changes)
      const pushResult = await this.push();
      
      // Then pull (get remote changes)
      const pullResult = await this.pull(userId);
      
      const allErrors = [...pushResult.errors, ...pullResult.errors];
      
      return {
        success: allErrors.length === 0,
        pulledCount: pullResult.count,
        pushedCount: pushResult.count,
        errors: allErrors,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Start automatic background sync
   * Syncs every intervalMs (default: 30 seconds)
   */
  static startAutoSync(userId: string | null, intervalMs: number = 30000): void {
    this.stopAutoSync();
    
    // Initial sync
    this.sync(userId).catch(console.error);
    
    // Periodic sync
    this.syncInterval = setInterval(() => {
      this.sync(userId).catch(console.error);
    }, intervalMs);
  }

  /**
   * Stop automatic background sync
   */
  static stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Initial sync from Supabase (full refresh)
   * Used on first login or after logout
   */
  static async initialSync(userId: string): Promise<SyncResult> {
    if (!this.isSupabaseAvailable()) {
      return {
        success: false,
        pulledCount: 0,
        pushedCount: 0,
        errors: ['Supabase not configured'],
      };
    }

    try {
      // Clear local data for this user
      await MemoryRepository.clear(userId);
      
      // Clear last sync timestamp to force full pull
      const db = getDB();
      await db.metadata.delete('lastPullSync');
      
      // Pull all data
      return await this.sync(userId);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Initial sync failed';
      return {
        success: false,
        pulledCount: 0,
        pushedCount: 0,
        errors: [message],
      };
    }
  }

  /**
   * Check sync status
   */
  static async getSyncStatus(): Promise<{
    pending: number;
    synced: number;
    errors: number;
    conflicts: number;
  }> {
    const db = getDB();
    
    const [pending, synced, errors, conflicts] = await Promise.all([
      db.memories.where('syncStatus').equals('pending').count(),
      db.memories.where('syncStatus').equals('synced').count(),
      db.memories.where('syncStatus').equals('error').count(),
      db.memories.where('syncStatus').equals('conflict').count(),
    ]);
    
    return { pending, synced, errors, conflicts };
  }
}
