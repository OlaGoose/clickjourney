export type LayoutType = 
  | 'full_bleed'           // Full screen epic opener
  | 'side_by_side'         // Editorial split layout
  | 'immersive_focus'      // Centered dramatic moment
  | 'hero_split'           // Asymmetric split with large text
  | 'magazine_spread'      // Two-page magazine style
  | 'portrait_feature'     // Vertical portrait emphasis
  | 'minimal_caption'      // Large image, minimal text
  | 'text_overlay';        // Text directly on image

export interface StoryBlock {
  id: string;
  layout: LayoutType;
  image?: string; // URL or Base64
  text: string;
  animation?: string;
  // Enhanced metadata for better rendering
  textPosition?: 'top' | 'bottom' | 'center' | 'left' | 'right' | 'overlay';
  textSize?: 'small' | 'medium' | 'large' | 'huge';
  imageFilter?: 'none' | 'grayscale' | 'warm' | 'cool' | 'vibrant' | 'muted';
  mood?: string; // For contextual styling
}

/** Chapter header style: number+mood, minimal line, or roman+quote. */
export type ChapterDividerStyle = 'number_mood' | 'minimal_line' | 'roman_quote';

export interface DirectorScript {
  title: string;
  location: string;
  /** Optional display date for title section (e.g. "2026年2月13日" or ISO). */
  date?: string;
  /** Optional coordinates from AI (decimal degrees) for globe/location sync */
  latitude?: number;
  longitude?: number;
  blocks: StoryBlock[];
  /** Chapter divider template: number_mood (default), minimal_line, roman_quote. */
  chapterDividerStyle?: ChapterDividerStyle;
  /** Ending section: quote text. */
  endingQuote?: string;
  /** Ending section: CTA label (e.g. "创建新旅程"). */
  endingCtaLabel?: string;
  /** Ending section: CTA href (default /memories/upload). */
  endingCtaHref?: string;
}

// AI Service Types
export enum AspectRatio {
  RATIO_1_1 = "1:1",
  RATIO_3_4 = "3:4",
  RATIO_4_3 = "4:3",
  RATIO_9_16 = "9:16",
  RATIO_16_9 = "16:9",
  RATIO_21_9 = "21:9"
}

export enum ImageSize {
  SIZE_1K = "1K",
  SIZE_2K = "2K",
  SIZE_4K = "4K"
}

export enum AudioVoice {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Aoede = 'Aoede'
}
