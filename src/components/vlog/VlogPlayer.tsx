'use client';

import { useEffect, useLayoutEffect, useState, useRef, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SLIDE_DURATION,
  TRANSITION_DURATION,
  FILTER_PRESETS,
  type VlogData,
} from '@/types/vlog';
import { Play, Volume2, VolumeX, X } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

type PlaylistItem =
  | { type: 'image'; src: string }
  | { type: 'video'; src: string }
  | { type: 'youtube'; id: string };

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, number | string>;
          events?: { onReady?: (ev: { target: YTPlayer }) => void };
        }
      ) => YTPlayer;
      PlayerState?: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
}

/** ========================================
 *  CINEMATIC THEME SYSTEM
 *  Each LUT has unique transitions, subtitle styles, and visual effects
 *  based on film art best practices
 * ======================================== */

type AnimationVariant = {
  initial: Record<string, number | string>;
  animate: Record<string, number | string>;
  exit: Record<string, number | string>;
  transition: Record<string, any>;
};

type SubtitleStyle = {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  textColor: string;
  position: 'bottom-right' | 'bottom-center' | 'top-left' | 'center' | 'bottom-left';
  animation: 'fade-slide' | 'typewriter' | 'glitch' | 'bounce' | 'blur-in' | 'scale-rotate';
  textShadow: string;
  letterSpacing?: string;
  textTransform?: 'uppercase' | 'lowercase' | 'none';
  writingMode?: 'horizontal-tb' | 'vertical-rl';
};

type ThemeConfig = {
  name: string;
  variants: AnimationVariant[];
  subtitle: SubtitleStyle;
  effects: {
    vignette?: boolean;
    scanlines?: boolean;
    chromatic?: boolean;
    filmGrain?: 'light' | 'medium' | 'heavy';
    glow?: string;
  };
};

/** Original - Pure & Natural */
const ORIGINAL_VARIANTS: AnimationVariant[] = [
  {
    initial: { opacity: 0, scale: 1.05 },
    animate: { opacity: 1, scale: 1.0 },
    exit: { opacity: 0, scale: 1.02 },
    transition: {
      opacity: { duration: 1.2, ease: 'easeInOut' },
      scale: { duration: SLIDE_DURATION, ease: 'linear' },
    },
  },
  {
    initial: { opacity: 0, scale: 1.08 },
    animate: { opacity: 1, scale: 1.0 },
    exit: { opacity: 0, scale: 0.98 },
    transition: {
      opacity: { duration: 1.5, ease: 'easeInOut' },
      scale: { duration: SLIDE_DURATION, ease: 'linear' },
    },
  },
];

/** Hollywood '95 - Classic Cinema (Ken Burns) */
const HOLLYWOOD_VARIANTS: AnimationVariant[] = [
  {
    initial: { opacity: 0, scale: 1.15, x: '-5%', y: '-3%' },
    animate: { opacity: 1, scale: 1.0, x: '0%', y: '0%' },
    exit: { opacity: 0, scale: 0.95 },
    transition: {
      opacity: { duration: 2.0, ease: [0.25, 0.1, 0.25, 1] },
      scale: { duration: SLIDE_DURATION + 1.5, ease: 'linear' },
      x: { duration: SLIDE_DURATION + 1.5, ease: 'linear' },
      y: { duration: SLIDE_DURATION + 1.5, ease: 'linear' },
    },
  },
  {
    initial: { opacity: 0, scale: 1.12, x: '4%', y: '2%' },
    animate: { opacity: 1, scale: 1.0, x: '0%', y: '0%' },
    exit: { opacity: 0, scale: 1.05 },
    transition: {
      opacity: { duration: 1.8, ease: [0.33, 1, 0.68, 1] },
      scale: { duration: SLIDE_DURATION + 1, ease: 'linear' },
      x: { duration: SLIDE_DURATION + 1, ease: 'linear' },
      y: { duration: SLIDE_DURATION + 1, ease: 'linear' },
    },
  },
];

/** Chungking Express - Wong Kar-wai (Fast cuts, motion blur) */
const CHUNGKING_VARIANTS: AnimationVariant[] = [
  {
    initial: { opacity: 0, x: '15%', scale: 1.1, filter: 'blur(8px)' },
    animate: { opacity: 1, x: '0%', scale: 1.0, filter: 'blur(0px)' },
    exit: { opacity: 0, x: '-10%', filter: 'blur(4px)' },
    transition: {
      duration: 0.8,
      ease: [0.76, 0, 0.24, 1],
    },
  },
  {
    initial: { opacity: 0, y: '12%', scale: 1.08, filter: 'blur(6px)' },
    animate: { opacity: 1, y: '0%', scale: 1.0, filter: 'blur(0px)' },
    exit: { opacity: 0, scale: 0.95, filter: 'blur(3px)' },
    transition: {
      duration: 0.9,
      ease: [0.87, 0, 0.13, 1],
    },
  },
];

/** Film Noir - Hard cuts & dramatic shadows */
const NOIR_VARIANTS: AnimationVariant[] = [
  {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      opacity: { duration: 0.4, ease: 'easeInOut' },
    },
  },
  {
    initial: { opacity: 0, x: '-100%' },
    animate: { opacity: 1, x: '0%' },
    exit: { opacity: 0, x: '100%' },
    transition: {
      duration: 0.6,
      ease: [0.65, 0, 0.35, 1],
    },
  },
];

/** Wes Anderson - Symmetry & whimsy */
const WES_VARIANTS: AnimationVariant[] = [
  {
    initial: { opacity: 0, scale: 0.85, rotateY: 5 },
    animate: { opacity: 1, scale: 1.0, rotateY: 0 },
    exit: { opacity: 0, scale: 0.9, rotateY: -5 },
    transition: {
      duration: 1.4,
      ease: [0.34, 1.56, 0.64, 1],
    },
  },
  {
    initial: { opacity: 0, scale: 1.2, y: '5%' },
    animate: { opacity: 1, scale: 1.0, y: '0%' },
    exit: { opacity: 0, scale: 0.8, y: '-5%' },
    transition: {
      duration: 1.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
];

/** Tokyo Love Story - Soft & dreamy */
const TOKYO_VARIANTS: AnimationVariant[] = [
  {
    initial: { opacity: 0, scale: 1.1, filter: 'blur(12px)' },
    animate: { opacity: 1, scale: 1.0, filter: 'blur(0px)' },
    exit: { opacity: 0, filter: 'blur(8px)' },
    transition: {
      duration: 2.2,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  {
    initial: { opacity: 0, y: '8%', filter: 'blur(10px)' },
    animate: { opacity: 1, y: '0%', filter: 'blur(0px)' },
    exit: { opacity: 0, y: '-5%', filter: 'blur(6px)' },
    transition: {
      duration: 2.0,
      ease: [0.25, 1, 0.5, 1],
    },
  },
];

/** Cyberpunk 2077 - Glitch & neon */
const CYBERPUNK_VARIANTS: AnimationVariant[] = [
  {
    initial: { opacity: 0, x: '8%', scaleX: 1.02, filter: 'hue-rotate(20deg)' },
    animate: { opacity: 1, x: '0%', scaleX: 1.0, filter: 'hue-rotate(0deg)' },
    exit: { opacity: 0, x: '-5%', filter: 'hue-rotate(-10deg)' },
    transition: {
      duration: 0.7,
      ease: [0.9, 0.1, 0.5, 1],
    },
  },
  {
    initial: { opacity: 0, y: '-6%', scaleY: 1.05 },
    animate: { opacity: 1, y: '0%', scaleY: 1.0 },
    exit: { opacity: 0, scaleY: 0.98 },
    transition: {
      duration: 0.8,
      ease: [0.85, 0, 0.15, 1],
    },
  },
];

/** Amélie's World - Magical realism */
const AMELIE_VARIANTS: AnimationVariant[] = [
  {
    initial: { opacity: 0, scale: 0.9, rotate: -3 },
    animate: { opacity: 1, scale: 1.0, rotate: 0 },
    exit: { opacity: 0, scale: 1.05, rotate: 2 },
    transition: {
      duration: 1.6,
      ease: [0.68, -0.55, 0.265, 1.55],
    },
  },
  {
    initial: { opacity: 0, scale: 1.15, rotate: 4 },
    animate: { opacity: 1, scale: 1.0, rotate: 0 },
    exit: { opacity: 0, scale: 0.92, rotate: -3 },
    transition: {
      duration: 1.5,
      ease: [0.34, 1.56, 0.64, 1],
    },
  },
];

/** Vintage VHS - Tape glitch & tracking noise */
const VHS_VARIANTS: AnimationVariant[] = [
  {
    initial: { opacity: 0, x: '3%', scaleX: 0.98 },
    animate: { opacity: 1, x: '0%', scaleX: 1.0 },
    exit: { opacity: 0, x: '-2%', scaleX: 1.02 },
    transition: {
      duration: 1.0,
      ease: 'linear',
    },
  },
  {
    initial: { opacity: 0, y: '-4%' },
    animate: { opacity: 1, y: '0%' },
    exit: { opacity: 0, y: '3%' },
    transition: {
      duration: 1.1,
      ease: 'linear',
    },
  },
];

/** Theme configurations for each LUT */
const THEME_CONFIGS: Record<string, ThemeConfig> = {
  'Original': {
    name: 'Original',
    variants: ORIGINAL_VARIANTS,
    subtitle: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 'text-xl md:text-3xl lg:text-4xl',
      fontWeight: 'font-normal',
      textColor: 'text-white',
      position: 'bottom-right',
      animation: 'fade-slide',
      textShadow: '0 4px 10px rgba(0,0,0,0.8)',
    },
    effects: {},
  },
  "Hollywood '95": {
    name: "Hollywood '95",
    variants: HOLLYWOOD_VARIANTS,
    subtitle: {
      fontFamily: '"Playfair Display", "Georgia", serif',
      fontSize: 'text-2xl md:text-4xl lg:text-5xl',
      fontWeight: 'font-medium',
      textColor: 'text-amber-100',
      position: 'bottom-right',
      animation: 'fade-slide',
      textShadow: '0 2px 20px rgba(251,191,36,0.4), 0 4px 10px rgba(0,0,0,0.9)',
      letterSpacing: 'tracking-wide',
    },
    effects: {
      filmGrain: 'light',
      glow: 'rgba(251,191,36,0.15)',
    },
  },
  'Chungking Express': {
    name: 'Chungking Express',
    variants: CHUNGKING_VARIANTS,
    subtitle: {
      fontFamily: '"Bebas Neue", "Impact", sans-serif',
      fontSize: 'text-xl md:text-3xl lg:text-4xl',
      fontWeight: 'font-bold',
      textColor: 'text-cyan-300',
      position: 'top-left',
      animation: 'glitch',
      textShadow: '2px 2px 0 rgba(236,72,153,0.7), -2px -2px 0 rgba(6,182,212,0.7), 0 6px 20px rgba(0,0,0,0.8)',
      textTransform: 'uppercase',
    },
    effects: {
      chromatic: true,
      filmGrain: 'medium',
    },
  },
  'Film Noir': {
    name: 'Film Noir',
    variants: NOIR_VARIANTS,
    subtitle: {
      fontFamily: '"Courier New", monospace',
      fontSize: 'text-xl md:text-3xl lg:text-4xl',
      fontWeight: 'font-bold',
      textColor: 'text-white',
      position: 'bottom-center',
      animation: 'typewriter',
      textShadow: '0 0 20px rgba(255,255,255,0.5), 0 4px 10px rgba(0,0,0,1)',
      textTransform: 'uppercase',
      letterSpacing: 'tracking-wider',
    },
    effects: {
      vignette: true,
      filmGrain: 'heavy',
    },
  },
  'Wes Anderson': {
    name: 'Wes Anderson',
    variants: WES_VARIANTS,
    subtitle: {
      fontFamily: '"Futura", "Century Gothic", sans-serif',
      fontSize: 'text-lg md:text-2xl lg:text-3xl',
      fontWeight: 'font-semibold',
      textColor: 'text-rose-200',
      position: 'bottom-center',
      animation: 'bounce',
      textShadow: '0 2px 8px rgba(0,0,0,0.6)',
      letterSpacing: 'tracking-wide',
      textTransform: 'uppercase',
    },
    effects: {
      vignette: true,
    },
  },
  'Tokyo Love Story': {
    name: 'Tokyo Love Story',
    variants: TOKYO_VARIANTS,
    subtitle: {
      fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
      fontSize: 'text-lg md:text-2xl lg:text-3xl',
      fontWeight: 'font-light',
      textColor: 'text-pink-200',
      position: 'bottom-right',
      animation: 'blur-in',
      textShadow: '0 4px 16px rgba(251,207,232,0.6), 0 2px 8px rgba(0,0,0,0.5)',
    },
    effects: {
      filmGrain: 'light',
      glow: 'rgba(251,207,232,0.1)',
    },
  },
  'Cyberpunk 2077': {
    name: 'Cyberpunk 2077',
    variants: CYBERPUNK_VARIANTS,
    subtitle: {
      fontFamily: '"Share Tech Mono", "Courier New", monospace',
      fontSize: 'text-xl md:text-3xl lg:text-4xl',
      fontWeight: 'font-bold',
      textColor: 'text-fuchsia-400',
      position: 'bottom-left',
      animation: 'glitch',
      textShadow: '0 0 10px rgba(232,121,249,0.8), 0 0 20px rgba(6,182,212,0.6), 0 4px 10px rgba(0,0,0,0.9)',
      textTransform: 'uppercase',
    },
    effects: {
      scanlines: true,
      chromatic: true,
      filmGrain: 'medium',
    },
  },
  "Amélie's World": {
    name: "Amélie's World",
    variants: AMELIE_VARIANTS,
    subtitle: {
      fontFamily: '"Comic Neue", "Bradley Hand", cursive',
      fontSize: 'text-xl md:text-3xl lg:text-4xl',
      fontWeight: 'font-medium',
      textColor: 'text-green-300',
      position: 'bottom-right',
      animation: 'scale-rotate',
      textShadow: '2px 2px 0 rgba(220,38,38,0.5), 0 4px 12px rgba(0,0,0,0.7)',
    },
    effects: {
      vignette: true,
      filmGrain: 'medium',
    },
  },
  'Vintage VHS': {
    name: 'Vintage VHS',
    variants: VHS_VARIANTS,
    subtitle: {
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: 'text-sm md:text-xl lg:text-2xl',
      fontWeight: 'font-normal',
      textColor: 'text-yellow-200',
      position: 'bottom-center',
      animation: 'typewriter',
      textShadow: '2px 2px 0 rgba(0,0,0,0.8), 0 0 8px rgba(250,204,21,0.5)',
    },
    effects: {
      scanlines: true,
      filmGrain: 'heavy',
    },
  },
};

export interface VlogPlayerProps {
  data: VlogData;
  onExit: () => void;
}

const YT_SCRIPT_URL = 'https://www.youtube.com/iframe_api';

/** Memoized control buttons to prevent re-render on every slide change */
const ControlButtons = memo(({ 
  isMuted, 
  onMute, 
  onExit,
  exitLabel 
}: { 
  isMuted: boolean; 
  onMute: () => void; 
  onExit: () => void;
  exitLabel: string;
}) => (
    <div className="absolute top-6 right-6 z-50 flex gap-4 opacity-0 hover:opacity-100 transition-opacity duration-500">
    <button
      type="button"
      onClick={onMute}
      className="p-3 bg-black/20 backdrop-blur-md rounded-full text-[#ffffff] hover:bg-black/40 transition-all"
      aria-label={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
    </button>
    <button
      type="button"
      onClick={onExit}
      className="p-3 bg-black/20 backdrop-blur-md rounded-full text-[#ffffff] hover:bg-red-500/20 hover:text-red-400 transition-all"
      aria-label={exitLabel}
    >
      <X size={20} />
    </button>
  </div>
));
ControlButtons.displayName = 'ControlButtons';

/** Optimized background with crossfade */
const BlurredBackground = memo(({ 
  src, 
  currentIndex 
}: { 
  src: string; 
  currentIndex: number;
}) => {
  if (!src) return null;
  
  return (
    <div className="absolute inset-0">
      <AnimatePresence initial={false}>
        <motion.img
          key={`bg-${currentIndex}`}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: TRANSITION_DURATION * 1.2,
            ease: 'easeInOut'
          }}
          className="w-full h-full object-cover"
          style={{
            filter: 'blur(48px) brightness(0.5)',
            transform: 'scale(1.25)',
            willChange: 'opacity',
          }}
        />
      </AnimatePresence>
    </div>
  );
});
BlurredBackground.displayName = 'BlurredBackground';

/** Cinematic subtitle with theme-based styling */
const SubtitleDisplay = memo(({ 
  subtitle, 
  subtitleIndex,
  style 
}: { 
  subtitle: string; 
  subtitleIndex: number;
  style: SubtitleStyle;
}) => {
  const getAnimationProps = () => {
    switch (style.animation) {
      case 'glitch':
        return {
          initial: { opacity: 0, x: -10, filter: 'blur(4px)' },
          animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
          exit: { opacity: 0, x: 10, filter: 'blur(2px)' },
          transition: { duration: 0.3, ease: [0.87, 0, 0.13, 1] },
        };
      case 'typewriter':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0.1 },
        };
      case 'bounce':
        return {
          initial: { opacity: 0, y: 20, scale: 0.9 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, scale: 0.95 },
          transition: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] },
        };
      case 'blur-in':
        return {
          initial: { opacity: 0, filter: 'blur(12px)' },
          animate: { opacity: 1, filter: 'blur(0px)' },
          exit: { opacity: 0, filter: 'blur(8px)' },
          transition: { duration: 2.0, ease: [0.16, 1, 0.3, 1] },
        };
      case 'scale-rotate':
        return {
          initial: { opacity: 0, scale: 0.8, rotate: -5 },
          animate: { opacity: 1, scale: 1, rotate: 0 },
          exit: { opacity: 0, scale: 1.1, rotate: 5 },
          transition: { duration: 1.2, ease: [0.68, -0.55, 0.265, 1.55] },
        };
      default: // 'fade-slide'
        return {
          initial: { opacity: 0, x: 40 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: 20 },
          transition: { delay: 0.4, duration: 1.5, ease: 'easeOut' },
        };
    }
  };

  const getPositionClasses = () => {
    switch (style.position) {
      case 'bottom-center':
        return 'bottom-0 left-0 right-0 items-end justify-center pb-16 md:pb-20';
      case 'top-left':
        return 'top-0 left-0 right-0 items-start justify-start pt-24 md:pt-32 pl-6 md:pl-16';
      case 'center':
        return 'inset-0 items-center justify-center';
      case 'bottom-left':
        return 'bottom-0 left-0 right-0 items-end justify-start pb-16 md:pb-20 pl-6 md:pl-16';
      default: // 'bottom-right'
        return 'bottom-0 right-0 left-0 items-end justify-end pb-16 md:pb-20 pr-6 md:pr-16 lg:pr-20';
    }
  };

  const getAlignmentClasses = () => {
    if (style.position.includes('left')) return 'text-left items-start';
    if (style.position.includes('center')) return 'text-center items-center';
    return 'text-right items-end';
  };

  const animProps = getAnimationProps();

  return (
    <div className={`absolute z-30 flex pointer-events-none ${getPositionClasses()}`}>
      <div className={`max-w-[85vw] md:max-w-xl lg:max-w-2xl flex flex-col ${getAlignmentClasses()}`}>
        <AnimatePresence mode="wait">
          <motion.p
            key={subtitleIndex}
            {...animProps}
            className={`${style.fontFamily} ${style.fontSize} ${style.fontWeight} ${style.textColor} leading-relaxed break-words`}
            style={{
              fontFamily: style.fontFamily,
              textShadow: style.textShadow,
              letterSpacing: style.letterSpacing,
              textTransform: style.textTransform,
              writingMode: style.writingMode,
              lineBreak: 'normal',
              wordBreak: 'normal',
            }}
          >
            {subtitle}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
});
SubtitleDisplay.displayName = 'SubtitleDisplay';

/** Visual effects components */
const VignetteEffect = memo(() => (
  <div className="absolute inset-0 pointer-events-none z-20 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" />
));
VignetteEffect.displayName = 'VignetteEffect';

const ScanlineEffect = memo(() => (
  <div 
    className="absolute inset-0 z-20 pointer-events-none opacity-20"
    style={{
      background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.3) 50%)',
      backgroundSize: '100% 4px',
    }}
  />
));
ScanlineEffect.displayName = 'ScanlineEffect';

const ChromaticEffect = memo(({ currentIndex }: { currentIndex: number }) => (
  <div className="absolute inset-0 z-20 pointer-events-none opacity-30 mix-blend-screen">
    <motion.div
      key={currentIndex}
      initial={{ x: 2 }}
      animate={{ x: -2 }}
      transition={{ duration: 0.2, repeat: 1, repeatType: 'reverse' }}
      className="absolute inset-0 bg-cyan-500/20"
    />
    <motion.div
      key={`${currentIndex}-b`}
      initial={{ x: -2 }}
      animate={{ x: 2 }}
      transition={{ duration: 0.2, repeat: 1, repeatType: 'reverse' }}
      className="absolute inset-0 bg-red-500/20"
    />
  </div>
));
ChromaticEffect.displayName = 'ChromaticEffect';

const FilmGrainEffect = memo(({ intensity }: { intensity: 'light' | 'medium' | 'heavy' }) => {
  const opacityMap = { light: 0.03, medium: 0.06, heavy: 0.12 };
  return (
    <div
      className="absolute inset-0 z-20 pointer-events-none mix-blend-overlay"
      style={{
        opacity: opacityMap[intensity],
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }}
    />
  );
});
FilmGrainEffect.displayName = 'FilmGrainEffect';

const GlowEffect = memo(({ color }: { color: string }) => (
  <div
    className="absolute inset-0 z-20 pointer-events-none"
    style={{
      background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`,
    }}
  />
));
GlowEffect.displayName = 'GlowEffect';

export function VlogPlayer({ data, onExit }: VlogPlayerProps) {
  const { t } = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [ytReady, setYtReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recordedAudioRef = useRef<HTMLAudioElement>(null);
  const ytPlayersRef = useRef<Map<number, YTPlayer>>(new Map());
  const currentIndexRef = useRef(currentIndex);
  const imagePreloadCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  currentIndexRef.current = currentIndex;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      // Cleanup preloaded images
      imagePreloadCacheRef.current.clear();
    };
  }, []);

  useLayoutEffect(() => {
    const play = (el: HTMLAudioElement | null) =>
      el?.play().catch(() => {});
    play(audioRef.current);
    play(recordedAudioRef.current);
  }, []);

  // Retry play once after mount (handles ref timing / browser autoplay policy)
  useEffect(() => {
    const t = window.setTimeout(() => {
      audioRef.current?.play().catch(() => {});
      recordedAudioRef.current?.play().catch(() => {});
    }, 100);
    return () => clearTimeout(t);
  }, []);

  const playlist = useMemo(() => {
    const items: PlaylistItem[] = [
      ...data.images.map((src) => ({ type: 'image' as const, src })),
      ...(data.videos ?? []).map((src) => ({ type: 'video' as const, src })),
      ...data.youtubeIds.map((id) => ({ type: 'youtube' as const, id })),
    ];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    if (items.length === 0) {
      items.push({ type: 'image', src: '' });
    }
    return items;
  }, [data.images, data.videos, data.youtubeIds]);

  const activeFilter = useMemo(
    () => FILTER_PRESETS.find((f) => f.name === data.filterPreset) ?? FILTER_PRESETS[0],
    [data.filterPreset]
  );

  const themeConfig = useMemo(
    () => THEME_CONFIGS[data.filterPreset] || THEME_CONFIGS['Original'],
    [data.filterPreset]
  );

  const youtubeIndices = useMemo(
    () => playlist.map((item, i) => (item.type === 'youtube' ? i : null)).filter((i): i is number => i !== null),
    [playlist]
  );

  useEffect(() => {
    if (youtubeIndices.length === 0) return;
    if (window.YT) {
      setYtReady(true);
      return;
    }
    window.onYouTubeIframeAPIReady = () => setYtReady(true);
    const script = document.createElement('script');
    script.src = YT_SCRIPT_URL;
    script.async = true;
    document.head.appendChild(script);
    return () => {
      window.onYouTubeIframeAPIReady = undefined;
    };
  }, [youtubeIndices.length]);

  useEffect(() => {
    if (!ytReady || !window.YT || youtubeIndices.length === 0) return;
    ytPlayersRef.current.clear();
    youtubeIndices.forEach((idx) => {
      const item = playlist[idx];
      if (item?.type !== 'youtube') return;
      const el = document.getElementById(`yt-player-${idx}`);
      if (!el) return;
      try {
        const player = new window.YT!.Player(el, {
          videoId: item.id,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            mute: 1,
            controls: 0,
            loop: 1,
            playlist: item.id,
            playsinline: 1,
            showinfo: 0,
            rel: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            disablekb: 1,
            fs: 0,
            cc_load_policy: 0,
          },
          events: {
            onReady: (ev: { target: YTPlayer }) => {
              ytPlayersRef.current.set(idx, ev.target);
              if (currentIndexRef.current === idx) {
                ev.target.playVideo();
              }
            },
          },
        });
      } catch {
        // ignore
      }
    });
    return () => {
      ytPlayersRef.current.clear();
    };
  }, [ytReady, playlist, youtubeIndices]);

  useEffect(() => {
    const item = playlist[currentIndex];
    if (item?.type === 'youtube') {
      ytPlayersRef.current.get(currentIndex)?.playVideo();
    }
  }, [currentIndex, playlist]);

  useEffect(() => {
    if (!isPlaying || playlist.length === 0) return;
    const interval = window.setInterval(
      () => setCurrentIndex((prev) => (prev + 1) % playlist.length),
      SLIDE_DURATION * 1000
    );
    return () => clearInterval(interval);
  }, [isPlaying, playlist.length]);

  useEffect(() => {
    const audio = audioRef.current;
    const recorded = recordedAudioRef.current;
    if (isPlaying) {
      audio?.play().catch(() => {});
      recorded?.play().catch(() => {});
    } else {
      audio?.pause();
      recorded?.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
    if (recordedAudioRef.current) recordedAudioRef.current.muted = isMuted;
  }, [isMuted]);

  /** Aggressive preloading: ensure images are ready before transition */
  useEffect(() => {
    const preloadIndices = [
      (currentIndex + 1) % playlist.length,   // Next (most important)
      (currentIndex + 2) % playlist.length,   // Next+1
      currentIndex,                           // Current (ensure it's cached)
    ];

    preloadIndices.forEach((idx, priority) => {
      const item = playlist[idx];
      if (!item || item.type !== 'image') return;
      const src = item.src;
      if (!src || imagePreloadCacheRef.current.has(src)) return;
      
      const img = new Image();
      img.decoding = 'async';
      // Highest priority for next image
      img.fetchPriority = priority === 0 ? 'high' : 'low';
      
      // Wait for image to fully load before marking as cached
      img.onload = () => {
        imagePreloadCacheRef.current.set(src, img);
      };
      
      // Start loading
      img.src = src;
    });

    // Cleanup: keep last 6 images to cover all possibilities
    if (imagePreloadCacheRef.current.size > 6) {
      const allKeys = Array.from(imagePreloadCacheRef.current.keys());
      const keysToDelete = allKeys.slice(0, allKeys.length - 6);
      keysToDelete.forEach(key => imagePreloadCacheRef.current.delete(key));
    }
  }, [currentIndex, playlist]);

  const currentItem = useMemo(() => playlist[currentIndex], [playlist, currentIndex]);
  
  const subtitleIndex = useMemo(
    () => data.subtitles.length > 0 ? currentIndex % data.subtitles.length : 0,
    [currentIndex, data.subtitles.length]
  );
  
  const currentVariant = useMemo(
    () => themeConfig.variants[currentIndex % themeConfig.variants.length],
    [currentIndex, themeConfig.variants]
  );

  const bgSrc = useMemo(() => {
    if (!currentItem) return '';
    if (currentItem.type === 'image') return currentItem.src;
    if (currentItem.type === 'youtube')
      return `https://img.youtube.com/vi/${currentItem.id}/hqdefault.jpg`;
    return '';
  }, [currentItem]);

  // Prerender next image in hidden DOM for instant display
  const nextItem = useMemo(
    () => playlist[(currentIndex + 1) % playlist.length],
    [playlist, currentIndex]
  );

  const handleExit = useCallback(() => onExit(), [onExit]);
  const handleMute = useCallback(() => setIsMuted((m) => !m), []);
  const handlePlayPause = useCallback(() => setIsPlaying((p) => !p), []);

  if (playlist.length === 0) return null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {data.audio && (
        <audio
          ref={audioRef}
          src={data.audio}
          loop
          autoPlay
          preload="auto"
          className="hidden"
          aria-hidden
        />
      )}
      {data.recordedAudio && (
        <audio
          ref={recordedAudioRef}
          src={data.recordedAudio}
          autoPlay
          preload="auto"
          className="hidden"
          aria-hidden
        />
      )}

      {/* Optimized background layer */}
      <div className="absolute inset-0 z-0">
        <BlurredBackground src={bgSrc} currentIndex={currentIndex} />
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none z-10 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Main content area */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="relative w-full h-full md:w-[56.25vh] md:h-full overflow-hidden shadow-2xl bg-black">
          {/* Hidden prerender of next image for instant transition */}
          {nextItem?.type === 'image' && (
            <img
              src={nextItem.src}
              alt=""
              loading="eager"
              decoding="async"
              className="hidden"
              aria-hidden="true"
            />
          )}

          {/* Image slides - overlapping crossfade for smooth transition */}
          {currentItem?.type === 'image' && (
            <AnimatePresence initial={false}>
              <motion.div
                key={currentIndex}
                className={`absolute inset-0 w-full h-full flex items-center justify-center bg-black ${activeFilter.className}`}
                initial={currentVariant.initial}
                animate={currentVariant.animate}
                exit={currentVariant.exit}
                transition={currentVariant.transition}
                style={{ willChange: 'opacity, transform' }}
              >
                <img
                  src={currentItem.src}
                  alt=""
                  loading="eager"
                  decoding="async"
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </motion.div>
            </AnimatePresence>
          )}
          
          {/* Video slides - overlapping crossfade */}
          {currentItem?.type === 'video' && (
            <AnimatePresence initial={false}>
              <motion.div
                key={currentIndex}
                className={`absolute inset-0 w-full h-full flex items-center justify-center bg-black ${activeFilter.className}`}
                initial={currentVariant.initial}
                animate={currentVariant.animate}
                exit={currentVariant.exit}
                transition={currentVariant.transition}
                style={{ willChange: 'opacity, transform' }}
              >
                <video
                  key={currentItem.src}
                  src={currentItem.src}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </AnimatePresence>
          )}
          
          {/* YouTube embeds */}
          {youtubeIndices.length > 0 && (
            <div
              className={`absolute inset-0 w-full h-full ${activeFilter.className}`}
              style={{
                opacity: currentItem?.type === 'youtube' ? 1 : 0,
                pointerEvents: currentItem?.type === 'youtube' ? 'auto' : 'none',
                zIndex: currentItem?.type === 'youtube' ? 1 : 0,
                transition: 'opacity 0.5s ease-in-out',
              }}
            >
              {youtubeIndices.map((idx) => (
                <div
                  key={idx}
                  id={`yt-player-${idx}`}
                  className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:object-cover"
                  style={{
                    opacity: currentIndex === idx ? 1 : 0,
                    zIndex: currentIndex === idx ? 2 : 0,
                    pointerEvents: currentIndex === idx ? 'auto' : 'none',
                    transition: 'opacity 0.5s ease-in-out',
                  }}
                />
              ))}
            </div>
          )}

          {/* Filter overlays */}
          <div className={`absolute inset-0 pointer-events-none z-20 ${activeFilter.overlayColor}`} />
          <div
            className="absolute inset-0 pointer-events-none z-20 opacity-[0.12] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />
          <div className="absolute inset-0 pointer-events-none z-20 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)]" />
          {activeFilter.name === 'Vintage VHS' && (
            <div className="absolute inset-0 z-20 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20" />
          )}
        </div>
      </div>

      {/* Location title on first frame - Apple white large title style */}
      {currentIndex === 0 && data.location?.trim() && (
        <div
          className="absolute left-0 right-0 z-30 flex justify-center pointer-events-none"
          style={{
            paddingTop: 'max(env(safe-area-inset-top, 0px) + 10vh, 5rem)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="text-center px-6 max-w-[90vw]"
            style={{ willChange: 'opacity, transform' }}
          >
            <h1
              className="font-semibold text-[34px] md:text-5xl lg:text-6xl text-[#ffffff] tracking-[0.35em] md:tracking-[0.45em] lg:tracking-[0.5em] uppercase"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
                textShadow:
                  '0 0 60px rgba(0,0,0,0.4), 0 0 30px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.8), 0 4px 20px rgba(0,0,0,0.5), 0 8px 40px rgba(0,0,0,0.4)',
              }}
            >
              {data.location.trim()}
            </h1>
          </motion.div>
        </div>
      )}

      {/* Theme-specific visual effects */}
      {themeConfig.effects.vignette && <VignetteEffect />}
      {themeConfig.effects.scanlines && <ScanlineEffect />}
      {themeConfig.effects.chromatic && <ChromaticEffect currentIndex={currentIndex} />}
      {themeConfig.effects.filmGrain && <FilmGrainEffect intensity={themeConfig.effects.filmGrain} />}
      {themeConfig.effects.glow && <GlowEffect color={themeConfig.effects.glow} />}

      {/* Cinematic subtitles with theme-based styling */}
      {data.subtitles.length > 0 && (
        <SubtitleDisplay 
          subtitle={data.subtitles[subtitleIndex]} 
          subtitleIndex={subtitleIndex}
          style={themeConfig.subtitle}
        />
      )}

      {/* Control buttons */}
      <ControlButtons 
        isMuted={isMuted}
        onMute={handleMute}
        onExit={handleExit}
        exitLabel={t('vlog.exit')}
      />

      {/* Play/pause overlay */}
      <div
        className="absolute inset-0 z-40 flex items-center justify-center cursor-pointer"
        onClick={handlePlayPause}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handlePlayPause();
          }
        }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {!isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/30 backdrop-blur-md p-6 rounded-full border border-white/10 shadow-2xl"
          >
            <Play size={40} className="fill-[#ffffff] text-[#ffffff] ml-1" />
          </motion.div>
        )}
      </div>
    </div>
  );
}
