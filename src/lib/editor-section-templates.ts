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
  { id: 'hero_cta', label: '主视觉 + 双 CTA', description: '大标题、副标题、主/次按钮' },
  { id: 'ribbon', label: '横幅条', description: '单行提示 + 一个 CTA' },
  { id: 'value_props', label: '价值主张列表', description: '3–5 条短句' },
  { id: 'tile_gallery', label: '横向卡片组', description: '多张圆角卡片，每张有标题/描述/CTA' },
  { id: 'feature_card', label: '大图特色卡', description: '单张主图、标题、副标题、CTA' },
  { id: 'marquee', label: '横向滚动条', description: '小图 + 标题横向滚动' },
  { id: 'headline_grid', label: '标题 + 图标网格', description: '标题下多列图标+文字' },
  { id: 'accordion', label: '手风琴 FAQ', description: '问与答折叠列表' },
  { id: 'two_column_router', label: '双栏导流', description: '左右两栏，每栏图+标题+CTA' },
];

/** Default section data for each template (dynamic content). */
export function getDefaultSectionData(templateId: SectionTemplateId): SectionBlockData {
  switch (templateId) {
    case 'hero_cta':
      return {
        hero_cta: {
          headline: '主标题',
          subline: '副标题或一句话描述',
          primaryCta: { label: '主按钮' },
          secondaryCta: { label: '次按钮' },
          backgroundImage: PLACEHOLDER_IMAGE,
        },
      };
    case 'ribbon':
      return {
        ribbon: {
          message: '简短提示文案，例如活动或公告。',
          ctaLabel: '了解更多',
        },
      };
    case 'value_props':
      return {
        value_props: {
          items: [
            '第一条价值或卖点',
            '第二条价值或卖点',
            '第三条价值或卖点',
          ],
        },
      };
    case 'tile_gallery':
      return {
        tile_gallery: {
          sectionHeadline: '选择一个方案',
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
          items: [
            { image: PLACEHOLDER_IMAGE, title: '项目 1' },
            { image: PLACEHOLDER_IMAGE, title: '项目 2' },
            { image: PLACEHOLDER_IMAGE, title: '项目 3' },
          ],
        },
      };
    case 'headline_grid':
      return {
        headline_grid: {
          headline: '支持多种方式',
          subline: '可选副标题',
          items: [
            { label: '选项一' },
            { label: '选项二' },
            { label: '选项三' },
          ],
        },
      };
    case 'accordion':
      return {
        accordion: {
          headline: '常见问题',
          items: [
            { question: '第一个问题？', answer: '第一个问题的回答。' },
            { question: '第二个问题？', answer: '第二个问题的回答。' },
          ],
        },
      };
    case 'two_column_router':
      return {
        two_column_router: {
          left: {
            image: PLACEHOLDER_IMAGE,
            headline: '左侧标题',
            ctas: [{ label: '主 CTA' }, { label: '了解更多' }],
          },
          right: {
            image: PLACEHOLDER_IMAGE,
            headline: '右侧标题',
            ctas: [{ label: '主 CTA' }],
          },
        },
      };
    default:
      return {};
  }
}

export function getSectionPlaceholderImage(): string {
  return PLACEHOLDER_IMAGE;
}
