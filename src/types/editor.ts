/**
 * Travel Editor Types
 * Types for the travel content editor
 */

import type { LayoutType } from './cinematic';

export type ContentBlockType = 'text' | 'image' | 'video' | 'audio' | 'richtext' | 'cinematic';

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content: string;
  order: number;
  metadata?: {
    duration?: number; // For video/audio
    thumbnail?: string; // For video
    fileName?: string;
    /** Multiple image URLs for image block (1–6). When set, content may be first image for backward compat. */
    images?: string[];
    /** How to display images: grid (PhotoGrid) or gallery (upload-style polaroid). */
    imageDisplayMode?: ImageDisplayMode;
    /** Cinematic block: layout from cinematic templates (full_bleed, hero_split, etc.). */
    cinematicLayout?: LayoutType;
    /** Cinematic block: single image URL for the block. */
    cinematicImage?: string;
    /** Cinematic block: optional image filter. */
    imageFilter?: 'none' | 'grayscale' | 'warm' | 'cool' | 'vibrant' | 'muted';
    /** Cinematic block: optional mood label. */
    mood?: string;
  };
}

/** Image block display: grid = PhotoGrid layout, gallery = upload-page polaroid layout */
export type ImageDisplayMode = 'grid' | 'gallery';

export interface TravelEditorData {
  title: string;
  description: string;
  /** @deprecated No longer used; images come from image blocks. Kept for draft migration. */
  images?: string[];
  blocks: ContentBlock[];
}

export interface EditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  block: ContentBlock | null;
  onSave: (block: ContentBlock) => void;
  onDelete: () => void;
}

export interface ContentBlockProps {
  block: ContentBlock;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
}
