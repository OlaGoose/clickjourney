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

export const FullBleedLayout = ({ block, onUpdate }: FullBleedLayoutProps) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ 
    target: ref, 
    offset: ["start end", "end start"] 
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const opacity = useTransform(scrollYProgress, [0.7, 1], [1, 0]);

  return (
    <section 
      ref={ref} 
      className="relative h-screen w-full overflow-hidden flex items-end justify-center group"
    >
      <motion.div style={{ scale }} className="absolute inset-0 z-0">
        <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
          <img 
            src={block.image} 
            alt="Story" 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
        </ImageUploader>
      </motion.div>
      <motion.div 
        style={{ opacity }} 
        className="relative z-10 w-full max-w-2xl text-center pb-24 px-6"
      >
        <AutoResizeTextarea
          value={block.text}
          onChange={(val) => onUpdate(block.id, { text: val })}
          className="font-serif text-2xl md:text-4xl text-white text-center leading-relaxed drop-shadow-xl"
          placeholder="Write your story..."
        />
      </motion.div>
    </section>
  );
};
