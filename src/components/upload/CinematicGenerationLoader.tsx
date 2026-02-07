'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Film, Wand2, Image as ImageIcon, Type, Palette } from 'lucide-react';

interface CinematicGenerationLoaderProps {
  isGenerating: boolean;
  progress?: number;
  currentStep?: string;
}

const GENERATION_STEPS = [
  { icon: ImageIcon, label: 'Reading your journey', duration: 3000 },
  { icon: Palette, label: 'Sensing the mood', duration: 2500 },
  { icon: Type, label: 'Weaving the narrative', duration: 3500 },
  { icon: Film, label: 'Choreographing the rhythm', duration: 2000 },
  { icon: Wand2, label: 'Perfecting the story', duration: 3000 },
];

export function CinematicGenerationLoader({
  isGenerating,
  progress = 0,
  currentStep,
}: CinematicGenerationLoaderProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      setStepIndex(0);
      setDisplayProgress(0);
      return;
    }

    // Auto-advance through steps
    const interval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev < GENERATION_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating) return;

    // Smooth progress animation
    const targetProgress = Math.min(progress, 95); // Cap at 95% until complete
    const increment = (targetProgress - displayProgress) / 30;

    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        const next = prev + increment;
        if (next >= targetProgress) {
          clearInterval(interval);
          return targetProgress;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isGenerating, progress, displayProgress]);

  const currentStepData = GENERATION_STEPS[stepIndex];
  const Icon = currentStepData?.icon || Sparkles;

  return (
    <AnimatePresence>
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl"
        >
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/20 rounded-full"
                animate={{
                  x: [
                    Math.random() * window.innerWidth,
                    Math.random() * window.innerWidth,
                  ],
                  y: [
                    Math.random() * window.innerHeight,
                    Math.random() * window.innerHeight,
                  ],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 8 + Math.random() * 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Main loader content */}
          <div className="relative z-10 flex flex-col items-center gap-8 max-w-md px-6">
            {/* Icon animation */}
            <motion.div
              key={stepIndex}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', damping: 15 }}
              className="relative"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 bg-white/10 rounded-full blur-2xl"
              />
              <div className="relative bg-white/5 backdrop-blur-xl p-6 rounded-full border border-white/10">
                <Icon className="w-12 h-12 text-white" strokeWidth={1.5} />
              </div>
            </motion.div>

            {/* Step label */}
            <AnimatePresence mode="wait">
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <h3 className="text-xl font-light text-white mb-2 tracking-wide">
                  {currentStep || currentStepData?.label || 'Processing...'}
                </h3>
                <p className="text-sm text-white/40 font-light tracking-wider">
                  Crafting your visual story
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Progress bar */}
            <div className="w-full max-w-xs">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-white/50 to-white rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${displayProgress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-white/40">
                <span>Processing</span>
                <span>{Math.round(displayProgress)}%</span>
              </div>
            </div>

            {/* Step indicators */}
            <div className="flex gap-2">
              {GENERATION_STEPS.map((step, index) => (
                <motion.div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    index <= stepIndex
                      ? 'bg-white'
                      : 'bg-white/20'
                  }`}
                  animate={{
                    scale: index === stepIndex ? [1, 1.5, 1] : 1,
                  }}
                  transition={{
                    duration: 1,
                    repeat: index === stepIndex ? Infinity : 0,
                  }}
                />
              ))}
            </div>

            {/* Subtle hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="text-xs text-white/25 text-center max-w-xs font-light tracking-wide italic"
            >
              Every moment deserves to be told beautifully
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
