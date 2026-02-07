'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { StoryBlock } from '@/types/cinematic';
import { AutoResizeTextarea } from './AutoResizeTextarea';
import { ImageUploader } from './ImageUploader';

interface MinimalCaptionLayoutProps {
  block: StoryBlock;
  onUpdate: (id: string, updates: Partial<StoryBlock>) => void;
}

/**
 * Minimal Caption Layout - Image First Philosophy
 * 95% powerful image, 5% whisper of text
 * Let the photograph do the talking
 */
export const MinimalCaptionLayout = ({ block, onUpdate }: MinimalCaptionLayoutProps) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ 
    target: ref, 
    offset: ["start end", "end start"] 
  });
  
  // Slow zoom for atmosphere
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1, 1.05]);
  
  // Caption fades in late, subtle
  const captionOpacity = useTransform(scrollYProgress, [0.4, 0.6, 0.9], [0, 1, 0.7]);
  const captionY = useTransform(scrollYProgress, [0.4, 0.6], [20, 0]);

  const getImageFilter = () => {
    switch (block.imageFilter) {
      case 'grayscale': return 'grayscale(0.5) contrast(1.15)';
      case 'warm': return 'sepia(0.12) saturate(1.08) brightness(1.01)';
      case 'cool': return 'hue-rotate(-8deg) saturate(0.92) brightness(0.99)';
      case 'vibrant': return 'saturate(1.25) contrast(1.08)';
      case 'muted': return 'saturate(0.6) brightness(0.94) contrast(0.98)';
      default: return 'none';
    }
  };

  const getTextPosition = () => {
    const pos = block.textPosition || 'bottom';
    const baseClasses = "absolute z-20 px-8 md:px-12";
    
    switch (pos) {
      case 'top': return `${baseClasses} top-8 md:top-12 left-0 right-0`;
      case 'bottom': return `${baseClasses} bottom-8 md:bottom-12 left-0 right-0`;
      case 'left': return `${baseClasses} left-8 md:left-12 top-1/2 -translate-y-1/2`;
      case 'right': return `${baseClasses} right-8 md:right-12 top-1/2 -translate-y-1/2 text-right`;
      default: return `${baseClasses} bottom-8 md:bottom-12 left-0 right-0`;
    }
  };

  return (
    <section 
      ref={ref} 
      className="relative h-screen w-full overflow-hidden bg-black"
    >
      {/* Full bleed image */}
      <motion.div 
        style={{ scale }} 
        className="absolute inset-0"
      >
        <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
          <motion.img 
            src={block.image} 
            alt="Story" 
            style={{ filter: getImageFilter() }}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 2 }}
          />
          
          {/* Subtle vignette */}
          <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.3)]" />
        </ImageUploader>
      </motion.div>
      
      {/* Minimal text caption */}
      <motion.div 
        style={{ opacity: captionOpacity, y: captionY }}
        className={getTextPosition()}
      >
        <AutoResizeTextarea
          value={block.text}
          onChange={(val) => onUpdate(block.id, { text: val })}
          className="text-sm md:text-base text-white/90 font-light tracking-wide leading-relaxed drop-shadow-lg max-w-2xl"
          placeholder="A whisper of context..."
        />
      </motion.div>
      
      {/* Optional corner accent */}
      {block.mood && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.25 }}
          transition={{ delay: 1, duration: 2 }}
          className="absolute top-8 right-8 text-[10px] tracking-[0.3em] uppercase text-white font-light"
        >
          {block.mood}
        </motion.div>
      )}
    </section>
  );
};
