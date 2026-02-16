/**
 * Cinematic layout templates for the travel editor.
 */

import type { LayoutType } from '@/types/cinematic';

/** 添加内容时展示的模板列表（带预览）。仅保留全幅大图。 */
export const CINEMATIC_TEMPLATES: { layout: LayoutType; label: string }[] = [
  { layout: 'full_bleed', label: '全幅大图' },
];

/** 编辑已有区块时下拉用：当前支持的布局。 */
export const ALL_CINEMATIC_LAYOUTS: { layout: LayoutType; label: string }[] = [
  { layout: 'full_bleed', label: '全幅大图' },
  { layout: 'immersive_focus', label: '沉浸聚焦' },
  { layout: 'magazine_spread', label: '杂志跨页' },
  { layout: 'minimal_caption', label: '极简图注' },
  { layout: 'portrait_feature', label: '竖版人物' },
];

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop';

/** Default image URL for new cinematic blocks (so layout is visible before user uploads). */
export function getCinematicPlaceholderImage(): string {
  return PLACEHOLDER_IMAGE;
}
