'use client';

import type { ContentBlock } from '@/types/editor';
import type { SectionTemplateId } from '@/types/editor';
import { getSectionPlaceholderImage } from '@/lib/editor-section-templates';

interface SectionBlockRendererProps {
  block: ContentBlock;
  /** When true, show minimal edit hint (e.g. border) and no external links. */
  isEditMode?: boolean;
  className?: string;
}

/** Renders a section block by template id with dynamic content. Apple-style light UI. */
export function SectionBlockRenderer({
  block,
  isEditMode = false,
  className = '',
}: SectionBlockRendererProps) {
  const templateId = (block.metadata?.sectionTemplateId ?? 'tile_gallery') as SectionTemplateId;
  const data = block.metadata?.sectionData ?? {};

  const showBorder = !!block.metadata?.showBorder;
  const base = `rounded-2xl overflow-hidden bg-[#fbfbfd] text-[#1d1d1f] ${showBorder ? 'border border-black/[0.06]' : ''}`;
  const linkClass = isEditMode
    ? 'pointer-events-none'
    : 'text-[#007aff] hover:underline';

  switch (templateId) {
    case 'tile_gallery': {
      const d = data.tile_gallery;
      if (!d?.tiles?.length) return <SectionPlaceholder label="横向卡片组" className={base} />;
      const tiles = d.tiles;
      const animate = d.marqueeAnimate !== false;
      const duplicated = animate ? [...tiles, ...tiles] : tiles;
      return (
        <section className={`${base} px-4 py-5 overflow-hidden ${className}`}>
          {d.sectionHeadline && (
            <h3 className="text-xl font-semibold tracking-tight mb-4">{d.sectionHeadline}</h3>
          )}
          <div className="overflow-hidden pb-2 -mx-4">
            <div
              className={`flex gap-4 w-max ${animate ? 'animate-tile-marquee' : ''}`}
            >
              {duplicated.map((tile, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[260px] rounded-2xl border border-black/[0.08] bg-white p-4"
                >
                  {tile.eyebrow && (
                    <p className="text-[12px] font-medium text-[#6e6e73] uppercase tracking-wide">{tile.eyebrow}</p>
                  )}
                  <p className="mt-1 text-[17px] font-semibold">{tile.title || '标题'}</p>
                  <p className="mt-1 text-[13px] text-[#6e6e73] line-clamp-2">{tile.copy || ''}</p>
                  <span className={`mt-3 inline-block text-[14px] font-semibold ${linkClass}`}>
                    {tile.ctaLabel || '行动'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case 'feature_card': {
      const d = data.feature_card;
      if (!d) return <SectionPlaceholder label="大图特色卡" className={base} />;
      const img = d.image || getSectionPlaceholderImage();
      return (
        <section className={`${base} overflow-hidden ${className}`}>
          <div className="relative aspect-[4/3] bg-black/5">
            <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
              {d.eyebrow && (
                <p className="text-[12px] font-medium uppercase tracking-wide opacity-90">{d.eyebrow}</p>
              )}
              <h3 className="text-xl font-semibold mt-0.5">{d.title || '标题'}</h3>
              {d.subtitle && <p className="text-[14px] mt-1 opacity-90">{d.subtitle}</p>}
              <span className={`inline-block mt-3 text-[14px] font-semibold ${linkClass}`}>
                {d.ctaLabel || '查看'}
              </span>
            </div>
          </div>
        </section>
      );
    }

    case 'marquee': {
      const d = data.marquee;
      if (!d?.items?.length) return <SectionPlaceholder label="横向滚动条" className={base} />;
      const animate = d.marqueeAnimate !== false;
      const items = d.items;
      const duplicated = animate ? [...items, ...items] : items;
      const TrackContent = () => (
        <>
          {duplicated.map((item, i) => (
            <div key={i} className="flex-shrink-0 w-[140px]">
              <div
                className="aspect-video rounded-xl bg-black/10 overflow-hidden"
                style={{ backgroundImage: item.image ? `url(${item.image})` : undefined, backgroundSize: 'cover' }}
              >
                {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
              </div>
              <p className="mt-2 text-[13px] font-medium truncate">{item.title || '标题'}</p>
              {item.ctaLabel && (
                <span className={`text-[12px] font-medium ${linkClass}`}>{item.ctaLabel}</span>
              )}
            </div>
          ))}
        </>
      );
      return (
        <section className={`${base} py-4 overflow-hidden ${className}`}>
          <div className={animate ? 'overflow-hidden pb-2 -mx-4' : 'overflow-x-auto overflow-y-hidden px-4 no-scrollbar scroll-smooth'}>
            <div className={`flex gap-4 ${animate ? 'w-max animate-tile-marquee' : ''}`}>
              <TrackContent />
            </div>
          </div>
        </section>
      );
    }

    default:
      return <SectionPlaceholder label="宣传区块" className={`${base} ${className}`} />;
  }
}

function SectionPlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div className={`${className ?? ''} flex items-center justify-center min-h-[120px] text-[15px] text-[#86868b]`}>
      {label}
    </div>
  );
}
