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
  description?: string;
  price?: string;
  rating?: number;
  coordinates?: LocationData;
}
