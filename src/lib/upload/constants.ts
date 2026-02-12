import type { UploadedImage } from '@/types/upload';

/** Number of steps in the upload flow (for top story-style progress bar). Step 0 = location, 1 = images, 2 = audio. */
export const UPLOAD_STEP_COUNT = 3;

/** Default placeholder images for the upload gallery — 3 landscape/scenery photos. */
export const DEFAULT_UPLOAD_IMAGES: UploadedImage[] = [
  {
    id: 'default-1',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'default-2',
    url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'default-3',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1000&auto=format&fit=crop',
  },
];
