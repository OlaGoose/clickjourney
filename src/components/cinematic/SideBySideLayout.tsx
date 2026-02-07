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

export const SideBySideLayout = ({ block, onUpdate }: SideBySideLayoutProps) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ 
    target: ref, 
    offset: ["start end", "end start"] 
  });
  const x = useTransform(scrollYProgress, [0, 0.5], [50, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  return (
    <section 
      ref={ref} 
      className="min-h-screen w-full flex flex-col md:flex-row bg-[#050505]"
    >
      <div className="w-full md:w-[60%] h-[50vh] md:h-screen relative overflow-hidden">
        <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
          <motion.img 
            src={block.image} 
            alt="Story" 
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ scale: 1.1 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </ImageUploader>
      </div>
      <div className="w-full md:w-[40%] flex items-center justify-center p-8 md:p-16">
        <motion.div style={{ x, opacity }} className="w-full">
          <AutoResizeTextarea
            value={block.text}
            onChange={(val) => onUpdate(block.id, { text: val })}
            className="font-sans text-lg md:text-xl text-gray-300 leading-relaxed pl-4"
            placeholder="Write your story..."
          />
        </motion.div>
      </div>
    </section>
  );
};
