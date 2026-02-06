/**
 * Memory Repository
 * Type-safe CRUD operations for memories with offline support
 */

import { getDB, type MemoryRecord } from '../core/schema';

/**
 * Generate a UUID (browser-compatible)
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create memory input (omit computed fields)
 */
export type CreateMemoryInput = Omit<
  MemoryRecord,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'syncStatus'
  | 'lastSyncAt'
  | 'syncError'
  | 'localVersion'
  | 'remoteVersion'
  | 'isDeleted'
  | 'deletedAt'
>;

/**
 * Update memory input (partial update)
 */
export type UpdateMemoryInput = Partial<
  Omit<
    MemoryRecord,
    | 'id'
    | 'userId'
    | 'createdAt'
    | 'updatedAt'
    | 'syncStatus'
    | 'lastSyncAt'
    | 'syncError'
    | 'localVersion'
    | 'remoteVersion'
    | 'isDeleted'
    | 'deletedAt'
  >
>;

/**
 * Query options for listing memories
 */
export interface ListMemoriesOptions {
  userId?: string | null;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'sortOrder' | 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
}

export class MemoryRepository {
  /**
   * Create a new memory
   */
  static async create(input: CreateMemoryInput): Promise<MemoryRecord> {
    const db = getDB();
    const now = new Date().toISOString();
    
    const record: MemoryRecord = {
      id: generateId(),
      ...input,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
      lastSyncAt: null,
      syncError: null,
      localVersion: 1,
      remoteVersion: null,
      isDeleted: false,
      deletedAt: null,
    };
    
    await db.memories.add(record);
    return record;
  }

  /**
   * Get memory by ID
   */
  static async getById(id: string): Promise<MemoryRecord | undefined> {
    const db = getDB();
    const record = await db.memories.get(id);
    
    // Don't return deleted records unless explicitly requested
    if (record?.isDeleted) {
      return undefined;
    }
    
    return record;
  }

  /**
   * List memories with filtering and pagination
   */
  static async list(options: ListMemoriesOptions = {}): Promise<MemoryRecord[]> {
    const db = getDB();
    const {
      userId,
      includeDeleted = false,
      limit,
      offset = 0,
      sortBy = 'sortOrder',
      sortDirection = 'asc',
    } = options;
    
    // Get all records first, then filter in memory
    // This is simpler and works with null userId and boolean filters
    let results: MemoryRecord[];
    
    if (userId !== undefined) {
      if (userId === null) {
        // IndexedDB keys cannot be null; filter in memory for demo data
        results = (await db.memories.toArray()).filter((r) => r.userId === null);
      } else {
        // Query for specific user
        results = await db.memories.where('userId').equals(userId).toArray();
      }
    } else {
      // Get all records
      results = await db.memories.toArray();
    }
    
    // Filter deleted items if needed
    if (!includeDeleted) {
      results = results.filter((r) => !r.isDeleted);
    }
    
    // Manual sorting
    results.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    // Apply offset
    if (offset > 0) {
      results = results.slice(offset);
    }
    
    // Apply limit
    if (limit !== undefined && limit > 0) {
      results = results.slice(0, limit);
    }
    
    return results;
  }

  /**
   * Update memory by ID
   */
  static async update(id: string, input: UpdateMemoryInput): Promise<MemoryRecord | undefined> {
    const db = getDB();
    const existing = await db.memories.get(id);
    
    if (!existing || existing.isDeleted) {
      return undefined;
    }
    
    const now = new Date().toISOString();
    const updated: MemoryRecord = {
      ...existing,
      ...input,
      updatedAt: now,
      localVersion: existing.localVersion + 1,
      syncStatus: 'pending',
    };
    
    await db.memories.put(updated);
    return updated;
  }

  /**
   * Soft delete memory by ID
   */
  static async delete(id: string): Promise<boolean> {
    const db = getDB();
    const existing = await db.memories.get(id);
    
    if (!existing || existing.isDeleted) {
      return false;
    }
    
    const now = new Date().toISOString();
    await db.memories.put({
      ...existing,
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
      localVersion: existing.localVersion + 1,
      syncStatus: 'pending',
    });
    
    return true;
  }

  /**
   * Hard delete memory by ID (permanent)
   */
  static async hardDelete(id: string): Promise<boolean> {
    const db = getDB();
    await db.memories.delete(id);
    return true;
  }

  /**
   * Bulk upsert (create or update) memories
   * Used for syncing from remote
   */
  static async bulkUpsert(records: MemoryRecord[]): Promise<void> {
    const db = getDB();
    await db.memories.bulkPut(records);
  }

  /**
   * Count memories
   */
  static async count(options: { userId?: string | null; includeDeleted?: boolean } = {}): Promise<number> {
    const db = getDB();
    const { userId, includeDeleted = false } = options;

    let results: MemoryRecord[];

    if (userId !== undefined) {
      // IndexedDB/Dexie keys cannot be null; filter in memory for null userId
      if (userId === null) {
        results = (await db.memories.toArray()).filter((r) => r.userId === null);
      } else {
        results = await db.memories.where('userId').equals(userId).toArray();
      }
    } else {
      results = await db.memories.toArray();
    }

    if (!includeDeleted) {
      results = results.filter((r) => !r.isDeleted);
    }

    return results.length;
  }

  /**
   * Get memories that need syncing
   */
  static async getPendingSync(): Promise<MemoryRecord[]> {
    const db = getDB();
    return db.memories.where('syncStatus').equals('pending').toArray();
  }

  /**
   * Mark memory as synced
   */
  static async markAsSynced(id: string, remoteVersion?: number): Promise<void> {
    const db = getDB();
    const existing = await db.memories.get(id);
    
    if (!existing) return;
    
    await db.memories.put({
      ...existing,
      syncStatus: 'synced',
      lastSyncAt: new Date().toISOString(),
      syncError: null,
      remoteVersion: remoteVersion ?? existing.localVersion,
    });
  }

  /**
   * Mark memory as sync error
   */
  static async markAsSyncError(id: string, error: string): Promise<void> {
    const db = getDB();
    const existing = await db.memories.get(id);
    
    if (!existing) return;
    
    await db.memories.put({
      ...existing,
      syncStatus: 'error',
      syncError: error,
      lastSyncAt: new Date().toISOString(),
    });
  }

  /**
   * Clear all memories (useful for logout)
   */
  static async clear(userId?: string): Promise<void> {
    const db = getDB();
    
    if (userId) {
      // Only clear for specific user
      await db.memories.where('userId').equals(userId).delete();
    } else {
      // Clear all
      await db.memories.clear();
    }
  }

  /**
   * Update sort order for multiple memories
   */
  static async updateSortOrder(updates: Array<{ id: string; sortOrder: number }>): Promise<void> {
    const db = getDB();
    const now = new Date().toISOString();
    
    await db.transaction('rw', db.memories, async () => {
      for (const { id, sortOrder } of updates) {
        const existing = await db.memories.get(id);
        if (existing) {
          await db.memories.put({
            ...existing,
            sortOrder,
            updatedAt: now,
            localVersion: existing.localVersion + 1,
            syncStatus: 'pending',
          });
        }
      }
    });
  }
}
