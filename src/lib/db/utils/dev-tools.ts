/**
 * Development tools for testing and debugging
 * Only available in development mode
 */

import { MemoryRepository } from '../repositories/memory-repository';
import { SyncEngine } from '../sync/sync-engine';
import { getDB, closeDB, deleteDB } from '../core/schema';
import { initializeDemoData, clearDemoData } from './demo-data';
import { isDevelopment } from './environment';

/**
 * Development tools interface
 * Exposed globally in dev mode for console access
 */
export interface DevTools {
  // Database operations
  getDB: typeof getDB;
  closeDB: typeof closeDB;
  deleteDB: typeof deleteDB;
  
  // Demo data
  initDemo: typeof initializeDemoData;
  clearDemo: typeof clearDemoData;
  
  // Repository access
  memory: typeof MemoryRepository;
  
  // Sync operations
  sync: {
    pull: typeof SyncEngine.pull;
    push: typeof SyncEngine.push;
    full: typeof SyncEngine.sync;
    status: typeof SyncEngine.getSyncStatus;
    start: typeof SyncEngine.startAutoSync;
    stop: typeof SyncEngine.stopAutoSync;
  };
  
  // Utilities
  utils: {
    count: () => Promise<number>;
    list: () => Promise<unknown[]>;
    clear: (userId?: string) => Promise<void>;
    export: () => Promise<unknown>;
    import: (data: unknown) => Promise<void>;
  };
}

/**
 * Create development tools instance
 */
function createDevTools(): DevTools {
  return {
    getDB,
    closeDB,
    deleteDB,
    initDemo: initializeDemoData,
    clearDemo: clearDemoData,
    memory: MemoryRepository,
    sync: {
      pull: SyncEngine.pull.bind(SyncEngine),
      push: SyncEngine.push.bind(SyncEngine),
      full: SyncEngine.sync.bind(SyncEngine),
      status: SyncEngine.getSyncStatus.bind(SyncEngine),
      start: SyncEngine.startAutoSync.bind(SyncEngine),
      stop: SyncEngine.stopAutoSync.bind(SyncEngine),
    },
    utils: {
      count: async () => {
        return MemoryRepository.count();
      },
      list: async () => {
        return MemoryRepository.list();
      },
      clear: async (userId?: string) => {
        await MemoryRepository.clear(userId);
      },
      export: async () => {
        const memories = await MemoryRepository.list();
        const db = getDB();
        const metadata = await db.metadata.toArray();
        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          memories,
          metadata,
        };
      },
      import: async (data: unknown) => {
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid import data');
        }
        
        const typedData = data as {
          memories?: unknown[];
          metadata?: unknown[];
        };
        
        if (Array.isArray(typedData.memories)) {
          await MemoryRepository.bulkUpsert(typedData.memories as never);
        }
        
        if (Array.isArray(typedData.metadata)) {
          const db = getDB();
          await db.metadata.bulkPut(typedData.metadata as never);
        }
      },
    },
  };
}

let _devToolsInstalled = false;

/**
 * Install development tools globally (once per session)
 * Call this in _app or layout to enable dev tools
 */
export function installDevTools(): void {
  if (!isDevelopment() || typeof window === 'undefined') {
    return;
  }
  if (_devToolsInstalled) {
    return;
  }
  _devToolsInstalled = true;

  // Attach to window for console access
  const devTools = createDevTools();
  (window as typeof window & { orbitDB?: DevTools }).orbitDB = devTools;

  console.log(
    '%c🛠️ Orbit Journey Dev Tools',
    'font-size: 16px; font-weight: bold; color: #0071e3;'
  );
  console.log('Access via: window.orbitDB');
  console.log('Examples:');
  console.log('  - orbitDB.utils.count()');
  console.log('  - orbitDB.utils.list()');
  console.log('  - orbitDB.initDemo()');
  console.log('  - orbitDB.sync.status()');
  console.log('  - orbitDB.utils.export()');
}

/**
 * Seed test data for development
 */
export async function seedTestData(userId: string, count: number = 10): Promise<void> {
  if (!isDevelopment()) {
    throw new Error('Test data seeding only available in development');
  }

  const colors = [
    'rgb(44, 62, 80)',
    'rgb(41, 128, 185)',
    'rgb(142, 68, 173)',
    'rgb(192, 57, 43)',
    'rgb(39, 174, 96)',
  ];

  for (let i = 0; i < count; i++) {
    await MemoryRepository.create({
      userId,
      title: `Test Memory ${i + 1}`,
      subtitle: 'Test',
      imageUrl: `https://picsum.photos/id/${1000 + i}/600/400`,
      color: colors[i % colors.length],
      chord: [220, 261.63, 329.63],
      detailTitle: null,
      category: 'test',
      galleryUrls: [],
      description: `This is test memory number ${i + 1}`,
      richContent: `<p>This is test memory number ${i + 1}</p>`,
      audioUrls: [],
      videoUrls: [],
      lat: 40.7128 + Math.random() * 10,
      lng: -74.006 + Math.random() * 10,
      placeName: `Test Location ${i + 1}`,
      placeAddress: null,
      sortOrder: i,
      isJourneyStart: false,
      isJourneyEnd: false,
    });
  }

  console.log(`✅ Seeded ${count} test memories for user ${userId}`);
}

/**
 * Performance testing utilities
 */
export const perfTools = {
  /**
   * Test bulk insert performance
   */
  async testBulkInsert(count: number = 1000): Promise<{ duration: number; recordsPerSecond: number }> {
    if (!isDevelopment()) {
      throw new Error('Performance testing only available in development');
    }

    const start = performance.now();
    
    const records = Array.from({ length: count }, (_, i) => ({
      userId: 'perf-test',
      title: `Perf Test ${i}`,
      subtitle: 'Perf',
      imageUrl: 'https://picsum.photos/600/400',
      color: 'rgb(44, 62, 80)',
      chord: [220, 261.63, 329.63],
      detailTitle: null,
      category: 'perf',
      galleryUrls: [],
      description: `Performance test record ${i}`,
      richContent: `<p>Performance test record ${i}</p>`,
      audioUrls: [],
      videoUrls: [],
      lat: null,
      lng: null,
      placeName: null,
      placeAddress: null,
      sortOrder: i,
      isJourneyStart: false,
      isJourneyEnd: false,
    }));

    for (const record of records) {
      await MemoryRepository.create(record);
    }

    const end = performance.now();
    const duration = end - start;
    const recordsPerSecond = (count / duration) * 1000;

    console.log(`✅ Inserted ${count} records in ${duration.toFixed(2)}ms`);
    console.log(`   ${recordsPerSecond.toFixed(0)} records/second`);

    // Cleanup
    await MemoryRepository.clear('perf-test');

    return { duration, recordsPerSecond };
  },

  /**
   * Test query performance
   */
  async testQueryPerformance(iterations: number = 100): Promise<{ avgDuration: number }> {
    if (!isDevelopment()) {
      throw new Error('Performance testing only available in development');
    }

    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await MemoryRepository.list({ limit: 50 });
      const end = performance.now();
      durations.push(end - start);
    }

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    console.log(`✅ Average query time: ${avgDuration.toFixed(2)}ms over ${iterations} iterations`);

    return { avgDuration };
  },
};
