export type LayoutType = 'full_bleed' | 'side_by_side' | 'immersive_focus' | 'reflection_end';

export interface StoryBlock {
  id: string;
  layout: LayoutType;
  image?: string; // URL or Base64
  text: string;
  animation?: string;
}

export interface DirectorScript {
  title: string;
  location: string;
  blocks: StoryBlock[];
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
