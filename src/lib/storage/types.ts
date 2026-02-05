import type { CarouselItem, LocationData } from '@/types';

/** DB row shape for travel_memories */
export interface TravelMemoryRow {
  id: string;
  user_id: string | null;
  title: string;
  subtitle: string;
  image_url: string;
  color: string;
  chord: number[];
  detail_title: string | null;
  category: string | null;
  gallery_urls: string[];
  description: string | null;
  lat: number | null;
  lng: number | null;
  place_name: string | null;
  sort_order: number;
  is_journey_start: boolean;
  is_journey_end: boolean;
  created_at: string;
  updated_at: string;
}

export function rowToCarouselItem(row: TravelMemoryRow): CarouselItem {
  const coords: LocationData | undefined =
    row.lat != null && row.lng != null
      ? { lat: row.lat, lng: row.lng, name: row.place_name ?? '' }
      : undefined;
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    image: row.image_url,
    color: row.color,
    chord: Array.isArray(row.chord) ? row.chord : [],
    detailTitle: row.detail_title ?? undefined,
    category: row.category ?? undefined,
    gallery: Array.isArray(row.gallery_urls) ? row.gallery_urls : [],
    description: row.description ?? undefined,
    coordinates: coords,
  };
}

export function carouselItemToRow(
  item: Partial<CarouselItem> & { title: string; subtitle: string; image: string; color: string },
  userId: string | null,
  opts: { sortOrder?: number; isJourneyStart?: boolean; isJourneyEnd?: boolean } = {}
): Omit<TravelMemoryRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    title: item.title,
    subtitle: item.subtitle,
    image_url: item.image,
    color: item.color,
    chord: Array.isArray(item.chord) ? item.chord : [130.81, 196, 261.63],
    detail_title: item.detailTitle ?? null,
    category: item.category ?? null,
    gallery_urls: Array.isArray(item.gallery) ? item.gallery : [],
    description: item.description ?? null,
    lat: item.coordinates?.lat ?? null,
    lng: item.coordinates?.lng ?? null,
    place_name: item.coordinates?.name ?? null,
    sort_order: opts.sortOrder ?? 0,
    is_journey_start: opts.isJourneyStart ?? false,
    is_journey_end: opts.isJourneyEnd ?? false,
  };
}
