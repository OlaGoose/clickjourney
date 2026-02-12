/**
 * Apple-style section templates for the editor.
 * Each template has a fixed structure and dynamic content slots (headline, CTAs, etc.).
 */

import type { SectionTemplateId, SectionBlockData } from '@/types/editor';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop';

export interface SectionTemplateDef {
  id: SectionTemplateId;
  label: string;
  /** Short description for template picker. */
  description?: string;
}

/** Section templates inspired by Apple TV / product page blocks. */
export const SECTION_TEMPLATES: SectionTemplateDef[] = [
  { id: 'tile_gallery', label: '横向卡片组', description: '多张圆角卡片，每张有标题/描述/CTA' },
  { id: 'feature_card', label: '大图特色卡', description: '单张主图、标题、副标题、CTA' },
  { id: 'marquee', label: '横向滚动条', description: '小图 + 标题横向滚动' },
];

/** Default section data for each template (dynamic content). */
export function getDefaultSectionData(templateId: SectionTemplateId): SectionBlockData {
  switch (templateId) {
    case 'tile_gallery':
      return {
        tile_gallery: {
          sectionHeadline: '选择一个方案',
          marqueeAnimate: true,
          tiles: [
            { eyebrow: '方案 A', title: '标题', copy: '简短说明', ctaLabel: '立即开始' },
            { eyebrow: '方案 B', title: '标题', copy: '简短说明', ctaLabel: '立即开始' },
          ],
        },
      };
    case 'feature_card':
      return {
        feature_card: {
          eyebrow: '推荐',
          title: '特色标题',
          subtitle: '一句话描述',
          image: PLACEHOLDER_IMAGE,
          ctaLabel: '查看详情',
        },
      };
    case 'marquee':
      return {
        marquee: {
          marqueeAnimate: true,
          items: [
            { image: PLACEHOLDER_IMAGE, title: '项目 1' },
            { image: PLACEHOLDER_IMAGE, title: '项目 2' },
            { image: PLACEHOLDER_IMAGE, title: '项目 3' },
          ],
        },
      };
    default:
      return {};
  }
}

export function getSectionPlaceholderImage(): string {
  return PLACEHOLDER_IMAGE;
}
