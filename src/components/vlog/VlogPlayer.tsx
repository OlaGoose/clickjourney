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

/** Optimized animation variants - removed expensive filter animations */
const ANIMATION_VARIANTS = [
  {
    initial: { opacity: 0, scale: 1.08 },
    animate: { opacity: 1, scale: 1.0 },
    exit: { opacity: 0, scale: 0.96 },
    transition: {
      opacity: { duration: 1.2, ease: [0.22, 1, 0.36, 1] as const },
      scale: { duration: SLIDE_DURATION + 1, ease: 'linear' as const },
    },
  },
  {
    initial: { opacity: 0, x: '8%', scale: 1.05 },
    animate: { opacity: 1, x: '0%', scale: 1.0 },
    exit: { opacity: 0, x: '-4%', scale: 1.0 },
    transition: {
      opacity: { duration: 1.2, ease: [0.22, 1, 0.36, 1] as const },
      x: { duration: SLIDE_DURATION, ease: [0.22, 1, 0.36, 1] as const },
      scale: { duration: SLIDE_DURATION, ease: 'linear' as const },
    },
  },
  {
    initial: { opacity: 0, y: 40, scale: 1.04 },
    animate: { opacity: 1, y: 0, scale: 1.0 },
    exit: { opacity: 0, y: -40, scale: 0.98 },
    transition: {
      opacity: { duration: 1.2, ease: [0.22, 1, 0.36, 1] as const },
      y: { duration: SLIDE_DURATION + 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
      scale: { duration: SLIDE_DURATION + 0.5, ease: 'linear' as const },
    },
  },
];

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
      className="p-3 bg-black/20 backdrop-blur-md rounded-full text-white/70 hover:text-white hover:bg-black/40 transition-all"
      aria-label={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
    </button>
    <button
      type="button"
      onClick={onExit}
      className="p-3 bg-black/20 backdrop-blur-md rounded-full text-white/70 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-all"
      aria-label={exitLabel}
    >
      <X size={20} />
    </button>
  </div>
));
ControlButtons.displayName = 'ControlButtons';

/** Optimized background with static blur layer */
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
      <AnimatePresence mode="wait">
        <motion.img
          key={`bg-${currentIndex}`}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.8 }}
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

/** Optimized subtitle with simpler animation */
const SubtitleDisplay = memo(({ 
  subtitle, 
  subtitleIndex 
}: { 
  subtitle: string; 
  subtitleIndex: number;
}) => (
  <div className="absolute inset-y-0 right-0 z-30 flex items-center justify-end px-6 md:px-16 lg:px-20 pointer-events-none w-full">
    <div className="max-w-[85vw] md:max-w-xl lg:max-w-2xl text-right">
      <AnimatePresence mode="wait">
        <motion.div
          key={subtitleIndex}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 15 }}
          transition={{ delay: 0.3, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-end"
          style={{ willChange: 'opacity, transform' }}
        >
          <p
            className="font-serif italic text-xl md:text-3xl lg:text-4xl text-white leading-relaxed tracking-wide drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] break-words"
            style={{ lineBreak: 'normal', wordBreak: 'normal' }}
          >
            {subtitle}
          </p>
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 60, opacity: 0.8 }}
            transition={{ delay: 0.7, duration: 1.0, ease: 'circOut' }}
            className="h-[1px] bg-white/60 mt-6 mr-1"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  </div>
));
SubtitleDisplay.displayName = 'SubtitleDisplay';

export function VlogPlayer({ data, onExit }: VlogPlayerProps) {
  const { t } = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [ytReady, setYtReady] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recordedAudioRef = useRef<HTMLAudioElement>(null);
  const ytPlayersRef = useRef<Map<number, YTPlayer>>(new Map());
  const currentIndexRef = useRef(currentIndex);
  const autoplayAttemptedRef = useRef(false);
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

  const startAudio = useCallback(() => {
    const play = (el: HTMLAudioElement | null) =>
      el?.play().catch(() => {});
    play(audioRef.current);
    play(recordedAudioRef.current);
  }, []);

  useLayoutEffect(() => {
    if (autoplayAttemptedRef.current) return;
    autoplayAttemptedRef.current = true;
    const a = audioRef.current;
    const r = recordedAudioRef.current;
    if (!a && !r) return;
    const p = Promise.all([
      a ? a.play() : Promise.resolve(),
      r ? r.play() : Promise.resolve(),
    ]);
    p.then(
      () => setAutoplayBlocked(false),
      () => setAutoplayBlocked(true)
    );
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

  /** Advanced preloading: preload current, next, and next+1 images */
  useEffect(() => {
    const preloadIndices = [
      currentIndex,
      (currentIndex + 1) % playlist.length,
      (currentIndex + 2) % playlist.length,
    ];

    preloadIndices.forEach((idx) => {
      const item = playlist[idx];
      if (!item || item.type !== 'image') return;
      const src = item.src;
      if (!src || imagePreloadCacheRef.current.has(src)) return;
      
      const img = new Image();
      img.decoding = 'async';
      img.fetchPriority = idx === currentIndex ? 'high' : 'low';
      img.src = src;
      imagePreloadCacheRef.current.set(src, img);
    });

    // Cleanup old cached images (keep only recent 5)
    if (imagePreloadCacheRef.current.size > 5) {
      const keysToDelete = Array.from(imagePreloadCacheRef.current.keys()).slice(0, -5);
      keysToDelete.forEach(key => imagePreloadCacheRef.current.delete(key));
    }
  }, [currentIndex, playlist]);

  const currentItem = useMemo(() => playlist[currentIndex], [playlist, currentIndex]);
  
  const subtitleIndex = useMemo(
    () => data.subtitles.length > 0 ? currentIndex % data.subtitles.length : 0,
    [currentIndex, data.subtitles.length]
  );
  
  const currentVariant = useMemo(
    () => ANIMATION_VARIANTS[currentIndex % ANIMATION_VARIANTS.length],
    [currentIndex]
  );

  const bgSrc = useMemo(() => {
    if (!currentItem) return '';
    if (currentItem.type === 'image') return currentItem.src;
    if (currentItem.type === 'youtube')
      return `https://img.youtube.com/vi/${currentItem.id}/hqdefault.jpg`;
    return '';
  }, [currentItem]);

  const handleExit = useCallback(() => onExit(), [onExit]);
  const handleMute = useCallback(() => setIsMuted((m) => !m), []);
  const handlePlayPause = useCallback(() => {
    if (autoplayBlocked) {
      startAudio();
      setAutoplayBlocked(false);
    }
    setIsPlaying((p) => !p);
  }, [autoplayBlocked, startAudio]);

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
          {/* Image slides */}
          {currentItem?.type === 'image' && (
            <AnimatePresence mode="wait">
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
                  decoding="async"
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </motion.div>
            </AnimatePresence>
          )}
          
          {/* Video slides */}
          {currentItem?.type === 'video' && (
            <AnimatePresence mode="wait">
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

      {/* Location title on first frame */}
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
              className="font-serif font-light text-3xl md:text-5xl lg:text-6xl xl:text-7xl text-white tracking-[0.35em] md:tracking-[0.45em] lg:tracking-[0.5em] uppercase"
              style={{
                textShadow:
                  '0 0 60px rgba(0,0,0,0.4), 0 0 30px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.8), 0 4px 20px rgba(0,0,0,0.5), 0 8px 40px rgba(0,0,0,0.4)',
              }}
            >
              {data.location.trim()}
            </h1>
          </motion.div>
        </div>
      )}

      {/* Subtitles */}
      {data.subtitles.length > 0 && (
        <SubtitleDisplay 
          subtitle={data.subtitles[subtitleIndex]} 
          subtitleIndex={subtitleIndex} 
        />
      )}

      {/* Control buttons */}
      <ControlButtons 
        isMuted={isMuted}
        onMute={handleMute}
        onExit={handleExit}
        exitLabel={t('vlog.exit')}
      />

      {/* Tap to play overlay */}
      {autoplayBlocked && (
        <div
          className="absolute inset-0 z-[35] flex items-center justify-center bg-black/40 cursor-pointer"
          onClick={handlePlayPause}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handlePlayPause();
            }
          }}
          aria-label={t('vlog.tapToPlay')}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/50 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/20 text-white text-lg"
          >
            {t('vlog.tapToPlay')}
          </motion.div>
        </div>
      )}
      
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
            <Play size={40} className="fill-white text-white ml-1" />
          </motion.div>
        )}
      </div>
    </div>
  );
}
