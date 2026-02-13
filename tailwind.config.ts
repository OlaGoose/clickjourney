import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Safelist classes used in ternary/dynamic branches so production purge keeps them (vlog/upload day-night, StoryStepBar)
  safelist: [
    'dark',
    'bg-white/30',
    'bg-white/80',
    'flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-95 bg-gray-800 text-white dark:bg-white/20 dark:text-white',
    'flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-95 bg-black hover:bg-gray-800 text-white',
    'flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 bg-black text-white hover:bg-gray-800',
    'flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 bg-black/5 text-gray-600 hover:bg-black/10 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'orbit-black': '#09090b',
        'orbit-yellow': '#fbbf24',
        'orbit-zinc': '#18181b',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-radial-at-t': 'radial-gradient(ellipse at top, var(--tw-gradient-stops))',
        'gradient-radial-at-b': 'radial-gradient(ellipse at bottom, var(--tw-gradient-stops))',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        /* iOS-style sheet: straight pull up, no overshoot */
        sheetSlideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        sheetSlideDown: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        /* Block type menu: subtle scale + fade */
        menuPopIn: {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        ping: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
        fadeInUp: 'fadeInUp 0.4s ease-out',
        ping: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        shimmer: 'shimmer 2s infinite',
        sheetSlideUp: 'sheetSlideUp 0.35s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        sheetSlideDown: 'sheetSlideDown 0.32s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        menuPopIn: 'menuPopIn 0.28s cubic-bezier(0.32, 0.72, 0, 1) forwards',
      },
      transitionTimingFunction: {
        ios: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      transitionDuration: {
        ios: '400ms',
      },
    },
  },
  plugins: [],
};

export default config;
