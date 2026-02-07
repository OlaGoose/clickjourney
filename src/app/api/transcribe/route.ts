/*
 * @Author: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @Date: 2026-02-07 15:33:45
 * @LastEditors: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @LastEditTime: 2026-02-07 21:07:59
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

  const model = process.env.NEXT_PUBLIC_GEMINI_MODEL_STT || 'gemini-2.5-flash';
  
  console.log(`[Transcribe] Using model: ${model}`);
  console.log(`[Transcribe] Audio data length: ${base64.length} characters`);
  console.log(`[Transcribe] MIME type: ${mimeType}`);
  
  // Clean base64 data: remove any whitespace/newlines that might cause validation errors
  const cleanBase64 = base64.replace(/\s+/g, '');
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: '请将这段录音转写为中文文本，直接输出内容即可，不要包含其他解释。',
          },
        ],
      },
    });

    const text = response.text ?? '';
    console.log(`[Transcribe] Success: ${text.substring(0, 50)}...`);
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error('[Transcribe] Error details:', {
      message: err.message,
      status: err.status,
      name: err.name,
      stack: err.stack,
      toString: err.toString(),
    });
    
    // Provide more specific error messages
    let errorMessage = 'Transcription failed';
    if (err.message?.includes('not found') || err.message?.includes('404')) {
      errorMessage = `模型 ${model} 不可用，请检查模型名称配置`;
    } else if (err.message?.includes('pattern') || err.message?.includes('match')) {
      errorMessage = `模型名称格式错误: ${model}`;
    } else if (err.message?.includes('API key')) {
      errorMessage = 'API 密钥无效';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: err.message,
        model: model,
      },
      { status: 500 }
    );
  }
}
