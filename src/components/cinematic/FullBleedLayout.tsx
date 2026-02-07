'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { StoryBlock } from '@/types/cinematic';
import { AutoResizeTextarea } from './AutoResizeTextarea';
import { ImageUploader } from './ImageUploader';

interface FullBleedLayoutProps {
  block: StoryBlock;
  onUpdate: (id: string, updates: Partial<StoryBlock>) => void;
}

/**
 * Full Bleed Layout - National Geographic Style
 * Epic, immersive opening that commands attention
 * Uses Ken Burns effect with sophisticated gradients
 */
export const FullBleedLayout = ({ block, onUpdate }: FullBleedLayoutProps) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ 
    target: ref, 
    offset: ["start end", "end start"] 
  });
  
  // Enhanced Ken Burns effect: subtle zoom with parallax
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.05, 1, 1.18]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 50]);
  
  // Sophisticated text entrance: fade + slight upward motion
  const textOpacity = useTransform(scrollYProgress, [0.3, 0.5, 0.8, 1], [0, 1, 1, 0]);
  const textY = useTransform(scrollYProgress, [0.3, 0.5, 0.9, 1], [30, 0, 0, -20]);
  
  // Dynamic gradient that responds to scroll
  const gradientOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.7, 0.85, 0.95]);

  return (
    <section 
      ref={ref} 
      className="relative h-screen w-full overflow-hidden flex items-end justify-center group"
    >
      {/* Image with Ken Burns effect */}
      <motion.div 
        style={{ scale, y }} 
        className="absolute inset-0 z-0"
      >
        <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
          <img 
            src={block.image} 
            alt="Story" 
            className="w-full h-full object-cover filter brightness-95 contrast-105" 
          />
          {/* Cinematic gradients - layered for depth */}
          <motion.div 
            style={{ opacity: gradientOpacity }}
            className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-transparent" />
          
          {/* Edge vignette for focus */}
          <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.4)]" />
        </ImageUploader>
      </motion.div>
      
      {/* Text with elegant entrance */}
      <motion.div 
        style={{ opacity: textOpacity, y: textY }} 
        className="relative z-10 w-full max-w-3xl text-center pb-32 px-8"
      >
        {/* Decorative line above text */}
        <motion.div 
          initial={{ width: 0 }}
          whileInView={{ width: 80 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          className="h-px bg-white/40 mx-auto mb-8"
        />
        
        <AutoResizeTextarea
          value={block.text}
          onChange={(val) => onUpdate(block.id, { text: val })}
          className="font-serif text-3xl md:text-5xl lg:text-6xl text-white text-center leading-[1.3] tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] font-light"
          placeholder="Epic opening line..."
        />
        
        {/* Subtle glow effect on text */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-transparent pointer-events-none blur-xl" />
      </motion.div>
    </section>
  );
};
