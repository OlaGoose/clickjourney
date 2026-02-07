'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { StoryBlock } from '@/types/cinematic';
import { AutoResizeTextarea } from './AutoResizeTextarea';
import { ImageUploader } from './ImageUploader';

interface HeroSplitLayoutProps {
  block: StoryBlock;
  onUpdate: (id: string, updates: Partial<StoryBlock>) => void;
}

/**
 * Hero Split Layout - Airbnb Experience Style
 * Asymmetric power composition: 70% stunning image + 30% bold typography
 * Perfect for strong verticals, architectural beauty, portraits with presence
 */
export const HeroSplitLayout = ({ block, onUpdate }: HeroSplitLayoutProps) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ 
    target: ref, 
    offset: ["start end", "end start"] 
  });
  
  // Image parallax with depth
  const imageY = useTransform(scrollYProgress, [0, 1], [-50, 50]);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.05, 1, 1.02]);
  
  // Text entrance: slide from right with authority
  const textX = useTransform(scrollYProgress, [0, 0.4], [100, 0]);
  const textOpacity = useTransform(scrollYProgress, [0.1, 0.4], [0, 1]);

  const getImageFilter = () => {
    switch (block.imageFilter) {
      case 'grayscale': return 'grayscale(0.3) contrast(1.1)';
      case 'warm': return 'sepia(0.15) saturate(1.1) brightness(1.02)';
      case 'cool': return 'hue-rotate(-10deg) saturate(0.95) brightness(0.98)';
      case 'vibrant': return 'saturate(1.2) contrast(1.05)';
      case 'muted': return 'saturate(0.7) brightness(0.95)';
      default: return 'none';
    }
  };

  return (
    <section 
      ref={ref} 
      className="min-h-screen w-full flex flex-col md:flex-row bg-white"
    >
      {/* Image Panel - 70% dominant presence */}
      <div className="w-full md:w-[70%] h-[60vh] md:h-screen relative overflow-hidden bg-black">
        <motion.div 
          style={{ y: imageY, scale: imageScale }}
          className="h-[110%] w-full absolute -top-[5%]"
        >
          <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
            <motion.img 
              src={block.image} 
              alt="Story" 
              style={{ filter: getImageFilter() }}
              className="w-full h-full object-cover"
              initial={{ opacity: 0.8, scale: 1.1 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 2.5, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </ImageUploader>
        </motion.div>
        
        {/* Edge gradient for seamless blend */}
        <div className="absolute top-0 right-0 bottom-0 w-32 bg-gradient-to-l from-white via-white/50 to-transparent hidden md:block" />
      </div>
      
      {/* Text Panel - 30% bold statement */}
      <div className="w-full md:w-[30%] flex items-center justify-center p-8 md:p-10 lg:p-12 bg-white">
        <motion.div 
          style={{ x: textX, opacity: textOpacity }} 
          className="w-full h-full flex flex-col justify-center"
        >
          {/* Minimal decorative element */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-12 h-0.5 bg-black mb-8 origin-left"
          />
          
          <AutoResizeTextarea
            value={block.text}
            onChange={(val) => onUpdate(block.id, { text: val })}
            className="font-serif text-3xl md:text-4xl lg:text-5xl text-black leading-[1.2] tracking-tight font-medium mb-0"
            placeholder="Bold statement..."
          />
          
          {/* Subtle bottom accent */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 0.4, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mt-auto pt-8 text-xs tracking-[0.2em] uppercase text-black/40"
          >
            {block.mood || 'Moment'}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
