'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { StoryBlock } from '@/types/cinematic';
import { AutoResizeTextarea } from './AutoResizeTextarea';
import { ImageUploader } from './ImageUploader';

interface MagazineSpreadLayoutProps {
  block: StoryBlock;
  onUpdate: (id: string, updates: Partial<StoryBlock>) => void;
}

/**
 * Magazine Spread Layout - New Yorker Editorial Style
 * Generous white space, sophisticated typography, editorial pacing
 * Perfect for thoughtful moments that deserve contemplation
 */
export const MagazineSpreadLayout = ({ block, onUpdate }: MagazineSpreadLayoutProps) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ 
    target: ref, 
    offset: ["start end", "end start"] 
  });
  
  // Subtle parallax for depth without distraction
  const imageY = useTransform(scrollYProgress, [0, 1], [-20, 20]);
  
  // Text fades in gracefully
  const textOpacity = useTransform(scrollYProgress, [0.2, 0.5], [0, 1]);
  const textY = useTransform(scrollYProgress, [0.2, 0.5], [40, 0]);

  const getImageFilter = () => {
    switch (block.imageFilter) {
      case 'grayscale': return 'grayscale(0.6) contrast(1.1)';
      case 'warm': return 'sepia(0.08) saturate(1.05)';
      case 'cool': return 'hue-rotate(-5deg) saturate(0.9)';
      case 'vibrant': return 'saturate(1.15) contrast(1.03)';
      case 'muted': return 'saturate(0.65) brightness(0.96)';
      default: return 'none';
    }
  };

  return (
    <section 
      ref={ref} 
      className="min-h-screen w-full flex flex-col md:flex-row bg-[#FDFCFB]"
    >
      {/* Image Panel - 55% with generous breathing room */}
      <div className="w-full md:w-[55%] h-[50vh] md:h-screen relative flex items-center justify-center p-8 md:p-12 lg:p-16">
        <motion.div 
          style={{ y: imageY }}
          className="w-full h-full max-h-[80vh] relative"
        >
          <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
            <motion.img 
              src={block.image} 
              alt="Story" 
              style={{ filter: getImageFilter() }}
              className="w-full h-full object-cover shadow-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 2, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </ImageUploader>
        </motion.div>
      </div>
      
      {/* Text Panel - 45% editorial space */}
      <div className="w-full md:w-[45%] flex items-center justify-center p-8 md:p-12 lg:p-16">
        <motion.div 
          style={{ opacity: textOpacity, y: textY }} 
          className="w-full max-w-md space-y-8"
        >
          {/* Drop cap style number or decorator */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.12 }}
            transition={{ duration: 1.5, delay: 0.3 }}
            className="text-[120px] font-serif leading-none text-black select-none"
          >
            •
          </motion.div>
          
          {/* Main text content */}
          <div className="space-y-6">
            <AutoResizeTextarea
              value={block.text}
              onChange={(val) => onUpdate(block.id, { text: val })}
              className="font-serif text-2xl md:text-3xl text-[#1A1A1A] leading-[1.5] tracking-[-0.01em]"
              placeholder="Tell the deeper story..."
            />
            
            {/* Optional pull quote or metadata */}
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              whileInView={{ opacity: 1, width: '100%' }}
              transition={{ duration: 1, delay: 0.6 }}
              className="border-t border-black/10 pt-6 mt-8"
            >
              <p className="text-xs tracking-[0.15em] uppercase text-black/40 font-light">
                {block.mood ? `${block.mood}` : 'A moment in time'}
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
