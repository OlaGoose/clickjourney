'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { StoryBlock } from '@/types/cinematic';
import { AutoResizeTextarea } from './AutoResizeTextarea';
import { ImageUploader } from './ImageUploader';

interface ImmersiveFocusLayoutProps {
  block: StoryBlock;
  onUpdate: (id: string, updates: Partial<StoryBlock>) => void;
}

/**
 * Immersive Focus Layout - Emotional Climax
 * Draws viewer into the moment with bold, centered composition
 * Inspired by Apple's Hero sections and fashion editorial
 */
export const ImmersiveFocusLayout = ({ block, onUpdate }: ImmersiveFocusLayoutProps) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ 
    target: ref, 
    offset: ["start end", "end start"] 
  });
  
  // Dramatic entrance: scale + border-radius transition
  const scale = useTransform(scrollYProgress, [0, 0.4, 0.6], [0.75, 1, 1.05]);
  const borderRadius = useTransform(scrollYProgress, [0, 0.3], ["60px", "0px"]);
  
  // Image opacity for dreamy effect
  const imageOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.3, 0.6, 0.6, 0.4]);
  
  // Text: bold entrance with scale
  const textOpacity = useTransform(scrollYProgress, [0.2, 0.4, 0.8], [0, 1, 1]);
  const textScale = useTransform(scrollYProgress, [0.2, 0.4], [0.9, 1]);
  const textY = useTransform(scrollYProgress, [0.2, 0.4, 0.8, 1], [40, 0, 0, -30]);

  return (
    <section 
      ref={ref} 
      className="h-screen w-full bg-black flex flex-col items-center justify-center relative overflow-hidden"
    >
      {/* Background image with dramatic reveal */}
      <motion.div 
        style={{ scale, borderRadius }} 
        className="w-full h-full absolute inset-0 overflow-hidden"
      >
        <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
          <motion.img 
            src={block.image} 
            alt="Story" 
            style={{ opacity: imageOpacity }}
            className="w-full h-full object-cover filter contrast-110 saturate-110" 
          />
          
          {/* Multi-layer overlay for depth */}
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/30 to-black/60" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />
          
          {/* Atmospheric grain effect */}
          <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]" />
        </ImageUploader>
      </motion.div>
      
      {/* Centered text with maximum impact */}
      <motion.div 
        style={{ opacity: textOpacity, scale: textScale, y: textY }}
        className="z-10 w-full max-w-4xl px-8 md:px-12 text-center"
      >
        {/* Optional decorative frame */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          className="w-full h-px bg-white/20 mb-12 origin-center"
        />
        
        <AutoResizeTextarea
          value={block.text}
          onChange={(val) => onUpdate(block.id, { text: val })}
          className="font-serif text-4xl md:text-6xl lg:text-7xl text-white text-center leading-[1.2] tracking-tighter font-medium drop-shadow-[0_8px_32px_rgba(0,0,0,0.9)] mix-blend-screen"
          placeholder="The moment that matters..."
        />
        
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 0.7 }}
          className="w-full h-px bg-white/20 mt-12 origin-center"
        />
        
        {/* Radial glow for text */}
        <div className="absolute inset-0 bg-gradient-radial from-white/5 via-transparent to-transparent blur-3xl pointer-events-none" />
      </motion.div>
    </section>
  );
};
