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

/** Section templates：横向滚动条、朋友、议程。Labels come from i18n (editor.sectionMarquee / editor.sectionFriends / editor.sectionAgenda). */
export const SECTION_TEMPLATES: SectionTemplateDef[] = [
  { id: 'marquee', label: '横向滚动条', description: '小图 + 标题横向滚动' },
  { id: 'friends', label: '朋友', description: '头像 + 名称 + 描述，支持多人' },
  { id: 'agenda', label: '议程/时间线', description: 'Airbnb 风格体验日程' },
];

/** Default section data by template. */
export function getDefaultSectionData(templateId: SectionTemplateId): SectionBlockData {
  if (templateId === 'friends') {
    return {
      friends: [
        { avatar: PLACEHOLDER_IMAGE, name: '', description: '' },
      ],
    };
  }
  if (templateId === 'agenda') {
    return {
      agenda: {
        headline: '体验内容',
        intro: '精心设计的行程，让每一步都充满期待。',
        items: [
          { image: PLACEHOLDER_IMAGE, title: '第一站', description: '在这里开始我们的旅程。', emoji: '📍' },
          { image: PLACEHOLDER_IMAGE, title: '第二站', description: '体验独特的风景和文化。', emoji: '✨' },
          { image: PLACEHOLDER_IMAGE, title: '第三站', description: '留下难忘的回忆。', emoji: '🎬' },
        ],
        footer: '',
      },
    };
  }
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
}

export function getSectionPlaceholderImage(): string {
  return PLACEHOLDER_IMAGE;
}
