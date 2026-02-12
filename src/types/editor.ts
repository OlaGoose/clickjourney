/**
 * Travel Editor Types
 * Types for the travel content editor
 */

import type { LayoutType } from './cinematic';

export type ContentBlockType = 'text' | 'image' | 'video' | 'audio' | 'richtext' | 'cinematic' | 'section';

/** Apple-style section template IDs (promotional/section blocks). */
export type SectionTemplateId =
  | 'tile_gallery'
  | 'feature_card'
  | 'marquee';

/** CTA link for section blocks. */
export interface SectionCta {
  label: string;
  href?: string;
}

/** Dynamic content for section blocks (per-template shapes). */
export interface SectionBlockData {
  tile_gallery?: {
    sectionHeadline?: string;
    /** When true (default), show infinite marquee animation; when false, static horizontal scroll. */
    marqueeAnimate?: boolean;
    tiles: Array<{
      eyebrow?: string;
      title: string;
      copy: string;
      ctaLabel: string;
      ctaHref?: string;
    }>;
  };
  feature_card?: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    image?: string;
    ctaLabel: string;
    ctaHref?: string;
  };
  marquee?: {
    /** When true (default), show infinite marquee animation; when false, static horizontal scroll. */
    marqueeAnimate?: boolean;
    items: Array<{
      image: string;
      title: string;
      ctaLabel?: string;
      href?: string;
    }>;
  };
}

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
    /** Section block: template id (tile_gallery, feature_card, etc.). */
    sectionTemplateId?: SectionTemplateId;
    /** Section block: dynamic content for the chosen template. */
    sectionData?: SectionBlockData;
    /** When true, render the block with a visible border (all block types). */
    showBorder?: boolean;
    /** Text/richtext block: alignment. */
    textAlign?: 'left' | 'center' | 'right';
    /** Text/richtext block: size preset. */
    fontSize?: 'small' | 'medium' | 'large';
    /** Text/richtext block: CSS color (hex or named). */
    textColor?: string;
  };
}

/** Title style for the editor page title (stored in TravelEditorData). */
export interface TitleStyle {
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: 'small' | 'medium' | 'large';
  textColor?: string;
}

/** Image block display: grid = PhotoGrid layout, gallery = upload-page polaroid layout */
export type ImageDisplayMode = 'grid' | 'gallery';

export interface TravelEditorData {
  title: string;
  /** Style for the title (alignment, size, color). */
  titleStyle?: TitleStyle;
  description: string;
  /** Style for the description (alignment, size, color). */
  descriptionStyle?: TitleStyle;
  /** Travel/location name for this memory (e.g. city or place); shown in editor and stored in Memory. */
  location?: string;
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
