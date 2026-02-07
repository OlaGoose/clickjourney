'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { StoryBlock } from '@/types/cinematic';
import { AutoResizeTextarea } from './AutoResizeTextarea';
import { ImageUploader } from './ImageUploader';

interface SideBySideLayoutProps {
  block: StoryBlock;
  onUpdate: (id: string, updates: Partial<StoryBlock>) => void;
}

/**
 * Side by Side Layout - Kinfolk Editorial Style
 * Balanced composition with generous white space
 * Image and text in conversation, not competition
 */
export const SideBySideLayout = ({ block, onUpdate }: SideBySideLayoutProps) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ 
    target: ref, 
    offset: ["start end", "end start"] 
  });
  
  // Parallax depth: image moves slower than scroll
  const imageY = useTransform(scrollYProgress, [0, 1], [-30, 30]);
  
  // Editorial text entrance: slide in with elegance
  const textX = useTransform(scrollYProgress, [0, 0.4], [80, 0]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.3, 0.4], [0, 0.5, 1]);

  return (
    <section 
      ref={ref} 
      className="min-h-screen w-full flex flex-col md:flex-row bg-[#FAFAF9]"
    >
      {/* Image Panel - 3:2 golden ratio inspired */}
      <div className="w-full md:w-[58%] h-[55vh] md:h-screen relative overflow-hidden bg-[#E8E6E3]">
        <motion.div style={{ y: imageY }} className="h-full">
          <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
            <motion.img 
              src={block.image} 
              alt="Story" 
              className="w-full h-full object-cover filter grayscale-[0.15] contrast-[1.05] brightness-[0.98]"
              initial={{ scale: 1.08, opacity: 0.8 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ duration: 2, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </ImageUploader>
        </motion.div>
        
        {/* Subtle frame effect */}
        <div className="absolute inset-0 border-8 border-[#FAFAF9] pointer-events-none" />
      </div>
      
      {/* Text Panel - Kinfolk minimalism */}
      <div className="w-full md:w-[42%] flex items-center justify-center p-8 md:p-12 lg:p-16">
        <motion.div 
          style={{ x: textX, opacity: textOpacity }} 
          className="w-full max-w-md"
        >
          {/* Quote mark or decorative element */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 0.15, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-8xl font-serif text-[#2A2A2A] leading-none mb-4 select-none"
          >
            "
          </motion.div>
          
          <AutoResizeTextarea
            value={block.text}
            onChange={(val) => onUpdate(block.id, { text: val })}
            className="font-serif text-xl md:text-2xl lg:text-3xl text-[#2A2A2A] leading-[1.6] tracking-[-0.01em] border-l-2 border-[#2A2A2A]/10 pl-6"
            placeholder="Tell your story with nuance..."
          />
          
          {/* Subtle baseline decoration */}
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: 60 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="h-[1px] bg-[#2A2A2A]/20 mt-8"
          />
        </motion.div>
      </div>
    </section>
  );
};
