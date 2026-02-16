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

/** Section templates：仅保留横向滚动条。 */
export const SECTION_TEMPLATES: SectionTemplateDef[] = [
  { id: 'marquee', label: '横向滚动条', description: '小图 + 标题横向滚动' },
];

/** Default section data for marquee template. */
export function getDefaultSectionData(templateId: SectionTemplateId): SectionBlockData {
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
