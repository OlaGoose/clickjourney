/**
 * Section template: AI 只生成数据，前端用固定模板渲染，减少 token 消耗。
 */

export type SectionTemplateId = 'hero' | 'hero-images';

export type SectionBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; index: number; url?: string };

export interface SectionTemplateData {
  heroTitle: string;
  blocks: SectionBlock[];
  quote?: string;
}

export interface SectionTemplateResponse {
  templateId: SectionTemplateId;
  data: SectionTemplateData;
}
