'use client';

import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface ReflectionEndLayoutProps {
  onReplay: () => void;
}

/**
 * Reflection End Layout - Poetic Closure
 * Inspired by film credits and art book endings
 * Leaves space for contemplation
 */
export const ReflectionEndLayout = ({ onReplay }: ReflectionEndLayoutProps) => {
  return (
    <section className="h-screen w-full bg-black flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
      {/* Subtle ambient gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-white/[0.02] via-transparent to-transparent" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="space-y-8 relative z-10 max-w-2xl"
      >
        {/* Decorative top line */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          transition={{ duration: 1.5, delay: 0.5 }}
          className="w-24 h-px bg-white/10 mx-auto mb-12"
        />
        
        {/* Main ending mark */}
        <motion.h2 
          initial={{ opacity: 0, letterSpacing: '0.3em' }}
          whileInView={{ opacity: 1, letterSpacing: '0.1em' }}
          transition={{ duration: 2, delay: 0.8 }}
          className="font-serif text-6xl md:text-8xl text-white tracking-wider font-light"
        >
          Fin.
        </motion.h2>
        
        {/* Poetic closing line */}
        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.4 }}
          transition={{ duration: 2, delay: 1.2 }}
          className="font-serif text-lg md:text-xl text-white font-light tracking-wide leading-relaxed px-6"
        >
          Every journey leaves its mark,<br />
          every memory tells its story.
        </motion.p>
        
        {/* Decorative bottom line */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          transition={{ duration: 1.5, delay: 1.5 }}
          className="w-24 h-px bg-white/10 mx-auto mt-12"
        />
        
        {/* Replay button */}
        <motion.button 
          onClick={onReplay}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 0.3, scale: 1 }}
          whileHover={{ opacity: 0.8, scale: 1.05 }}
          transition={{ duration: 0.5, delay: 2 }}
          className="mt-16 text-white/30 hover:text-white/80 transition-all duration-500 group"
          aria-label="Replay memory"
        >
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-700" />
            <span className="text-xs tracking-widest uppercase font-light">Relive</span>
          </div>
        </motion.button>
      </motion.div>
      
      {/* Subtle vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.8)] pointer-events-none" />
    </section>
  );
};
