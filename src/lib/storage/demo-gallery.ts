/**
 * Shared pool of reliable demo gallery image URLs.
 * Used for demo carousel items (0–8 images).
 * Picsum IDs are stable and avoid cross-origin/loading issues.
 */

const PICSUM_BASE = 'https://picsum.photos/id';

/** At least 8 URLs for 0–7 (or 0–8) image-count demos. */
export const DEMO_GALLERY_IMAGES: readonly string[] = [
  `${PICSUM_BASE}/1015/720/480`,
  `${PICSUM_BASE}/1016/720/480`,
  `${PICSUM_BASE}/1018/720/480`,
  `${PICSUM_BASE}/1019/720/480`,
  `${PICSUM_BASE}/1020/720/480`,
  `${PICSUM_BASE}/1021/720/480`,
  `${PICSUM_BASE}/1022/720/480`,
  `${PICSUM_BASE}/1023/720/480`,
  `${PICSUM_BASE}/1024/720/480`,
] as const;

/** Return first n images from the demo pool (n in 0..length). */
export function getDemoGallerySlice(n: number): string[] {
  const len = DEMO_GALLERY_IMAGES.length;
  if (n <= 0) return [];
  return DEMO_GALLERY_IMAGES.slice(0, Math.min(n, len)) as string[];
}
