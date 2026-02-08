/**
 * Orbit Journey - Memory & UI types
 * Mirrors orbit-travel-memory types with DB-friendly shape.
 */

export interface LocationData {
  lat: number;
  lng: number;
  name: string;
  region?: string;
  country?: string;
  address?: string;
}

export interface GroundingChunk {
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: {
      reviewSnippets?: { content?: string }[];
    }[];
  };
  web?: { uri?: string; title?: string };
}

export interface GeminiResponse {
  text: string;
  groundingChunks?: GroundingChunk[];
}

export enum ViewState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  INFO = 'INFO',
}

/**
 * Memory types for discriminated union rendering
 * - photo-gallery: Photo collection with description
 * - cinematic: AI-generated cinematic story with director script
 * - rich-story: Rich text content (markdown/HTML)
 * - video: Video memory collection
 */
export type MemoryType = 'photo-gallery' | 'cinematic' | 'rich-story' | 'video';

export interface CarouselItem {
  id: string;
  /** Memory type for discriminated rendering; inferred from content if not set (backward compat) */
  type?: MemoryType;
  title: string;
  subtitle: string;
  image: string;
  color: string;
  chord: number[];
  detailTitle?: string;
  category?: string;
  gallery?: string[];
  /** Short label (e.g. JOURNEY START) or long callout/description for this memory */
  description?: string;
  /** Rich text HTML content for the full memory story */
  richContent?: string;
  /** Optional audio URL for this memory; callout play button uses it when set */
  audioUrl?: string;
  /** Audio files uploaded by user */
  audioUrls?: string[];
  /** Video files uploaded by user */
  videoUrls?: string[];
  /** Avatar seeds for journey participants (e.g. for DiceBear); drives header avatars when set */
  participants?: string[];
  price?: string;
  rating?: number;
  coordinates?: LocationData;
}

/** Input for creating a new memory (no id yet). */
export type NewMemoryInput = Omit<CarouselItem, 'id'>;

/**
 * Infer memory type from content for backward compatibility
 * Used when type field is not explicitly set
 */
export function inferMemoryType(item: CarouselItem): MemoryType {
  if (item.type) return item.type;
  if (item.videoUrls && item.videoUrls.length > 0) return 'video';
  if (item.richContent && item.richContent.replace(/<[^>]+>/g, '').trim().length > 50) return 'rich-story';
  return 'photo-gallery';
}
