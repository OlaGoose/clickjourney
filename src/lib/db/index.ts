/**
 * Orbit Journey Database
 * Main entry point for IndexedDB operations
 */

// Core
export { getDB, closeDB, deleteDB, DB_NAME, DB_VERSION } from './core/schema';
export type { MemoryRecord, SyncQueueItem, AppMetadata } from './core/schema';

// Repository
export { MemoryRepository } from './repositories/memory-repository';
export type { CreateMemoryInput, UpdateMemoryInput, ListMemoriesOptions } from './repositories/memory-repository';

// Sync
export { SyncEngine } from './sync/sync-engine';
export type { SyncResult } from './sync/sync-engine';

// Service
export { MemoryService, carouselItemToMemoryRecord, memoryRecordToCarouselItem } from './services/memory-service';

// Hooks
export { useMemories, useMemory } from './hooks/useMemories';
export type { UseMemoriesResult } from './hooks/useMemories';

// Utils
export { initializeDemoData, hasDemoData, clearDemoData } from './utils/demo-data';
export {
  isDevelopment,
  isProduction,
  isMockAuthEnabled,
  isServer,
  isBrowser,
  isSupabaseConfigured,
  getSyncConfig,
  getStorageConfig,
  logEnvironmentInfo,
} from './utils/environment';
export type { SyncConfig, StorageConfig } from './utils/environment';

// Dev Tools (only in development)
export { installDevTools, seedTestData, perfTools } from './utils/dev-tools';
export type { DevTools } from './utils/dev-tools';
