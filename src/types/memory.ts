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

export interface CarouselItem {
  id: string;
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
