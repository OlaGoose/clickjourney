import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { FILTER_PRESETS } from '@/types/vlog';

const FILTER_NAMES = FILTER_PRESETS.map((p) => p.name);

interface RequestBody {
  location?: string;
  /** Single image as base64 (no data URL prefix or stripped). */
  image: string;
  /** User's screenplay/script text (plain or newline-separated lines). */
  scriptText: string;
  /** Optional: user voice recording base64 for mood analysis. */
  recordedAudioBase64?: string;
  recordedMimeType?: string;
}

interface ApiResponse {
  filterPreset: string;
  artifiedScript: string[];
}

/**
 * POST: Choose a LUT/filter and artify the script for vlog playback.
 * Uses one image + location + script (and optional voice) to pick a preset and rewrite text cinematically (~80% meaning preserved).
 */
export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI service not configured (missing GEMINI_API_KEY)' },
      { status: 503 }
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { location, image, scriptText, recordedAudioBase64, recordedMimeType } = body;
  const cleanImage = typeof image === 'string' ? image.replace(/^data:image\/\w+;base64,/, '').replace(/\s+/g, '') : '';
  if (!cleanImage || !scriptText || typeof scriptText !== 'string') {
    return NextResponse.json(
      { error: 'image and scriptText are required' },
      { status: 400 }
    );
  }

  const model = process.env.GEMINI_MODEL_CINEMATIC || process.env.NEXT_PUBLIC_GEMINI_MODEL_CINEMATIC || 'gemini-2.5-flash';

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are a cinematic director and colorist. You have two tasks.

TASK 1 - Choose exactly ONE color grade (LUT) from this list. Return its name exactly as written:
${FILTER_NAMES.map((n) => `- ${n}`).join('\n')}

Choose based on: the image's mood and colors, the location (if provided), and the script's tone. Pick the preset that would best elevate this vlog to a film-like look.

TASK 2 - Artify the user's script for subtitles. Rules:
- Keep roughly 80% of the original meaning and key information.
- Rewrite in a more cinematic, evocative style (suitable for film subtitles).
- Split into short lines: each line one phrase or sentence, 3-8 lines total typically.
- Same language as the user's script (if Chinese, respond in Chinese; if English, English).
- No extra commentary, only the artified subtitle lines.

Output format (JSON only, no markdown):
{"filterPreset":"Exact name from list","artifiedScript":["line1","line2",...]}`;

    const contentParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: systemPrompt },
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanImage,
        },
      },
      {
        text: [
          location?.trim() ? `Location: ${location.trim()}` : '',
          'User script (artify this for subtitles, keep ~80% meaning):',
          '---',
          scriptText.trim(),
          '---',
          'Respond with ONLY a single JSON object: {"filterPreset":"...","artifiedScript":["..."]}',
        ]
          .filter(Boolean)
          .join('\n'),
      },
    ];

    const response = await ai.models.generateContent({
      model,
      contents: { parts: contentParts },
      config: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    const rawText = response?.text?.trim();
    if (!rawText) {
      throw new Error('AI returned empty response');
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : rawText;
    const parsed = JSON.parse(jsonStr) as { filterPreset?: string; artifiedScript?: string[] };

    const filterPreset = FILTER_NAMES.includes(parsed.filterPreset as string)
      ? (parsed.filterPreset as string)
      : 'Original';
    const artifiedScript = Array.isArray(parsed.artifiedScript)
      ? parsed.artifiedScript.filter((l) => typeof l === 'string' && l.trim())
      : [scriptText.trim()].filter(Boolean);

    const result: ApiResponse = { filterPreset, artifiedScript };
    return NextResponse.json(result);
  } catch (error) {
    console.error('[vlog-style-and-script]', error);
    const message = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json(
      { error: message, retryable: true },
      { status: 500 }
    );
  }
}
