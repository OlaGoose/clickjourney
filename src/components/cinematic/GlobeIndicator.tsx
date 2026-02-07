'use client';

import { motion, useTransform, MotionValue } from 'framer-motion';

interface GlobeIndicatorProps {
  scrollYProgress: MotionValue<number>;
}

export const GlobeIndicator = ({ scrollYProgress }: GlobeIndicatorProps) => {
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);
  
  return (
    <div className="fixed top-6 right-6 z-50 mix-blend-difference pointer-events-none">
      <div className="relative w-12 h-12">
        <motion.div 
          style={{ rotate }}
          className="w-full h-full rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg"
        >
          <div className="w-8 h-8 rounded-full relative overflow-hidden opacity-60">
            {/* Clean, borderless indicator */}
            <div className="absolute top-2 left-0 w-full h-[1px] bg-white/50"></div>
            <div className="absolute top-5 left-0 w-full h-[1px] bg-white/50"></div>
            <div className="absolute top-0 left-3 h-full w-[1px] bg-white/50"></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
