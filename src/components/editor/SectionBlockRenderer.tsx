'use client';

import { useLocale } from '@/lib/i18n';
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
  const { t } = useLocale();
  const rawTemplateId = block.metadata?.sectionTemplateId ?? 'marquee';
  const templateId = rawTemplateId as SectionTemplateId;
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

    case 'friends': {
      const list = data.friends;
      if (!list?.length) return <SectionPlaceholder label={t('editor.sectionFriends')} className={base} />;
      return (
        <section
          className={`${base} py-3 px-4 space-y-3 ${className}`}
          role="presentation"
          aria-hidden="true"
        >
          {list.map((d, i) => (
            <div key={i} className="flex items-center gap-3 dir-ltr">
              <div
                className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-black/5"
                role="presentation"
                aria-hidden="true"
              >
                {d.avatar ? (
                  <img
                    src={d.avatar}
                    alt=""
                    className="w-full h-full object-cover"
                    width={36}
                    height={36}
                  />
                ) : (
                  <div className="w-full h-full bg-black/10" />
                )}
              </div>
              <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                <div className="text-[13px] font-medium text-[#1d1d1f]">
                  {t('editor.friendLabel')}{d.name || '—'}
                </div>
                <div className="text-[15px] font-semibold text-[#1d1d1f] truncate">
                  {d.description || '—'}
                </div>
              </div>
            </div>
          ))}
        </section>
      );
    }

    case 'agenda': {
      const d = data.agenda;
      if (!d?.items?.length) return <SectionPlaceholder label={t('editor.sectionAgenda')} className={base} />;
      return (
        <section className={`${base} ${className}`} role="article" aria-label="体验议程">
          {/* Header */}
          <div className="px-4 pt-5 pb-3">
            <h2 className="text-[22px] font-bold text-[#1d1d1f] leading-snug mb-2">
              {d.headline || '体验内容'}
            </h2>
            {d.intro && (
              <p className="text-[15px] text-[#6e6e73] leading-relaxed">
                {d.intro}
              </p>
            )}
          </div>

          {/* Agenda Items with Timeline — 灰线 1px，对齐每张图片水平中心，图片覆盖圆点与线 */}
          <div className="relative px-4 pb-2 overflow-visible">
            {d.items.map((item, i) => (
              <div key={i} className="relative flex items-stretch overflow-visible group">
                {/* 占位：使时间线中心落在图片中心。图片中心 = pl-1(4px) + 88/2(44px) = 48px */}
                <div className="w-[42px] flex-shrink-0" aria-hidden="true" />
                {/* Timeline Column：灰线(宽约 1px，比 2px 减 30%) + 圆点，置于底层 */}
                <div className="relative w-3 flex-shrink-0 flex flex-col items-center justify-center self-stretch" style={{ zIndex: 0 }}>
                  {/* 上方连接线 — 灰色、1px */}
                  {i > 0 && (
                    <div
                      className="absolute top-0 left-1/2 -translate-x-px w-px bg-gradient-to-b from-[#d1d5db] to-transparent"
                      style={{ height: '50%' }}
                      aria-hidden="true"
                    />
                  )}
                  {/* 圆点 */}
                  <div className="relative w-2.5 h-2.5 rounded-full bg-[#9ca3af] ring-2 ring-[#9ca3af]/30 group-hover:ring-[#9ca3af]/50 transition-all duration-200 flex-shrink-0" aria-hidden="true" />
                  {/* 下方连接线 — 灰色、1px */}
                  {i < d.items.length - 1 && (
                    <div
                      className="absolute bottom-0 left-1/2 -translate-x-px w-px bg-gradient-to-b from-transparent to-[#d1d5db]"
                      style={{ height: '50%' }}
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Content Column：左移使图片中心对准时间线，图片覆盖圆点与线 */}
                <button
                  type="button"
                  aria-label={`${item.title}. ${item.description}`}
                  className={`relative flex flex-1 min-w-0 gap-3.5 py-3 pr-3 pl-1 -ml-[54px] rounded-2xl hover:bg-black/[0.02] transition-all duration-200 group-hover:shadow-sm ${isEditMode ? 'pointer-events-none' : ''}`}
                  style={{ zIndex: 10 }}
                >
                  {/* 图片：中心压在灰线与圆点上 */}
                  <div className="flex-shrink-0 w-[88px] h-[88px] rounded-xl overflow-hidden bg-black/5 ring-1 ring-black/[0.06] group-hover:ring-black/[0.1] transition-all duration-200 shadow-sm">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-black/10" />
                    )}
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0 text-left py-0.5">
                    <h3 className="text-[16px] font-semibold text-[#1d1d1f] leading-tight mb-1.5 group-hover:text-[#007aff] transition-colors duration-200">
                      {item.title || '标题'}
                    </h3>
                    <p className="text-[14px] text-[#6e6e73] leading-relaxed line-clamp-3">
                      {item.description || '描述'}
                    </p>
                  </div>
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          {d.footer && (
            <div className="px-4 pt-3 pb-4">
              <p className="text-[13px] text-[#86868b] leading-relaxed">
                {d.footer}
              </p>
            </div>
          )}
        </section>
      );
    }

    default:
      // Backward compat: treat legacy creator_card as single friend
      if ((rawTemplateId as string) === 'creator_card' && (data as { creatorCard?: unknown }).creatorCard) {
        const d = (data as { creatorCard: { avatar: string; name: string; description: string } }).creatorCard;
        return (
          <section className={`${base} py-3 px-4 ${className}`} role="presentation" aria-hidden="true">
            <div className="flex items-center gap-3 dir-ltr">
              <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-black/5">
                {d.avatar ? <img src={d.avatar} alt="" className="w-full h-full object-cover" width={36} height={36} /> : <div className="w-full h-full bg-black/10" />}
              </div>
              <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                <div className="text-[13px] font-medium text-[#1d1d1f]">{t('editor.friendLabel')}{d.name || '—'}</div>
                <div className="text-[15px] font-semibold text-[#1d1d1f] truncate">{d.description || '—'}</div>
              </div>
            </div>
          </section>
        );
      }
      return <SectionPlaceholder label={t('editor.sectionFriends')} className={`${base} ${className}`} />;
  }
}

function SectionPlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div className={`${className ?? ''} flex items-center justify-center min-h-[120px] text-[15px] text-[#86868b]`}>
      {label}
    </div>
  );
}
