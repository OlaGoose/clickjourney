/**
 * IndexedDB Schema Definition
 * Using Dexie for type-safe IndexedDB operations
 */

import Dexie, { type Table } from 'dexie';

/** Database version */
export const DB_VERSION = 2;
export const DB_NAME = 'orbit-journey-db';

/**
 * Local memory record with sync metadata
 * Extends the base data with sync state tracking
 */
export interface MemoryRecord {
  // Core fields
  id: string;
  userId: string | null;
  
  // Memory content
  type: string | null; // MemoryType: 'photo-gallery' | 'cinematic' | 'rich-story' | 'video'
  title: string;
  subtitle: string;
  imageUrl: string;
  color: string;
  chord: number[];
  detailTitle: string | null;
  category: string | null;
  galleryUrls: string[];
  description: string | null;
  richContent: string | null;
  /** JSON-serialized editor blocks for rich-story (ContentBlock[]); optional for backward compat */
  editorBlocksJson?: string | null;
  audioUrls: string[];
  videoUrls: string[];
  
  // Location data
  lat: number | null;
  lng: number | null;
  placeName: string | null;
  placeAddress: string | null;
  
  // Metadata
  sortOrder: number;
  isJourneyStart: boolean;
  isJourneyEnd: boolean;
  /** private = only owner; public = anyone with link. Default 'private' for backward compat */
  visibility?: 'private' | 'public';
  /** DirectorScript JSON for cinematic; used when syncing public share */
  cinematicScriptJson?: string | null;
  /** VlogData JSON for vlog type; used for perfect reconstruction on playback and sharing */
  vlogDataJson?: string | null;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Sync metadata
  syncStatus: 'pending' | 'synced' | 'conflict' | 'error';
  lastSyncAt: string | null;
  syncError: string | null;
  localVersion: number; // For conflict detection
  remoteVersion: number | null;
  
  // Soft delete
  isDeleted: boolean;
  deletedAt: string | null;
}

/**
 * Sync queue for offline operations
 * Tracks operations that need to be synced to Supabase
 */
export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  tableName: 'memories';
  recordId: string;
  data: unknown;
  createdAt: string;
  attempts: number;
  lastAttemptAt: string | null;
  error: string | null;
}

/**
 * App metadata and configuration
 */
export interface AppMetadata {
  key: string;
  value: unknown;
  updatedAt: string;
}

/**
 * Main database class
 */
export class OrbitJourneyDB extends Dexie {
  memories!: Table<MemoryRecord, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  metadata!: Table<AppMetadata, string>;

  constructor() {
    super(DB_NAME);
    
    // Version 1: Initial schema
    this.version(1).stores({
      memories: 'id, userId, sortOrder, syncStatus, createdAt, updatedAt, [userId+isDeleted], [userId+sortOrder]',
      syncQueue: 'id, operation, recordId, createdAt, [operation+createdAt]',
      metadata: 'key',
    });
    
    // Version 2: Add vlogDataJson support (no index changes needed, just field addition)
    this.version(2).stores({
      memories: 'id, userId, sortOrder, syncStatus, createdAt, updatedAt, [userId+isDeleted], [userId+sortOrder]',
      syncQueue: 'id, operation, recordId, createdAt, [operation+createdAt]',
      metadata: 'key',
    }).upgrade(tx => {
      // Schema upgrade is automatic - Dexie handles adding new optional fields
      // No data migration needed as vlogDataJson is optional
      return tx.table('memories').toCollection().modify(() => {
        // No-op: just trigger version bump
      });
    });
  }
}

/**
 * Singleton database instance
 * Lazy initialization to avoid SSR issues
 */
let dbInstance: OrbitJourneyDB | null = null;

export function getDB(): OrbitJourneyDB {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser');
  }
  
  if (!dbInstance) {
    dbInstance = new OrbitJourneyDB();
  }
  
  return dbInstance;
}

/**
 * Close database connection (useful for cleanup in tests)
 */
export async function closeDB(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Delete database (useful for logout or reset)
 */
export async function deleteDB(): Promise<void> {
  await closeDB();
  if (typeof window !== 'undefined') {
    await Dexie.delete(DB_NAME);
  }
}
