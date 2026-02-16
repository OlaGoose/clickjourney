'use client';

import type { ContentBlock, SectionTemplateId } from '@/types/editor';

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
  const templateId = (block.metadata?.sectionTemplateId ?? 'marquee') as SectionTemplateId;
  const data = block.metadata?.sectionData ?? {};

  const showBorder = !!block.metadata?.showBorder;
  const base = `rounded-2xl overflow-hidden bg-[#fbfbfd] text-[#1d1d1f] ${showBorder ? 'border border-black/[0.06]' : ''}`;
  const linkClass = isEditMode
    ? 'pointer-events-none'
    : 'text-[#007aff] hover:underline';

  switch (templateId) {
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
