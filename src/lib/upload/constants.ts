import type { UploadedImage } from '@/types/upload';

/** Default placeholder images for the upload gallery (warm, reference-style). */
export const DEFAULT_UPLOAD_IMAGES: UploadedImage[] = [
  {
    id: 'default-1',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'default-2',
    url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'default-3',
    url: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1000&auto=format&fit=crop',
  },
];
