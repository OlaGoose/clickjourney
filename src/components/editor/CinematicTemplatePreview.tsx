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
    case 'hero_split':
      return (
        <div className={`${root} flex-row w-full h-[56px]`}>
          <div className={`w-[65%] h-full rounded-l-xl ${imgZone}`} />
          <div className={`w-[35%] h-full rounded-r-xl ${textZone} flex items-center justify-center px-1`}>
            <div className={`h-0.5 w-full max-w-[90%] ${textLine}`} />
          </div>
        </div>
      );
    case 'side_by_side':
      return (
        <div className={`${root} flex-row w-full h-[56px]`}>
          <div className={`w-1/2 h-full rounded-l-xl ${imgZone}`} />
          <div className={`w-1/2 h-full rounded-r-xl ${textZone} flex items-center justify-center`}>
            <div className={`h-0.5 w-[80%] ${textLine}`} />
          </div>
        </div>
      );
    case 'text_overlay':
      return (
        <div className={`${root} relative w-full h-[56px]`}>
          <div className={`absolute inset-0 rounded-xl ${imgZone}`} />
          <div className="absolute inset-0 rounded-xl bg-black/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`h-1.5 w-3/4 max-w-[48px] ${textLine} opacity-90`} />
          </div>
        </div>
      );
    case 'reflection_end':
      return (
        <div className={`${root} w-full h-[56px] bg-neutral-800 flex items-center justify-center`}>
          <div className="h-0.5 w-6 rounded-full bg-white/30" />
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
