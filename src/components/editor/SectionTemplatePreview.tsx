'use client';

import type { SectionTemplateData, SectionTemplateId } from '@/types/section-template';

/** 固定模版：用 AI 返回的数据渲染杂志感区块，供预览与导出为图片。 */
export function SectionTemplatePreview({
  templateId,
  data,
  imageUrls,
  className,
}: {
  templateId: SectionTemplateId;
  data: SectionTemplateData;
  /** 与本地上传顺序一致，按 block.index 取图；不通过 API 返回图片数据，节省 token/带宽 */
  imageUrls?: string[];
  className?: string;
}) {
  const { heroTitle, blocks, quote } = data;

  return (
    <div
      className={`min-h-[200px] w-full max-w-[420px] mx-auto rounded-2xl bg-[#fafafa] text-[#1a1a1a] overflow-hidden ${className ?? ''}`}
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div className="px-6 py-8 md:px-8 md:py-10">
        {/* Hero 标题 */}
        <h2
          className="text-2xl md:text-3xl font-semibold leading-tight tracking-tight mb-6"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {heroTitle || ' '}
        </h2>

        {/* 正文与图片交错 */}
        <div className="space-y-5">
          {blocks.map((block, i) => {
            if (block.type === 'text') {
              return (
                <p
                  key={i}
                  className="text-[15px] leading-[1.6] text-[#3a3a3c]"
                >
                  {block.text}
                </p>
              );
            }
            if (block.type === 'image') {
              const src = imageUrls?.[block.index] ?? block.url;
              if (!src) return null;
              return (
                <figure key={i} className="my-4">
                  <img
                    src={src}
                    alt=""
                    className="w-full rounded-xl object-cover max-h-[240px]"
                  />
                </figure>
              );
            }
            return null;
          })}
        </div>

        {/* 可选编者注 / 坐标 */}
        {quote?.trim() && (
          <blockquote
            className="mt-6 pl-4 border-l-2 border-[#0a2540]/30 text-[14px] text-[#6b7280] italic bg-white/60 backdrop-blur-sm rounded-r-lg py-2 pr-4"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {quote}
          </blockquote>
        )}
      </div>
    </div>
  );
}
