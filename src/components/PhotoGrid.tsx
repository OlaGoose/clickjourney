'use client';

import { useMemo } from 'react';

/** Tailwind: outer 36px, inner 6px (1:1 with reference). Every cell gets explicit per-corner classes. */
const R = {
  tl: 'rounded-tl-[36px]',
  tr: 'rounded-tr-[36px]',
  bl: 'rounded-bl-[36px]',
  br: 'rounded-br-[36px]',
  tl6: 'rounded-tl-[6px]',
  tr6: 'rounded-tr-[6px]',
  bl6: 'rounded-bl-[6px]',
  br6: 'rounded-br-[6px]',
  all6: 'rounded-tl-[6px] rounded-tr-[6px] rounded-bl-[6px] rounded-br-[6px]',
  all36: 'rounded-[36px]',
} as const;

export type PhotoGridLayout = 1 | 2 | 3 | 4 | 5 | 6;

export interface PhotoGridCell {
  colSpan?: number;
  rowSpan?: number;
  /** Explicit 4-corner rounded classes so middle cells also show 6px. */
  rounded: string;
  position: string;
}

/** Layouts 1–6: outer corners 36px, all inner/middle corners 6px. */
const LAYOUTS: Record<PhotoGridLayout, { gridClass: string; cells: PhotoGridCell[] }> = {
  1: {
    gridClass: 'grid grid-cols-1 grid-rows-1',
    cells: [{ rounded: R.all36, position: 'full' }],
  },
  2: {
    gridClass: 'grid grid-cols-2 grid-rows-1',
    cells: [
      { rounded: `${R.tl} ${R.bl} ${R.tr6} ${R.br6}`, position: 'left' },
      { rounded: `${R.tr} ${R.br} ${R.tl6} ${R.bl6}`, position: 'right' },
    ],
  },
  3: {
    gridClass: 'grid grid-cols-2 grid-rows-2',
    cells: [
      { rowSpan: 2, rounded: `${R.tl} ${R.bl} ${R.tr6} ${R.br6}`, position: 'left' },
      { rounded: `${R.tr} ${R.tl6} ${R.bl6} ${R.br6}`, position: 'topRight' },
      { rounded: `${R.br} ${R.tl6} ${R.tr6} ${R.bl6}`, position: 'bottomRight' },
    ],
  },
  4: {
    gridClass: 'grid grid-cols-2 grid-rows-2',
    cells: [
      { rounded: `${R.tl} ${R.tr6} ${R.bl6} ${R.br6}`, position: 'topLeft' },
      { rounded: `${R.tr} ${R.tl6} ${R.bl6} ${R.br6}`, position: 'topRight' },
      { rounded: `${R.bl} ${R.tl6} ${R.tr6} ${R.br6}`, position: 'bottomLeft' },
      { rounded: `${R.br} ${R.tl6} ${R.tr6} ${R.bl6}`, position: 'bottomRight' },
    ],
  },
  5: {
    gridClass: 'grid grid-cols-3 grid-rows-2',
    cells: [
      { rowSpan: 2, rounded: `${R.tl} ${R.bl} ${R.tr6} ${R.br6}`, position: 'left' },
      { rounded: R.all6, position: 'topMid' },
      { rounded: `${R.tr} ${R.tl6} ${R.bl6} ${R.br6}`, position: 'topRight' },
      { rounded: R.all6, position: 'bottomLeft' },
      { rounded: `${R.tl6} ${R.tr6} ${R.bl6} ${R.br}`, position: 'bottomRight' },
    ],
  },
  6: {
    gridClass: 'grid grid-cols-3 grid-rows-2',
    cells: [
      { rounded: `${R.tl} ${R.bl6} ${R.tr6} ${R.br6}`, position: 'topLeft' },
      { rounded: R.all6, position: 'topMid' },
      { rounded: `${R.tr} ${R.tl6} ${R.bl6} ${R.br6}`, position: 'topRight' },
      { rounded: `${R.bl} ${R.tl6} ${R.tr6} ${R.br6}`, position: 'bottomLeft' },
      { rounded: R.all6, position: 'bottomMid' },
      { rounded: `${R.br} ${R.tl6} ${R.tr6} ${R.bl6}`, position: 'bottomRight' },
    ],
  },
};

/** “More images” overlay: icon only at bottom-right (when >6 photos), small, white 80%. */
function MoreImagesIcon({ onClick, ariaLabel }: { onClick: () => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute bottom-2 right-2 flex items-center justify-center text-white/80 transition-opacity hover:opacity-100"
      aria-label={ariaLabel}
    >
      <svg
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.43"
        aria-hidden
      >
        <path d="m9.37 10.02c.18-1.04.46-2.59.82-4.67.38-2.18 2.46-3.63 4.63-3.24l11.82 2.08c2.18.38 3.63 2.46 3.24 4.63l-2.08 11.82c-.38 2.18-2.46 3.63-4.63 3.24-.51-.09-.9-.16-1.15-.2" />
        <path d="m6 10h12c2.21 0 4 1.79 4 4v12c0 2.21-1.79 4-4 4H6c-2.21 0-4-1.79-4-4V14c0-2.21 1.79-4 4-4z" />
      </svg>
    </button>
  );
}

export interface PhotoGridProps {
  images: string[];
  onImageClick?: (index: number) => void;
  totalCount?: number;
  /** When true, show “更多图片” overlay on bottom-right of last photo (no extra cell). */
  hasMoreImages?: boolean;
  ariaLabel?: string;
  className?: string;
}

const MAX_PHOTOS = 6;

export default function PhotoGrid({
  images,
  onImageClick,
  totalCount,
  hasMoreImages = false,
  ariaLabel = 'Photo gallery',
  className = '',
}: PhotoGridProps) {
  const displayImages = useMemo(() => images.slice(0, MAX_PHOTOS), [images]);
  const count = displayImages.length;
  const layoutCount = (count || 1) as PhotoGridLayout;
  const layout = LAYOUTS[layoutCount];
  const total = totalCount ?? images.length;

  if (!layout) return null;

  const isFourGrid = layoutCount === 4;
  const isSingleImage = layoutCount === 1;
  const aspectClass = isFourGrid ? 'aspect-square' : 'aspect-[3/2]';
  const gridClass = `grid gap-[8px] ${aspectClass} max-h-[480px] w-full ${layout.gridClass}`;
  const roundClass = isSingleImage ? 'overflow-hidden rounded-[36px]' : '';
  const rootClass = [gridClass, roundClass, className].filter(Boolean).join(' ');

  return (
    <div className={rootClass} role="group" aria-label={ariaLabel}>
      {layout.cells.map((cell, i) => {
        const imageIndex = i;
        const src = displayImages[imageIndex];
        const isLastCell = i === layout.cells.length - 1;
        const showMoreOverlay = hasMoreImages && isLastCell && count > 0;

        const style = {
          ...(cell.colSpan && { gridColumn: `span ${cell.colSpan}` }),
          ...(cell.rowSpan && { gridRow: `span ${cell.rowSpan}` }),
        };

        return (
          <button
            key={cell.position}
            type="button"
            onClick={() => onImageClick?.(imageIndex)}
            style={style}
            className={`col-span-1 relative flex min-h-0 overflow-hidden rounded-none bg-gray-200 ${cell.rounded}`}
            aria-label={
              total > 0 ? `第 ${imageIndex + 1} 张照片，共 ${total} 张，打开照片库` : undefined
            }
          >
            {src && (
              <img
                src={src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading={imageIndex < 2 ? 'eager' : 'lazy'}
                fetchPriority={imageIndex === 0 ? 'high' : undefined}
              />
            )}
            {showMoreOverlay && (
              <MoreImagesIcon
                onClick={() => onImageClick?.(0)}
                ariaLabel="打开媒体库，查看更多图片"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
