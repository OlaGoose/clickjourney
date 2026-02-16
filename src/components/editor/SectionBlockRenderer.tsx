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
          <div className="px-5 pt-6 pb-4">
            <h2 className="text-[24px] font-bold text-[#1d1d1f] leading-snug mb-2.5 tracking-tight">
              {d.headline || '体验内容'}
            </h2>
            {d.intro && (
              <p className="text-[15px] text-[#6e6e73] leading-relaxed max-w-[90%]">
                {d.intro}
              </p>
            )}
          </div>

          {/* Timeline Items - Apple Style */}
          <div className="px-5 pb-2">
            {d.items.map((item, i) => {
              const isLast = i === d.items.length - 1;
              return (
                <div key={i} className="relative">
                  {/* Timeline Line - extends to next item */}
                  {!isLast && (
                    <div 
                      className="absolute left-[18px] top-[40px] w-[2px] h-[calc(100%+16px)] bg-gradient-to-b from-[#d2d2d7] to-[#e5e5ea]"
                      aria-hidden="true"
                    />
                  )}
                  
                  <button
                    type="button"
                    aria-label={`${item.title}. ${item.description}`}
                    className={`w-full flex gap-4 py-3 text-left group ${isEditMode ? 'pointer-events-none' : 'hover:translate-x-1'} transition-all duration-300 ease-out`}
                  >
                    {/* Timeline Dot & Number */}
                    <div className="flex-shrink-0 flex flex-col items-center pt-1.5">
                      {/* Dot with ripple effect */}
                      <div className="relative w-9 h-9 flex items-center justify-center">
                        {/* Outer ring - appears on hover */}
                        <div className="absolute inset-0 rounded-full border-[3px] border-[#007aff]/20 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-500" />
                        
                        {/* Main dot */}
                        <div className="relative w-6 h-6 rounded-full bg-gradient-to-br from-[#007aff] to-[#0051d5] shadow-[0_2px_8px_rgba(0,122,255,0.3)] group-hover:shadow-[0_4px_16px_rgba(0,122,255,0.4)] transition-all duration-300">
                          {/* Inner glow */}
                          <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-white/40 to-transparent" />
                          
                          {/* Number */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[11px] font-bold text-white tracking-tight">
                              {i + 1}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content Card */}
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex gap-3.5 p-3 rounded-2xl bg-white/60 group-hover:bg-white group-hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-300 border border-black/[0.04] group-hover:border-black/[0.08]">
                        {/* Image */}
                        <div className="flex-shrink-0 w-[92px] h-[92px] rounded-xl overflow-hidden bg-black/5 ring-1 ring-black/[0.06] group-hover:ring-black/[0.12] transition-all duration-300">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-black/5 to-black/10" />
                          )}
                        </div>

                        {/* Text Content */}
                        <div className="flex-1 min-w-0 py-1">
                          <h3 className="text-[17px] font-semibold text-[#1d1d1f] leading-tight mb-2 group-hover:text-[#007aff] transition-colors duration-300">
                            {item.title || '标题'}
                          </h3>
                          <p className="text-[14px] text-[#6e6e73] leading-relaxed line-clamp-3">
                            {item.description || '描述'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {d.footer && (
            <div className="px-5 pt-2 pb-5 border-t border-black/[0.06] mt-2">
              <p className="text-[13px] text-[#86868b] leading-relaxed flex items-center gap-2">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{d.footer}</span>
              </p>
            </div>
          )}
        </section>
      );
    }

    default:
      // Backward compat: treat legacy creator_card as single friend
      if (rawTemplateId === 'creator_card' && (data as { creatorCard?: unknown }).creatorCard) {
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
