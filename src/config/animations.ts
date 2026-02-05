/**
 * Animation config for auth and UI (orbit-journey style)
 */

export const ANIMATION_DURATION = {
  INSTANT: 0.1,
  FAST: 0.15,
  NORMAL: 0.2,
  MEDIUM: 0.25,
  SLOW: 0.3,
} as const;

export const ANIMATION_DELAY = {
  NONE: 0,
  MICRO: 0.05,
  SMALL: 0.1,
  NORMAL: 0.15,
} as const;

export const SPRING_CONFIG = {
  FAST: { type: 'spring' as const, stiffness: 400, damping: 25 },
  NORMAL: { type: 'spring' as const, stiffness: 350, damping: 20 },
  SMOOTH: { type: 'spring' as const, stiffness: 300, damping: 30 },
} as const;
