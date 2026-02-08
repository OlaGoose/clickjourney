'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, MotionValue } from 'framer-motion';
import { Film, Wand2, Image as ImageIcon, Type, Palette } from 'lucide-react';

// --- Layout config: spread +20% distance, positions pulled toward center ---
interface ImageConfig {
  id: number;
  x: number;
  y: number;
  width: string;
  aspectRatio: number;
  zIndex: number;
  baseScale: number;
}

/** Base spread (%). Increased by 20% for more spacing between images. */
const SPREAD_MULTIPLIER = 35 * 1.2; // 42
/** Pull positions toward center so photos are less concentrated at edges. */
const CENTER_PULL = 0.8;

const IMAGE_LAYOUT: ImageConfig[] = [
  { id: 1, x: 0, y: 0, width: 'w-64 md:w-80', aspectRatio: 0.75, zIndex: 50, baseScale: 1.0 },
  { id: 2, x: -0.4, y: -0.25, width: 'w-48 md:w-60', aspectRatio: 0.8, zIndex: 40, baseScale: 0.9 },
  { id: 3, x: 0.45, y: 0.2, width: 'w-52 md:w-64', aspectRatio: 1.2, zIndex: 45, baseScale: 0.95 },
  { id: 4, x: 0.55, y: -0.4, width: 'w-40 md:w-52', aspectRatio: 0.7, zIndex: 35, baseScale: 0.85 },
  { id: 5, x: -0.5, y: 0.45, width: 'w-44 md:w-56', aspectRatio: 1.0, zIndex: 30, baseScale: 0.9 },
  { id: 6, x: -0.1, y: -0.6, width: 'w-36 md:w-48', aspectRatio: 1.3, zIndex: 20, baseScale: 0.8 },
  { id: 7, x: 0.1, y: 0.65, width: 'w-40 md:w-48', aspectRatio: 0.9, zIndex: 25, baseScale: 0.85 },
  { id: 8, x: -0.7, y: -0.1, width: 'w-32 md:w-44', aspectRatio: 0.7, zIndex: 15, baseScale: 0.75 },
  { id: 9, x: 0.75, y: -0.05, width: 'w-36 md:w-48', aspectRatio: 0.8, zIndex: 10, baseScale: 0.8 },
];

const COLORS = {
  glow1: 'rgba(59, 130, 246, 0.5)',
  glow2: 'rgba(147, 51, 234, 0.5)',
  glow3: 'rgba(236, 72, 153, 0.4)',
  glow4: 'rgba(6, 182, 212, 0.4)',
};

const GENERATION_STEPS = [
  { icon: ImageIcon, label: 'Reading your journey', duration: 3000 },
  { icon: Palette, label: 'Sensing the mood', duration: 2500 },
  { icon: Type, label: 'Weaving the narrative', duration: 3500 },
  { icon: Film, label: 'Choreographing the rhythm', duration: 2000 },
  { icon: Wand2, label: 'Perfecting the story', duration: 3000 },
];

// Typography: base sizes × 1.3 for +30% font size
const TYPO = {
  titleRem: 1.05 * 1.3,      // ~1.365rem
  subtitlePx: 12 * 1.3,       // 15.6px
  progressPx: 10 * 1.3,       // 13px
} as const;

// Text color opacity: deepen by ~30% (e.g. 90% → 100%, 50% → 65%)
const TEXT_OPACITY = {
  title: { dark: 'text-white', light: 'text-black' },
  subtitle: { dark: 'text-white/80', light: 'text-black/80' },
  muted: { dark: 'text-white/60', light: 'text-black/60' },
  progressBar: { dark: 'bg-white/15', light: 'bg-black/15' },
  progressFill: { dark: 'bg-white/80', light: 'bg-black/55' },
  progressText: { dark: 'text-white/50', light: 'text-black/55' },
} as const;

// --- Ambient glow (optimized for performance) ---
const AmbientGlow = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
    <motion.div
      animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.45, 0.3] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full blur-[100px]"
      style={{
        background: `radial-gradient(circle, ${COLORS.glow1} 0%, transparent 70%)`,
        mixBlendMode: 'screen',
        // GPU acceleration
        transform: 'translate3d(-50%, -50%, 0)',
        willChange: 'transform, opacity',
      }}
    />
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      className="absolute top-1/3 left-1/3 w-[40vw] h-[40vw] rounded-full blur-[80px]"
      style={{ 
        background: COLORS.glow2, 
        mixBlendMode: 'screen', 
        opacity: 0.35,
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform',
      }}
    />
    <motion.div
      animate={{ rotate: -360 }}
      transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      className="absolute bottom-1/3 right-1/3 w-[50vw] h-[50vw] rounded-full blur-[90px]"
      style={{ 
        background: COLORS.glow3, 
        mixBlendMode: 'screen', 
        opacity: 0.25,
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform',
      }}
    />
  </div>
);

// --- Photo card with focus-based blur/scale (optimized for performance) ---
function PhotoCard({
  config,
  focusX,
  focusY,
  imgSrc,
}: {
  config: ImageConfig;
  focusX: MotionValue<number>;
  focusY: MotionValue<number>;
  imgSrc: string;
}) {
  // Optimized: Calculate distance once and reuse
  const distance = useTransform([focusX, focusY], ([fx, fy]) => {
    const dx = (fx as number) - config.x;
    const dy = (fy as number) - config.y;
    return Math.sqrt(dx * dx + dy * dy);
  });

  // Optimized: Reduced blur range from [0, 12] to [0, 4] - much less GPU intensive
  const blur = useTransform(distance, [0, 0.6], [0, 4]);
  const scale = useTransform(distance, [0, 0.8], [config.baseScale * 1.12, config.baseScale * 0.92]);
  const opacity = useTransform(distance, [0, 1], [1, 0.6]);
  // Removed brightness transform to reduce calculations

  const offsetX = config.x * SPREAD_MULTIPLIER * CENTER_PULL;
  const offsetY = config.y * SPREAD_MULTIPLIER * CENTER_PULL;

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: `${50 + offsetY}%`,
        left: `${50 + offsetX}%`,
        zIndex: config.zIndex,
        scale,
        willChange: 'transform',
      }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 ${config.width}`}
    >
      <motion.div
        style={{
          opacity,
          // Removed brightness transform for better performance
        }}
        className="relative group"
      >
        <motion.div
          className="relative overflow-hidden rounded-2xl shadow-2xl"
          style={{
            aspectRatio: config.aspectRatio,
            filter: useTransform(blur, (b) => `blur(${b}px)`),
            boxShadow:
              '0 20px 50px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset',
            // GPU acceleration - force compositing layer
            transform: 'translateZ(0)',
            willChange: 'filter',
          }}
        >
          <img
            src={imgSrc}
            alt=""
            className="w-full h-full object-cover block"
            draggable={false}
            loading="eager"
            decoding="async"
            style={{
              // Hardware acceleration
              transform: 'translate3d(0, 0, 0)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-40 pointer-events-none" />
        </motion.div>
        <motion.div
          style={{ opacity: useTransform(distance, [0, 0.2], [1, 0]) }}
          className="absolute -inset-4 rounded-[32px] border border-white/20 pointer-events-none"
        />
      </motion.div>
    </motion.div>
  );
}

interface CinematicGenerationLoaderProps {
  isGenerating: boolean;
  progress?: number;
  currentStep?: string;
  /** Uploaded image URLs (blob URLs). If fewer than 9, images are repeated to fill the layout. */
  imageUrls?: string[];
  /** Light = upload page gradient + dark text; dark = Apple TV black + white text. */
  theme?: 'light' | 'dark';
}

export function CinematicGenerationLoader({
  isGenerating,
  progress = 0,
  currentStep,
  imageUrls = [],
  theme = 'dark',
}: CinematicGenerationLoaderProps) {
  const isDark = theme === 'dark';
  const [stepIndex, setStepIndex] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);

  // Drive focus point over time (optimized: 40ms interval instead of 16ms for better performance)
  const focusX = useMotionValue(0);
  const focusY = useMotionValue(0);
  useEffect(() => {
    if (!isGenerating) return;
    let t = 0;
    let lastUpdate = 0;
    let raf = 0;
    const UPDATE_INTERVAL = 40; // ~25fps instead of 60fps for better performance
    
    const tick = (timestamp: number) => {
      if (timestamp - lastUpdate >= UPDATE_INTERVAL) {
        t += UPDATE_INTERVAL;
        focusX.set(Math.sin(t * 0.0004) * 0.6);
        focusY.set(Math.cos(t * 0.0003) * 0.5);
        lastUpdate = timestamp;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isGenerating, focusX, focusY]);

  // Optimized: Reduce parallax movement for smoother performance
  const containerX = useTransform(focusX, (x) => x * -30);
  const containerY = useTransform(focusY, (y) => y * -20);

  // Fill 9 slots: use uploaded images, repeat if needed
  const imageSources = useMemo(() => {
    if (imageUrls.length === 0) return IMAGE_LAYOUT.map(() => '');
    return IMAGE_LAYOUT.map((_, i) => imageUrls[i % imageUrls.length]!);
  }, [imageUrls]);

  useEffect(() => {
    if (!isGenerating) {
      setStepIndex(0);
      setDisplayProgress(0);
      return;
    }
    const interval = setInterval(() => {
      setStepIndex((prev) =>
        prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating) return;
    const targetProgress = Math.min(progress, 95);
    const increment = (targetProgress - displayProgress) / 30;
    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        const next = prev + increment;
        if (next >= targetProgress) return targetProgress;
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isGenerating, progress, displayProgress]);

  const currentStepData = GENERATION_STEPS[stepIndex];
  const titleText = currentStep || currentStepData?.label || 'Processing...';
  const subtitleText = 'Crafting your visual story';

  return (
    <AnimatePresence>
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden transition-colors duration-300"
          style={{
            background: isDark
              ? 'linear-gradient(to bottom, rgb(0, 113, 227), #050505)'
              : 'linear-gradient(to bottom, #CBE8FA 0%, #FCFDFD 100%)',
          }}
        >
          {isDark && <AmbientGlow />}

          {/* Photo grid: visual center at 2/3 down (66.67%), horizontally centered. Adjusted for photo distribution bias. */}
          <motion.div
            style={{ 
              x: containerX, 
              y: containerY,
              willChange: 'transform',
            }}
            className="absolute -left-1/3 w-full max-w-7xl h-[60vh] z-10 perspective-1000"
          >
            {IMAGE_LAYOUT.map((config, i) => {
              const src = imageSources[i];
              if (!src) return null;
              return (
                <PhotoCard
                  key={config.id}
                  config={config}
                  focusX={focusX}
                  focusY={focusY}
                  imgSrc={src}
                />
              );
            })}
          </motion.div>

          {/* Noise texture (1:1 from reference) */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04] z-[15] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Text overlay — upper half center */}
          <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 text-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              style={{ opacity: 1, transform: 'none' }}
            >
              <h1
                className={`font-medium tracking-[0.2em] uppercase mb-2 drop-shadow-lg ${isDark ? TEXT_OPACITY.title.dark : TEXT_OPACITY.title.light}`}
                style={{ fontSize: `${TYPO.titleRem}rem` }}
              >
                {titleText}
              </h1>
              <p
                className={`mt-1 font-light tracking-wider uppercase ${isDark ? TEXT_OPACITY.subtitle.dark : TEXT_OPACITY.subtitle.light}`}
                style={{ fontSize: `${TYPO.subtitlePx}px` }}
              >
                {subtitleText} • <span className={isDark ? TEXT_OPACITY.muted.dark : TEXT_OPACITY.muted.light}>Curated by Orbit Journey</span>
              </p>
            </motion.div>
          </div>

          {/* Minimal progress — +30% size and deepened colors */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4">
            <div
              className={`h-0.5 rounded-full overflow-hidden ${isDark ? TEXT_OPACITY.progressBar.dark : TEXT_OPACITY.progressBar.light}`}
            >
              <motion.div
                className={`h-full rounded-full ${isDark ? TEXT_OPACITY.progressFill.dark : TEXT_OPACITY.progressFill.light}`}
                initial={{ width: '0%' }}
                animate={{ width: `${displayProgress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            <p
              className={`text-center mt-1.5 font-light tracking-wider uppercase ${isDark ? TEXT_OPACITY.progressText.dark : TEXT_OPACITY.progressText.light}`}
              style={{ fontSize: `${TYPO.progressPx}px` }}
            >
              {Math.round(displayProgress)}%
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
