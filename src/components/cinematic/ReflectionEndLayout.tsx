'use client';

import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface ReflectionEndLayoutProps {
  onReplay: () => void;
}

export const ReflectionEndLayout = ({ onReplay }: ReflectionEndLayoutProps) => {
  return (
    <section className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center text-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="space-y-6"
      >
        <h2 className="font-serif text-5xl md:text-7xl text-white tracking-tight">Fin.</h2>
        <p className="font-sans text-gray-500 font-light tracking-wide">Every journey changes you.</p>
        
        <button 
          onClick={onReplay}
          className="mt-8 text-white/40 hover:text-white transition-colors"
          aria-label="Replay"
        >
          <RefreshCw size={24} />
        </button>
      </motion.div>
    </section>
  );
};
