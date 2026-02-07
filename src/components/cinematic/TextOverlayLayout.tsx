'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { StoryBlock } from '@/types/cinematic';
import { AutoResizeTextarea } from './AutoResizeTextarea';
import { ImageUploader } from './ImageUploader';

interface TextOverlayLayoutProps {
  block: StoryBlock;
  onUpdate: (id: string, updates: Partial<StoryBlock>) => void;
}

/**
 * Text Overlay Layout - Bold Graphic Statement
 * Text becomes part of the image composition
 * Perfect for strong colors, simple compositions, impactful messages
 */
export const TextOverlayLayout = ({ block, onUpdate }: TextOverlayLayoutProps) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ 
    target: ref, 
    offset: ["start end", "end start"] 
  });
  
  // Subtle parallax
  const y = useTransform(scrollYProgress, [0, 1], [-30, 30]);
  
  // Text reveals with power
  const textScale = useTransform(scrollYProgress, [0.2, 0.5], [0.95, 1]);
  const textOpacity = useTransform(scrollYProgress, [0.2, 0.5], [0, 1]);

  const getImageFilter = () => {
    switch (block.imageFilter) {
      case 'grayscale': return 'grayscale(0.7) contrast(1.2)';
      case 'warm': return 'sepia(0.2) saturate(1.15) brightness(1.03)';
      case 'cool': return 'hue-rotate(-15deg) saturate(0.9) brightness(0.97)';
      case 'vibrant': return 'saturate(1.3) contrast(1.1)';
      case 'muted': return 'saturate(0.5) brightness(0.92)';
      default: return 'contrast(1.05) saturate(1.1)';
    }
  };

  const getTextSize = () => {
    switch (block.textSize) {
      case 'small': return 'text-2xl md:text-3xl';
      case 'medium': return 'text-3xl md:text-5xl';
      case 'large': return 'text-4xl md:text-6xl lg:text-7xl';
      case 'huge': return 'text-5xl md:text-7xl lg:text-8xl xl:text-9xl';
      default: return 'text-4xl md:text-6xl lg:text-7xl';
    }
  };

  const getTextAlignment = () => {
    const pos = block.textPosition || 'center';
    switch (pos) {
      case 'top': return 'items-start pt-20';
      case 'bottom': return 'items-end pb-20';
      case 'left': return 'items-center justify-start pl-12 md:pl-20';
      case 'right': return 'items-center justify-end pr-12 md:pr-20 text-right';
      default: return 'items-center justify-center';
    }
  };

  return (
    <section 
      ref={ref} 
      className="relative h-screen w-full overflow-hidden bg-black"
    >
      {/* Background image with blend mode */}
      <motion.div 
        style={{ y }} 
        className="absolute inset-0"
      >
        <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
          <motion.img 
            src={block.image} 
            alt="Story" 
            style={{ filter: getImageFilter() }}
            className="w-full h-full object-cover opacity-90 mix-blend-multiply"
            initial={{ scale: 1.1, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 0.9 }}
            transition={{ duration: 2.5 }}
          />
          
          {/* Overlay for better text contrast */}
          <div className="absolute inset-0 bg-black/20" />
        </ImageUploader>
      </motion.div>
      
      {/* Bold overlaid text */}
      <div className={`relative z-10 h-full flex flex-col ${getTextAlignment()} px-8 md:px-12`}>
        <motion.div
          style={{ scale: textScale, opacity: textOpacity }}
          className="max-w-5xl"
        >
          {/* Text with dramatic presence */}
          <AutoResizeTextarea
            value={block.text}
            onChange={(val) => onUpdate(block.id, { text: val })}
            className={`${getTextSize()} text-white font-bold leading-[1.1] tracking-tighter drop-shadow-[0_8px_32px_rgba(0,0,0,0.9)] mix-blend-screen`}
            placeholder="Make a statement..."
          />
          
          {/* Decorative underline */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-1 md:h-1.5 bg-white/80 mt-6 md:mt-8 origin-left"
            style={{ width: '120px' }}
          />
        </motion.div>
      </div>
      
      {/* Optional mood badge */}
      {block.mood && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 0.7, y: 0 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-8 right-8 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-xs tracking-widest uppercase text-white/90"
        >
          {block.mood}
        </motion.div>
      )}
    </section>
  );
};
