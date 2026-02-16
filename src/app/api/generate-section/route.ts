import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import type { AIGeneratedDocBlock, AIGeneratedDocResponse } from '@/types/ai-document-blocks';

/** Parse data URL to mime and base64. */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return null;
  const [, mimeType, data] = match;
  const clean = data.replace(/\s+/g, '');
  return clean ? { mimeType: mimeType || 'image/jpeg', data: clean } : null;
}

/** 从 AI 返回文本中提取并解析 JSON，容忍 markdown、尾逗号、截断补全。 */
function extractAndParseJson<T = unknown>(raw: string): T {
  let str = raw.trim();
  const codeBlock = str.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) str = codeBlock[1].trim();
  const firstBrace = str.indexOf('{');
  const lastBrace = str.lastIndexOf('}');
  if (firstBrace !== -1) {
    str = lastBrace > firstBrace ? str.slice(firstBrace, lastBrace + 1) : str.slice(firstBrace);
  }
  str = str.replace(/,(\s*[}\]])/g, '$1');
  try {
    return JSON.parse(str) as T;
  } catch (e) {
    const repairs = [']}', '}]}}', ']}}', '}]}]}}', '"}]}]}}'];
    for (const suffix of repairs) {
      try {
        return JSON.parse(str + suffix) as T;
      } catch {
        continue;
      }
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('[generate-section] JSON parse failed. Raw snippet:', str.slice(0, 800));
      console.error('[generate-section] Parse error:', e instanceof Error ? e.message : e);
    }
    throw e;
  }
}

/** 纯文本时使用的 JSON Schema：返回 { blocks: [...] } */
const DOC_BLOCKS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    blocks: {
      type: 'array',
      description: '文档块列表，按顺序插入文档',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['richtext', 'text', 'image'] },
          content: { type: 'string' },
          imageIndex: { type: 'integer' },
        },
        required: ['type'],
      },
    },
  },
  required: ['blocks'],
} as const;

/** POST: 根据心境故事（+ 可选图片）生成可直接插入文档的块列表。 */
export async function POST(request: Request) {
  console.log('[generate-section] POST received');
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI 服务未配置 (缺少 GEMINI_API_KEY)' },
      { status: 503 }
    );
  }

  let body: { prompt?: string; images?: string[] };
  try {
    body = await request.json();
  } catch (e) {
    console.error('[generate-section] Invalid JSON body', e);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json(
      { error: '请提供生成描述 (prompt)' },
      { status: 400 }
    );
  }

  const rawImages = Array.isArray(body.images) ? body.images : [];
  const imageList = rawImages
    .filter((u): u is string => typeof u === 'string')
    .slice(0, 6)
    .map((url) => ({ url, parsed: parseDataUrl(url) }))
    .filter((x): x is { url: string; parsed: { mimeType: string; data: string } } => x.parsed != null);
  const parsedImages = imageList.map((x) => x.parsed);
  const hasImages = parsedImages.length > 0;

  const model = process.env.GEMINI_MODEL_SECTION || process.env.NEXT_PUBLIC_GEMINI_MODEL_SECTION || 'gemini-2.5-flash';
  const useStructuredOutput = true;

  const imageRequirement = hasImages
    ? `【必做】本次用户上传了 ${parsedImages.length} 张图，你必须在 blocks 中为每一张图都插入一个 image 块：第 1 张用 {"type":"image","imageIndex":0}，第 2 张用 imageIndex 1，依此类推。将 image 块穿插在叙事中（不要全部堆在开头或结尾），让图文交错。`
    : '本次无图，不要输出 type 为 image 的块。';

  const componentsDesc = `
文档有三种可渲染的块类型，请根据节奏与层次交替使用，做出好看、错落有致的游记排版：

1. richtext — 带层级的富文本（标题/段落/编者注）。适合：开篇标题+首段、或需要 <h2>/<p>/<blockquote> 的完整小段。
   {"type":"richtext","content":"<h2>标题</h2><p>段落</p><blockquote>编者注或坐标</blockquote>"}
   仅用 <h2>、<p>、<blockquote>、<strong>、<em>，单块内 1 标题 + 1～2 段即可。

2. text — 纯文本块，单独成块、留白多。适合：金句、一句情绪、短句过渡、或刻意留白的呼吸感。
   {"type":"text","content":"一句或很短的一段"}
   用 text 做「单句成块」能强化节奏，避免通篇都是大段。

3. image — 插图占位（文档会按 imageIndex 插入用户上传的图片）。
   {"type":"image","imageIndex":0} 表示第 1 张上传图，imageIndex 1 表示第 2 张，以此类推。
${imageRequirement}

排版原则：充分利用三种块的差异——用 richtext 做「有标题、有引用的完整小段」，用 text 做「单句/金句/留白」，有图时用 image 穿插节奏；块数 4～7 块，交替类型，避免连续多块都是 richtext。`;

  const jsonExample = hasImages
    ? `{"blocks":[{"type":"richtext","content":"<h2>东京蓝夜</h2><p>夜幕初降，普鲁士蓝笼罩都市。</p>"},{"type":"text","content":"转角处，灯火渐次亮起。"},{"type":"image","imageIndex":0},{"type":"richtext","content":"<p>再走几步，便是熟悉的巷子。</p><blockquote>东京 · 深夜</blockquote>"},{"type":"text","content":"那盏灯，还亮着。"}]}`
    : `{"blocks":[{"type":"richtext","content":"<h2>东京蓝夜</h2><p>夜幕初降，普鲁士蓝笼罩都市。</p>"},{"type":"text","content":"转角处，灯火渐次亮起。"},{"type":"richtext","content":"<p>再走几步，便是熟悉的巷子。</p><blockquote>东京 · 深夜</blockquote>"},{"type":"text","content":"那盏灯，还亮着。"}]}`;

  const instruction = `# Role
你是顶级旅游杂志的创意总监，擅长把碎片式心境写成有呼吸感、电影感、且排版精美的游记。

# Task
根据用户提供的【心境故事】${hasImages ? '以及随附的图片' : ''}，生成可直接插入文档的块列表。${componentsDesc}

# 输出要求
只输出一行合法 JSON，键与字符串均用双引号，不要尾逗号。充分利用 richtext / text / image 的差异，做出好看、可读的节奏。示例：
${jsonExample}

# Input - 心境故事
${prompt}`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: instruction },
    ];
    if (hasImages) {
      for (const { mimeType, data } of parsedImages) {
        parts.push({ inlineData: { mimeType, data } });
      }
      parts.push({
        text: '请根据上述心境故事与图片，输出上述格式的 JSON（仅 JSON，无 markdown）。',
      });
    }

    const config: {
      temperature: number;
      maxOutputTokens: number;
      responseMimeType?: string;
      responseJsonSchema?: typeof DOC_BLOCKS_JSON_SCHEMA;
    } = {
      temperature: 0.7,
      maxOutputTokens: hasImages ? 3072 : 1024,
    };
    config.responseMimeType = 'application/json';
    config.responseJsonSchema = DOC_BLOCKS_JSON_SCHEMA;

    console.log('[generate-section] calling Gemini', { model, hasImages });
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config,
    });

    const raw = (response.text ?? '').trim();
    if (!raw) {
      console.error('[generate-section] AI returned empty text', { response: JSON.stringify(response).slice(0, 300) });
      return NextResponse.json(
        { error: 'AI 未返回内容' },
        { status: 500 }
      );
    }

    let parsed: AIGeneratedDocResponse;
    try {
      parsed = extractAndParseJson<AIGeneratedDocResponse>(raw);
    } catch (e) {
      if (process.env.NODE_ENV === 'development' && e instanceof Error) {
        console.error('[generate-section]', e.message);
      }
      return NextResponse.json(
        { error: 'AI 返回的不是有效 JSON' },
        { status: 500 }
      );
    }

    const blocks: AIGeneratedDocBlock[] = Array.isArray(parsed.blocks) ? parsed.blocks : [];
    const normalized = blocks
      .map((b) => {
        if (b && typeof b === 'object' && (b.type === 'richtext' || b.type === 'text' || b.type === 'image')) {
          if (b.type === 'richtext' || b.type === 'text') {
            return { type: b.type, content: String((b as { content?: string }).content ?? '') };
          }
          if (b.type === 'image' && typeof (b as { imageIndex?: number }).imageIndex === 'number') {
            return { type: 'image' as const, imageIndex: (b as { imageIndex: number }).imageIndex };
          }
        }
        return null;
      })
      .filter((b): b is AIGeneratedDocBlock => b != null);

    return NextResponse.json({ blocks: normalized });
  } catch (err: unknown) {
    let message = err instanceof Error ? err.message : '生成失败';
    if (/fetch failed|sending request/i.test(message)) {
      message = '网络请求失败，请检查网络或减少上传图片后重试';
    }
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[generate-section] Error:', message);
    if (stack) console.error('[generate-section] Stack:', stack);
    console.error('[generate-section] Full err:', err);
    return NextResponse.json(
      { error: message || 'AI 生成失败，请稍后重试' },
      { status: 500 }
    );
  }
}
