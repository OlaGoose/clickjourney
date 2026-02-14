import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { FILTER_PRESETS } from '@/types/vlog';

const FILTER_NAMES = FILTER_PRESETS.map((p) => p.name);

/** Fetch a public URL and return base64 (no data URI prefix). Used for imageUrl/recordedAudioUrl from Supabase storage. */
async function fetchUrlToBase64(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const buf = await res.arrayBuffer();
  const base64 = Buffer.from(buf).toString('base64');
  return base64;
}

interface RequestBody {
  location?: string;
  /** Single image as base64 (no data URL prefix or stripped). */
  image?: string;
  /** Public image URL (e.g. Supabase storage). Server fetches and converts to base64; avoids large client payload on real devices. */
  imageUrl?: string;
  /** User's screenplay/script text (plain or newline-separated lines). */
  scriptText: string;
  /** Optional: user voice recording base64 for mood analysis. */
  recordedAudioBase64?: string;
  recordedMimeType?: string;
  /** Optional: public URL of recorded audio (e.g. Supabase storage). Server fetches and converts. */
  recordedAudioUrl?: string;
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

  const { location, image, imageUrl, scriptText, recordedAudioBase64, recordedMimeType, recordedAudioUrl } = body;
  if (!scriptText || typeof scriptText !== 'string') {
    return NextResponse.json(
      { error: 'scriptText is required' },
      { status: 400 }
    );
  }
  let cleanImage: string;
  if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
    try {
      cleanImage = await fetchUrlToBase64(imageUrl);
    } catch (e) {
      console.warn('[vlog-style-and-script] fetch imageUrl failed:', e);
      return NextResponse.json(
        { error: 'Failed to fetch image from URL' },
        { status: 400 }
      );
    }
  } else if (image && typeof image === 'string') {
    cleanImage = image.replace(/^data:image\/\w+;base64,/, '').replace(/\s+/g, '');
  } else {
    return NextResponse.json(
      { error: 'image or imageUrl is required' },
      { status: 400 }
    );
  }
  if (!cleanImage) {
    return NextResponse.json(
      { error: 'image or imageUrl is required' },
      { status: 400 }
    );
  }
  let recordedBase64 = typeof recordedAudioBase64 === 'string' ? recordedAudioBase64 : undefined;
  if (!recordedBase64 && recordedAudioUrl && typeof recordedAudioUrl === 'string' && recordedAudioUrl.startsWith('http')) {
    try {
      recordedBase64 = await fetchUrlToBase64(recordedAudioUrl);
    } catch {
      // optional voice analysis
    }
  }

  const model = process.env.GEMINI_MODEL_CINEMATIC || process.env.NEXT_PUBLIC_GEMINI_MODEL_CINEMATIC || 'gemini-2.5-flash';

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are a memoir writer who approaches each person's story with editorial curiosity. You believe every life deserves to be treated seriously—not because it must be grand or dramatic, but because the details, emotions, and turning points within real experiences hold their own power.

Your work is not to beautify or judge, but to help people find ways to tell their own stories. You ask questions that evoke sensory details: How was the light that afternoon? What were you thinking then? What did the air smell like? You believe sensory details make memories three-dimensional, letting readers feel as if they are there.

You maintain a gentle realism about human nature. You know memories shift, emotions are complex, and the same event can mean different things at different times. You don't force stories to become "inspirational" or "complete," but respect life as it is—with regrets, contradictions, and unresolved questions.

Your goal is to help people face their past honestly, not to dwell in it, but to understand it, integrate it, and ultimately move forward freely. Everyone deserves a story that is told with care.

---

You have two tasks:

TASK 1 - Choose exactly ONE color grade (LUT) from this list. Return its name exactly as written:
${FILTER_NAMES.map((n) => `- ${n}`).join('\n')}

Choose based on: the image's mood and colors, the location (if provided), and the emotional truth in the script. Pick the preset that would best honor the authenticity of this memory while giving it a cinematic quality.

TASK 2 - Transform the user's script into memoir-quality subtitles. Rules:
- Keep roughly 80% of the original meaning and key information.
- Emphasize sensory details (light, sound, smell, texture) and emotional honesty.
- Respect the complexity and contradictions in their experience—don't force resolution or inspiration.
- Use their authentic voice; if they're tentative, stay tentative. If they're certain, reflect that.
- Split into short lines: each line one phrase or sentence, 3-8 lines total typically.
- Same language as the user's script (if Chinese, respond in Chinese; if English, English).
- Write as if this will be read by someone who wants to understand, not judge.
- No extra commentary, only the refined subtitle lines.

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
