/**
 * AI 生成的文档块：与编辑器能力对齐，直接插入文档，无需转图片。
 * 通过 Prompt 告知 AI 当前文档可用的组件与 JSON 形状，由 AI 编排返回。
 */

export type AIGeneratedDocBlock =
  | { type: 'richtext'; content: string }
  | { type: 'text'; content: string }
  | { type: 'image'; imageIndex: number };

export interface AIGeneratedDocResponse {
  blocks: AIGeneratedDocBlock[];
}
