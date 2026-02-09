import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

/** Parse data URL to mime and base64. */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return null;
  const [, mimeType, data] = match;
  const clean = data.replace(/\s+/g, '');
  return clean ? { mimeType: mimeType || 'image/jpeg', data: clean } : null;
}

/** POST: generate a web section (HTML) from prompt, optionally with images (multimodal). */
export async function POST(request: Request) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI 服务未配置 (缺少 GEMINI_API_KEY)' },
      { status: 503 }
    );
  }

  let body: { prompt?: string; images?: string[] };
  try {
    body = await request.json();
  } catch {
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
  const dataUrlsForReplace = imageList.map((x) => x.url);

  const model = process.env.NEXT_PUBLIC_GEMINI_MODEL_SECTION || 'gemini-2.5-flash';

  const hasImages = parsedImages.length > 0;
  const imagePlaceholderNote = hasImages
    ? `\n你已收到 ${parsedImages.length} 张图片。请在合适位置用占位符 [IMAGE_0]、[IMAGE_1]、[IMAGE_2] 等（按顺序对应第 1、2、3 张图）插入插图，可与文字错落穿插。`
    : '';

  const baseInstruction = `# Role
你是一位世界顶级的旅游杂志（如《Cereal》或《Monocle》）的创意总监。你擅长将破碎的旅行随笔转化为具有「呼吸感」和「电影感」的排版与文案。

# Design Language（Apple & 极简）
- 文字气质：标题像诗歌一样错落、有留白；正文干净、克制，避免高饱和度情绪词。
- 情感共鸣：不只是陈列信息，要在关键处加入精致的「编者注」或地理/时间标注，用 <blockquote> 承载，像深夜回浅草寺那样的细碎感悟。
- 结构：开篇需要一个有冲击力的「Hero」式开头（用 <h2> 或首段 <p> 营造第一眼张力），再展开叙述。

# Task
根据用户提供的【心境故事】${hasImages ? '以及随附的图片' : ''}，生成一段**可嵌入网页的 HTML 片段**（不是完整页面，不要 <html>、<head>、<body>，不要引入 Tailwind CDN 或任何外部样式）。
要求：
1. 只使用语义化标签：<h2>、<h3>、<p>、<blockquote>、<strong>、<em>、<span>。${hasImages ? ' 在需要插图处使用占位符 [IMAGE_0]、[IMAGE_1] 等。' : ''}
2. 长度适中：约 1 个强开头 + 2～4 段或列表 + 可选 1～2 处 blockquote 编者注。
3. 严禁 <script>、<iframe>、<video>、<audio>、<img>（图片用占位符 [IMAGE_N] 表示）。
4. 直接输出 HTML 片段，不要 \`\`\` 代码块包裹，不要任何解释或前后缀。
${imagePlaceholderNote}

# Input - 心境故事
${prompt}`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: baseInstruction },
    ];
    if (hasImages) {
      for (const { mimeType, data } of parsedImages) {
        parts.push({ inlineData: { mimeType, data } });
      }
      parts.push({
        text: '请根据上述心境故事与图片，生成带 [IMAGE_0]、[IMAGE_1] 等占位符的 HTML 片段。只输出 HTML，无 markdown 包裹。',
      });
    }

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    const raw = (response.text ?? '').trim();
    if (!raw) {
      return NextResponse.json(
        { error: 'AI 未返回内容' },
        { status: 500 }
      );
    }

    let html = raw;
    const codeMatch = raw.match(/```(?:html)?\s*([\s\S]*?)```/);
    if (codeMatch) html = codeMatch[1].trim();

    // Replace [IMAGE_0], [IMAGE_1], ... with <img src="data:..."> using original data URLs
    if (hasImages && dataUrlsForReplace.length > 0) {
      for (let i = 0; i < dataUrlsForReplace.length; i++) {
        const placeholder = `[IMAGE_${i}]`;
        const safeSrc = dataUrlsForReplace[i].replace(/"/g, '&quot;');
        const imgTag = `<img src="${safeSrc}" alt="">`;
        html = html.split(placeholder).join(imgTag);
      }
    }

    return NextResponse.json({ html });
  } catch (err: unknown) {
    console.error('[generate-section]', err);
    const message = err instanceof Error ? err.message : '生成失败';
    return NextResponse.json(
      { error: message || 'AI 生成失败，请稍后重试' },
      { status: 500 }
    );
  }
}
