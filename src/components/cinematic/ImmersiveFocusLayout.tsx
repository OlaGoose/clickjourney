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

export const ImmersiveFocusLayout = ({ block, onUpdate }: ImmersiveFocusLayoutProps) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ 
    target: ref, 
    offset: ["start end", "end start"] 
  });
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.8, 1]);
  const borderRadius = useTransform(scrollYProgress, [0, 0.5], ["40px", "0px"]);

  return (
    <section 
      ref={ref} 
      className="h-screen w-full bg-black flex flex-col items-center justify-center relative overflow-hidden"
    >
      <motion.div 
        style={{ scale, borderRadius }} 
        className="w-full h-full absolute inset-0 overflow-hidden"
      >
        <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
          <img 
            src={block.image} 
            alt="Story" 
            className="w-full h-full object-cover opacity-50" 
          />
          <div className="absolute inset-0 bg-black/20" />
        </ImageUploader>
      </motion.div>
      <div className="z-10 w-full max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <AutoResizeTextarea
            value={block.text}
            onChange={(val) => onUpdate(block.id, { text: val })}
            className="font-serif text-3xl md:text-5xl text-white font-bold text-center mix-blend-overlay"
            placeholder="Focus moment..."
          />
        </motion.div>
      </div>
    </section>
  );
};
