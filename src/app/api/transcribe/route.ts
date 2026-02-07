/*
 * @Author: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @Date: 2026-02-07 15:33:45
 * @LastEditors: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @LastEditTime: 2026-02-07 16:13:13
 * @FilePath: /orbit-journey-next/src/app/api/transcribe/route.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

/** POST: transcribe audio (base64) to Chinese text via Gemini. */
export async function POST(request: Request) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Transcription not configured (missing GEMINI_API_KEY)' },
      { status: 503 }
    );
  }

  let body: { base64?: string; mimeType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const base64 = body.base64;
  const mimeType = body.mimeType ?? 'audio/webm';
  if (!base64 || typeof base64 !== 'string') {
    return NextResponse.json(
      { error: 'Missing or invalid base64 audio' },
      { status: 400 }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          {
            text: '请将这段录音转写为中文文本，直接输出内容即可，不要包含其他解释。',
          },
        ],
      },
    });

    const text = response.text ?? '';
    return NextResponse.json({ text });
  } catch (err) {
    console.error('Transcription error:', err);
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    );
  }
}
