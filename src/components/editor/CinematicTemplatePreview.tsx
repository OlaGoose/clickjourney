'use client';

import type { LayoutType } from '@/types/cinematic';

/** 模板布局的微型预览：柔和渐变 + 细线示意，不依赖真实图片 */
export function CinematicTemplatePreview({ layout, className }: { layout: LayoutType; className?: string }) {
  const root = `rounded-xl overflow-hidden flex shadow-sm border border-black/[0.06] ${className ?? ''}`;
  const imgZone = 'bg-gradient-to-br from-neutral-300 to-neutral-400';
  const textZone = 'bg-neutral-100';
  const textLine = 'bg-neutral-300/80 rounded-full';

  switch (layout) {
    case 'full_bleed':
      return (
        <div className={`${root} flex-col w-full h-[56px]`}>
          <div className={`flex-1 min-h-[34px] rounded-t-xl ${imgZone}`} />
          <div className={`h-2.5 rounded-b-xl ${textZone} flex items-center px-1.5`}>
            <div className={`h-0.5 w-[80%] ${textLine}`} />
          </div>
        </div>
      );
    default:
      return (
        <div className={`${root} w-full h-[56px]`}>
          <div className={`flex-1 min-h-[36px] rounded-xl ${imgZone}`} />
        </div>
      );
  }
}
