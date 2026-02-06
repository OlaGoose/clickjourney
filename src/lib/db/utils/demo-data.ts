/**
 * Demo data initialization
 * Populates IndexedDB with demo memories for non-authenticated users
 */

import { MemoryRepository } from '../repositories/memory-repository';
import { getDB } from '../core/schema';
import { getDemoGallerySlice } from '@/lib/storage/demo-gallery';
import type { MemoryRecord } from '../core/schema';

/** Demo locations with coordinates */
const DEMO_COORDS = [
  { lat: 40.7128, lng: -74.006, name: 'New York', country: 'USA' },
  { lat: 51.5074, lng: -0.1278, name: 'London', country: 'UK' },
  { lat: 35.6762, lng: 139.6503, name: 'Tokyo', country: 'Japan' },
  { lat: 48.8566, lng: 2.3522, name: 'Paris', country: 'France' },
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

const DEMO_DESCRIPTIONS = [
  'A weekend in New York: skyline views, street food, and late-night walks through Manhattan. This memory is where the journey really began.',
  'London calling: fish and chips by the Thames, the sound of Big Ben, and rain that made every café feel like home.',
  'Tokyo nights: neon lights, ramen alleys, and the quiet of a temple garden. A city that never stops, but still finds peace.',
  'Paris in spring: croissants at dawn, the Eiffel Tower at golden hour, and wine by the Seine. La vie en rose, for real.',
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

const DEMO_TITLES = [
  'Severance',
  'Ted Lasso',
  'Foundation',
  'The Morning Show',
  'California Dreams',
  'Sydney Harbor',
  'Roman Holiday',
  'Berlin Stories',
  'Mexico Vibes',
  'Hong Kong Nights',
  'Brazilian Beat',
  'Moscow Winter',
  'Delhi Spice',
];

const DEMO_COLORS = [
  'rgb(44, 62, 80)',
  'rgb(41, 128, 185)',
  'rgb(142, 68, 173)',
  'rgb(192, 57, 43)',
  'rgb(39, 174, 96)',
  'rgb(230, 126, 34)',
  'rgb(52, 73, 94)',
  'rgb(155, 89, 182)',
  'rgb(22, 160, 133)',
  'rgb(241, 196, 15)',
  'rgb(231, 76, 60)',
  'rgb(46, 204, 113)',
  'rgb(243, 156, 18)',
];

const MOCK_CARD_IMAGES = [1015, 1016, 1018, 1019, 1020, 1021, 1022, 1023, 1024, 1025, 1026, 1027, 1028];

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
 * Initialize demo data in IndexedDB
 * Only creates if no demo data exists
 */
export async function initializeDemoData(): Promise<void> {
  try {
    // Check if demo data already exists
    if (await hasDemoData()) {
      return;
    }

    const now = new Date().toISOString();
    const demoRecords: Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    // Create demo memories
    for (let i = 0; i < Math.min(DEMO_TITLES.length, DEMO_COORDS.length); i++) {
      const coord = DEMO_COORDS[i];
      const galleryCount = i < 9 ? i : 4; // First 9 have 0-8 images, rest have 4

      demoRecords.push({
        userId: null,
        title: DEMO_TITLES[i],
        subtitle: 'Memory',
        imageUrl: `https://picsum.photos/id/${MOCK_CARD_IMAGES[i % MOCK_CARD_IMAGES.length]}/600/400`,
        color: DEMO_COLORS[i % DEMO_COLORS.length],
        chord: [220, 261.63, 329.63],
        detailTitle: null,
        category: null,
        galleryUrls: getDemoGallerySlice(galleryCount),
        description: DEMO_DESCRIPTIONS[i],
        richContent: `<p>${DEMO_DESCRIPTIONS[i]}</p>`,
        audioUrls: [],
        videoUrls: [],
        lat: coord.lat,
        lng: coord.lng,
        placeName: coord.name,
        placeAddress: `${coord.name}, ${coord.country}`,
        sortOrder: i,
        isJourneyStart: false,
        isJourneyEnd: false,
        syncStatus: 'synced',
        lastSyncAt: now,
        syncError: null,
        localVersion: 1,
        remoteVersion: 1,
        isDeleted: false,
        deletedAt: null,
      });
    }

    // Bulk insert demo data
    for (const record of demoRecords) {
      await MemoryRepository.create(record);
    }

    console.log(`Initialized ${demoRecords.length} demo memories`);
  } catch (e) {
    console.error('Failed to initialize demo data:', e);
  }
}

/**
 * Clear demo data
 */
export async function clearDemoData(): Promise<void> {
  try {
    // Clear all records with null userId (demo data)
    const db = getDB();
    const demoRecords = await db.memories.where('userId').equals(null as never).toArray();
    for (const record of demoRecords) {
      await db.memories.delete(record.id);
    }
  } catch (e) {
    console.error('Failed to clear demo data:', e);
  }
}
