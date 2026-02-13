/**
 * Vlog / Cinematic Moments data shape.
 * location: shown on first frame; images, audio, subtitles, filter, YouTube IDs for playback.
 */
export interface VlogData {
  location: string;
  images: string[];
  /** Local video blob URLs (uploaded in step 1 alongside images). */
  videos: string[];
  /** Soundtrack (uploaded file), loops during playback. */
  audio: string | null;
  /** User-recorded voice, plays once; overlaps with soundtrack if both present. */
  recordedAudio: string | null;
  subtitles: string[];
  filterPreset: string;
  youtubeIds: string[];
}

/** Number of steps before play (location → photos+music → script+style). */
export const VLOG_STEP_COUNT = 3;

export const TRANSITION_DURATION = 1.5;
export const SLIDE_DURATION = 6;

export interface FilterPreset {
  name: string;
  className: string;
  overlayColor: string;
  description: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    name: 'Original',
    className: '',
    overlayColor: 'bg-transparent',
    description: 'Pure, untouched reality.',
  },
  {
    name: "Hollywood '95",
    className: 'contrast-[1.15] saturate-[1.2] sepia-[0.15] brightness-95',
    overlayColor: 'bg-orange-500/10 mix-blend-overlay',
    description: 'Warm, high contrast Kodak Vision3 aesthetic.',
  },
  {
    name: 'Chungking Express',
    className: 'contrast-[1.25] saturate-[1.3] brightness-90 hue-rotate-[-10deg]',
    overlayColor: 'bg-emerald-600/20 mix-blend-hard-light',
    description: 'Neon-soaked, moody Hong Kong nights.',
  },
  {
    name: 'Film Noir',
    className: 'grayscale contrast-[1.3] brightness-[0.9]',
    overlayColor: 'bg-black/10 mix-blend-multiply',
    description: 'Classic black and white mystery and shadow.',
  },
  {
    name: 'Wes Anderson',
    className: 'saturate-[1.4] contrast-[1.1] brightness-[1.05] sepia-[0.1]',
    overlayColor: 'bg-yellow-200/20 mix-blend-overlay',
    description: 'Symmetrical, pastel, and whimsical warmth.',
  },
  {
    name: 'Tokyo Love Story',
    className: 'contrast-[0.9] brightness-[1.1] saturate-[0.8] hue-rotate-[5deg]',
    overlayColor: 'bg-blue-300/15 mix-blend-screen',
    description: 'Soft, overexposed, nostalgic Japanese drama.',
  },
  {
    name: 'Cyberpunk 2077',
    className: 'contrast-[1.2] saturate-[1.4] brightness-[0.95] hue-rotate-[15deg]',
    overlayColor: 'bg-fuchsia-500/15 mix-blend-screen',
    description: 'Neon lights, high-tech rain, dystopia.',
  },
  {
    name: "Amélie's World",
    className: 'saturate-[1.3] contrast-[1.1] sepia-[0.4] hue-rotate-[-30deg]',
    overlayColor: 'bg-green-500/10 mix-blend-overlay',
    description: 'Magical realism with distinctive green/red tints.',
  },
  {
    name: 'Vintage VHS',
    className: 'contrast-[1.1] saturate-[0.7] sepia-[0.3] brightness-[0.85]',
    overlayColor: 'bg-yellow-900/10 mix-blend-multiply',
    description: 'Faded, scanlines, magnetic tape noise.',
  },
];

export const VLOG_SESSION_KEY = 'vlog-playback-data';
