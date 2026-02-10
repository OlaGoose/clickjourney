/**
 * Cinematic layout templates for the travel editor.
 * 仅保留差异明显的模板：去掉与 full_bleed / hero_split 相似项（沉浸聚焦、杂志跨页、极简图注、竖版人物）。
 */

import type { LayoutType } from '@/types/cinematic';

/** 添加内容时展示的模板列表（带预览），已去掉相似度高的布局 */
export const CINEMATIC_TEMPLATES: { layout: LayoutType; label: string }[] = [
  { layout: 'full_bleed', label: '全幅大图' },
  { layout: 'hero_split', label: '左右分栏' },
  { layout: 'side_by_side', label: '图文并排' },
  { layout: 'text_overlay', label: '图上文下' },
];

/** 编辑已有区块时下拉用：包含所有布局，兼容旧数据 */
export const ALL_CINEMATIC_LAYOUTS: { layout: LayoutType; label: string }[] = [
  { layout: 'full_bleed', label: '全幅大图' },
  { layout: 'hero_split', label: '左右分栏' },
  { layout: 'side_by_side', label: '图文并排' },
  { layout: 'immersive_focus', label: '沉浸聚焦' },
  { layout: 'magazine_spread', label: '杂志跨页' },
  { layout: 'minimal_caption', label: '极简图注' },
  { layout: 'portrait_feature', label: '竖版人物' },
  { layout: 'text_overlay', label: '图上文下' },
];

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop';

/** Default image URL for new cinematic blocks (so layout is visible before user uploads). */
export function getCinematicPlaceholderImage(): string {
  return PLACEHOLDER_IMAGE;
}
