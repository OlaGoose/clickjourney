'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { StoryBlock } from '@/types/cinematic';
import { AutoResizeTextarea } from './AutoResizeTextarea';
import { ImageUploader } from './ImageUploader';

interface PortraitFeatureLayoutProps {
  block: StoryBlock;
  onUpdate: (id: string, updates: Partial<StoryBlock>) => void;
}

/**
 * Portrait Feature Layout - Human Connection
 * Vertical emphasis, intimate framing, storytelling through faces
 * Perfect for people, vertical compositions, emotional portraits
 */
export const PortraitFeatureLayout = ({ block, onUpdate }: PortraitFeatureLayoutProps) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ 
    target: ref, 
    offset: ["start end", "end start"] 
  });
  
  // Portrait reveal: soft zoom
  const scale = useTransform(scrollYProgress, [0, 0.5], [1.1, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0.7, 1]);
  
  // Text band slides in
  const textY = useTransform(scrollYProgress, [0.3, 0.6], [50, 0]);
  const textOpacity = useTransform(scrollYProgress, [0.3, 0.6], [0, 1]);

  const getImageFilter = () => {
    switch (block.imageFilter) {
      case 'grayscale': return 'grayscale(0.4) contrast(1.1)';
      case 'warm': return 'sepia(0.1) saturate(1.1) brightness(1.02)';
      case 'cool': return 'hue-rotate(-5deg) saturate(0.95)';
      case 'vibrant': return 'saturate(1.2) contrast(1.05)';
      case 'muted': return 'saturate(0.75) brightness(0.96)';
      default: return 'none';
    }
  };

  const textPosition = block.textPosition || 'bottom';

  return (
    <section 
      ref={ref} 
      className="min-h-screen w-full flex items-center justify-center bg-[#F8F7F5] p-4 md:p-8"
    >
      <div className="relative max-w-3xl w-full">
        {/* Portrait container with aspect ratio */}
        <div className="relative aspect-[3/4] md:aspect-[2/3] w-full overflow-hidden bg-black shadow-2xl">
          <motion.div 
            style={{ scale, opacity }}
            className="w-full h-full"
          >
            <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
              <motion.img 
                src={block.image} 
                alt="Portrait" 
                style={{ filter: getImageFilter() }}
                className="w-full h-full object-cover"
                initial={{ opacity: 0.8 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 2 }}
              />
              
              {/* Subtle frame effect */}
              <div className="absolute inset-0 border-8 border-white/5 pointer-events-none" />
            </ImageUploader>
          </motion.div>
          
          {/* Text band */}
          {textPosition === 'bottom' && (
            <motion.div 
              style={{ y: textY, opacity: textOpacity }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-6 md:p-8"
            >
              <AutoResizeTextarea
                value={block.text}
                onChange={(val) => onUpdate(block.id, { text: val })}
                className="text-xl md:text-2xl text-white font-serif leading-[1.4] tracking-tight"
                placeholder="Who is this person..."
              />
            </motion.div>
          )}
          
          {textPosition === 'top' && (
            <motion.div 
              style={{ y: -textY, opacity: textOpacity }}
              className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black via-black/90 to-transparent p-6 md:p-8"
            >
              <AutoResizeTextarea
                value={block.text}
                onChange={(val) => onUpdate(block.id, { text: val })}
                className="text-xl md:text-2xl text-white font-serif leading-[1.4] tracking-tight"
                placeholder="Who is this person..."
              />
            </motion.div>
          )}
        </div>
        
        {/* External caption for overlay positioning */}
        {textPosition === 'overlay' && (
          <motion.div 
            style={{ opacity: textOpacity }}
            className="absolute inset-0 flex items-center justify-center p-8 md:p-12 pointer-events-none"
          >
            <div className="bg-white/95 backdrop-blur-sm p-8 rounded-sm shadow-2xl pointer-events-auto max-w-md">
              <AutoResizeTextarea
                value={block.text}
                onChange={(val) => onUpdate(block.id, { text: val })}
                className="text-lg md:text-xl text-black font-serif leading-[1.5]"
                placeholder="Tell their story..."
              />
            </div>
          </motion.div>
        )}
        
        {/* Mood indicator */}
        {block.mood && textPosition !== 'overlay' && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.5 }}
            transition={{ delay: 1 }}
            className="mt-6 text-center text-xs tracking-[0.2em] uppercase text-black/50"
          >
            {block.mood}
          </motion.p>
        )}
      </div>
    </section>
  );
};
