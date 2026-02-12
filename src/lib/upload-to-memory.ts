/*
 * @Author: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @Date: 2026-02-08 10:13:13
 * @LastEditors: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @LastEditTime: 2026-02-08 14:15:34
 * @FilePath: /orbit-journey-next/src/lib/upload-to-memory.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
'use client';

import type { DirectorScript } from '@/types/cinematic';
import type { NewMemoryInput, LocationData } from '@/types/memory';

const DEFAULT_CHORD = [196, 246.94, 293.66];
const DEFAULT_COLOR = 'rgb(44, 62, 80)';

/** Known location names (normalized lower) to approximate coordinates for globe + title sync on homepage. */
const LOCATION_COORDINATES: Array<{ keys: string[]; lat: number; lng: number; name: string }> = [
  { keys: ['日本', 'japan', '日本国'], lat: 35.6762, lng: 139.6503, name: 'Japan' },
  { keys: ['东京', 'tokyo', '東京都'], lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
  { keys: ['京都', 'kyoto'], lat: 35.0116, lng: 135.7681, name: 'Kyoto' },
  { keys: ['大阪', 'osaka'], lat: 34.6937, lng: 135.5023, name: 'Osaka' },
  { keys: ['北海道', 'hokkaido'], lat: 43.0646, lng: 141.3469, name: 'Hokkaido' },
  { keys: ['纽约', 'new york', 'nyc'], lat: 40.7128, lng: -74.006, name: 'New York' },
  { keys: ['伦敦', 'london'], lat: 51.5074, lng: -0.1278, name: 'London' },
  { keys: ['巴黎', 'paris'], lat: 48.8566, lng: 2.3522, name: 'Paris' },
  { keys: ['香港', 'hong kong'], lat: 22.3193, lng: 114.1694, name: 'Hong Kong' },
  { keys: ['上海', 'shanghai'], lat: 31.2304, lng: 121.4737, name: 'Shanghai' },
  { keys: ['北京', 'beijing'], lat: 39.9042, lng: 116.4074, name: 'Beijing' },
];

/** Resolve lat/lng/name from a location string (for globe and Memory storage). */
export function resolveCoordinatesForLocation(locationStr: string): LocationData {
  const normalized = locationStr.trim().toLowerCase();
  if (!normalized) {
    return { lat: 0, lng: 0, name: locationStr || 'Unknown' };
  }
  for (const entry of LOCATION_COORDINATES) {
    const matched = entry.keys.some((k) => normalized.includes(k.toLowerCase()));
    if (matched) {
      return { lat: entry.lat, lng: entry.lng, name: locationStr.trim(), country: entry.name };
    }
  }
  return { lat: 0, lng: 0, name: locationStr.trim() };
}

/**
 * Convert upload-generated DirectorScript to a CarouselItem (NewMemoryInput).
 * Uses AI-provided lat/lng when present, else fallback from script.location for globe/title sync.
 */
export function directorScriptToCarouselItem(script: DirectorScript): NewMemoryInput {
  const firstBlock = script.blocks[0];
  const image = firstBlock?.image ?? '';
  const description = firstBlock?.text ?? script.title;
  const coordinates =
    typeof script.latitude === 'number' && typeof script.longitude === 'number'
      ? {
          lat: script.latitude,
          lng: script.longitude,
          name: script.location?.trim() || 'Unknown',
        }
      : resolveCoordinatesForLocation(script.location);
  return {
    type: 'cinematic',
    title: script.title,
    subtitle: script.location,
    image,
    color: DEFAULT_COLOR,
    chord: DEFAULT_CHORD,
    detailTitle: script.location,
    category: 'Cinematic',
    description: description.length > 80 ? description.slice(0, 80) + '…' : description,
    gallery: script.blocks.map((b) => b.image).filter(Boolean) as string[],
    coordinates,
  };
}
