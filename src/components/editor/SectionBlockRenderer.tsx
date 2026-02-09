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
  const templateId = (block.metadata?.sectionTemplateId ?? 'hero_cta') as SectionTemplateId;
  const data = block.metadata?.sectionData ?? {};

  const base = 'rounded-2xl overflow-hidden bg-[#fbfbfd] text-[#1d1d1f] border border-black/[0.06]';
  const linkClass = isEditMode
    ? 'pointer-events-none'
    : 'text-[#007aff] hover:underline';

  switch (templateId) {
    case 'hero_cta': {
      const d = data.hero_cta;
      if (!d) return <SectionPlaceholder label="主视觉 + 双 CTA" className={base} />;
      const bg = d.backgroundImage || getSectionPlaceholderImage();
      return (
        <section className={`${base} ${className}`}>
          <div className="relative min-h-[200px] rounded-2xl bg-black/5 overflow-hidden">
            <img
              src={bg}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="relative px-6 py-8 flex flex-col justify-end min-h-[200px]">
              <h2 className="text-2xl font-semibold tracking-tight text-white drop-shadow-md">
                {d.headline || '主标题'}
              </h2>
              {d.subline && (
                <p className="mt-1 text-[15px] text-white/90 drop-shadow">{d.subline}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="inline-flex items-center rounded-full bg-white px-4 py-2 text-[14px] font-medium text-[#1d1d1f]">
                  {d.primaryCta?.label ?? '主按钮'}
                </span>
                {d.secondaryCta?.label && (
                  <span className="inline-flex items-center rounded-full bg-white/80 px-4 py-2 text-[14px] font-medium text-[#1d1d1f]">
                    {d.secondaryCta.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      );
    }

    case 'ribbon': {
      const d = data.ribbon;
      if (!d) return <SectionPlaceholder label="横幅条" className={base} />;
      return (
        <section className={`${base} px-4 py-3 flex flex-wrap items-center justify-between gap-2 bg-[#f5f5f7] ${className}`}>
          <p className="text-[15px] text-[#1d1d1f]">{d.message || '横幅文案'}</p>
          <span className={`text-[14px] font-semibold ${linkClass}`}>{d.ctaLabel || '了解更多'}</span>
        </section>
      );
    }

    case 'value_props': {
      const d = data.value_props;
      if (!d?.items?.length) return <SectionPlaceholder label="价值主张列表" className={base} />;
      return (
        <section className={`${base} px-6 py-6 ${className}`}>
          <ul className="space-y-3 list-none">
            {d.items.map((item, i) => (
              <li key={i} className="text-[15px] leading-relaxed text-[#1d1d1f]">
                {item || '—'}
              </li>
            ))}
          </ul>
        </section>
      );
    }

    case 'tile_gallery': {
      const d = data.tile_gallery;
      if (!d?.tiles?.length) return <SectionPlaceholder label="横向卡片组" className={base} />;
      return (
        <section className={`${base} px-4 py-5 ${className}`}>
          {d.sectionHeadline && (
            <h3 className="text-xl font-semibold tracking-tight mb-4">{d.sectionHeadline}</h3>
          )}
          <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-2 no-scrollbar scroll-smooth">
            {d.tiles.map((tile, i) => (
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
      return (
        <section className={`${base} py-4 ${className}`}>
          <div className="flex gap-4 overflow-x-auto overflow-y-hidden px-4 no-scrollbar scroll-smooth">
            {d.items.map((item, i) => (
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
          </div>
        </section>
      );
    }

    case 'headline_grid': {
      const d = data.headline_grid;
      if (!d) return <SectionPlaceholder label="标题 + 图标网格" className={base} />;
      return (
        <section className={`${base} px-6 py-6 ${className}`}>
          <h3 className="text-xl font-semibold tracking-tight">{d.headline || '标题'}</h3>
          {d.subline && <p className="mt-1 text-[15px] text-[#6e6e73]">{d.subline}</p>}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {(d.items ?? []).map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center p-3 rounded-xl bg-white border border-black/[0.06]">
                <span className="text-[13px] font-medium text-[#1d1d1f]">{item.label || '—'}</span>
              </div>
            ))}
          </div>
        </section>
      );
    }

    case 'accordion': {
      const d = data.accordion;
      if (!d?.items?.length) return <SectionPlaceholder label="手风琴 FAQ" className={base} />;
      return (
        <section className={`${base} px-6 py-5 ${className}`}>
          <h3 className="text-xl font-semibold tracking-tight mb-4">{d.headline || '常见问题'}</h3>
          <ul className="space-y-3 list-none">
            {d.items.map((item, i) => (
              <li key={i} className="border-b border-black/[0.08] pb-3 last:border-0">
                <p className="text-[15px] font-semibold text-[#1d1d1f]">{item.question || '问题'}</p>
                <p className="mt-1 text-[14px] text-[#6e6e73] leading-relaxed">{item.answer || '回答'}</p>
              </li>
            ))}
          </ul>
        </section>
      );
    }

    case 'two_column_router': {
      const d = data.two_column_router;
      if (!d) return <SectionPlaceholder label="双栏导流" className={base} />;
      const leftImg = d.left?.image || getSectionPlaceholderImage();
      const rightImg = d.right?.image || getSectionPlaceholderImage();
      return (
        <section className={`${base} p-4 ${className}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl overflow-hidden border border-black/[0.08] bg-white">
              <div className="aspect-video bg-black/5">
                <img src={leftImg} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <h4 className="text-[17px] font-semibold">{d.left?.headline ?? '左侧标题'}</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(d.left?.ctas ?? []).map((cta, j) => (
                    <span key={j} className={`text-[14px] font-medium ${linkClass}`}>{cta.label}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-black/[0.08] bg-white">
              <div className="aspect-video bg-black/5">
                <img src={rightImg} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <h4 className="text-[17px] font-semibold">{d.right?.headline ?? '右侧标题'}</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(d.right?.ctas ?? []).map((cta, j) => (
                    <span key={j} className={`text-[14px] font-medium ${linkClass}`}>{cta.label}</span>
                  ))}
                </div>
              </div>
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
