'use client';

/**
 * Local skeleton shown while an image is uploading in the editor.
 * Apple-style: system gray, gentle breath animation, optional shimmer;
 * respects prefers-reduced-motion. Use the same dimensions as the target image area.
 * Pass rounded-full for avatar slots.
 */
export function ImageUploadSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`upload-skeleton relative overflow-hidden rounded-2xl ${className}`}
      aria-hidden
      role="presentation"
      aria-busy="true"
    />
  );
}
