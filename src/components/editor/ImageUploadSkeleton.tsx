'use client';

/**
 * Skeleton shown while an image is uploading in the editor.
 * Apple-style: system gray, gentle breath animation, shimmer sweep;
 * respects prefers-reduced-motion.
 *
 * Pass `showIcon` to render a cloud-upload icon + spinner in the center.
 * Pass `rounded-full` via className for avatar slots.
 */
export function ImageUploadSkeleton({
  className = '',
  showIcon = true,
}: {
  className?: string;
  showIcon?: boolean;
}) {
  return (
    <div
      className={`upload-skeleton relative overflow-hidden ${className}`}
      aria-hidden
      role="presentation"
      aria-busy="true"
    >
      {showIcon && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
          {/* Spinner ring */}
          <span className="h-5 w-5 rounded-full border-2 border-[#c7c7cc]/60 border-t-[#8e8e93] animate-spin" />
        </div>
      )}
    </div>
  );
}
