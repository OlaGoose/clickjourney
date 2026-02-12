/**
 * Server-side proxy for Gemini (image gen/edit/analyze, TTS).
 * Keeps GEMINI_API_KEY on the server; client never sees the key.
 */

import { NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';
import type { AspectRatio, ImageSize } from '@/types/cinematic';

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenAI({ apiKey });
};

type Action = 'generateImage' | 'editImage' | 'analyzeImage' | 'generateSpeech';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, params } = body as { action: Action; params: Record<string, unknown> };
    if (!action || !params) {
      return NextResponse.json({ error: 'Missing action or params' }, { status: 400 });
    }

    const ai = getAI();

    switch (action) {
      case 'generateImage': {
        const prompt = params.prompt as string;
        const aspectRatio = (params.aspectRatio as AspectRatio) ?? '16:9';
        const imageSize = (params.imageSize as ImageSize) ?? '1K';
        const model = process.env.GEMINI_MODEL_IMAGE || process.env.NEXT_PUBLIC_GEMINI_MODEL_IMAGE || 'gemini-3-pro-image-preview';
        const response = await ai.models.generateContent({
          model,
          contents: { parts: [{ text: prompt }] },
          config: {
            imageConfig: { aspectRatio, imageSize },
          },
        });
        const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
        const imageBase64 = part?.inlineData?.data;
        if (!imageBase64) return NextResponse.json({ error: 'No image data' }, { status: 502 });
        return NextResponse.json({ imageBase64: `data:image/png;base64,${imageBase64}` });
      }

      case 'editImage': {
        const base64Image = params.base64Image as string;
        const prompt = params.prompt as string;
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const model = process.env.GEMINI_MODEL_IMAGE_EDIT || process.env.NEXT_PUBLIC_GEMINI_MODEL_IMAGE_EDIT || 'gemini-2.5-flash-image';
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: 'image/png' } },
              { text: prompt },
            ],
          },
        });
        const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
        const imageBase64 = part?.inlineData?.data;
        if (!imageBase64) return NextResponse.json({ error: 'No edited image' }, { status: 502 });
        return NextResponse.json({ imageBase64: `data:image/png;base64,${imageBase64}` });
      }

      case 'analyzeImage': {
        const base64Image = params.base64Image as string;
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const model = process.env.GEMINI_MODEL_IMAGE_ANALYZE || process.env.NEXT_PUBLIC_GEMINI_MODEL_IMAGE_ANALYZE || 'gemini-3-pro-preview';
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: 'image/png' } },
              { text: 'Analyze this image and write a poetic, cinematic caption for a travel story (max 2 sentences).' },
            ],
          },
        });
        const text = response.text ?? 'Could not analyze image.';
        return NextResponse.json({ text });
      }

      case 'generateSpeech': {
        const text = params.text as string;
        const voiceName = (params.voiceName as string) ?? 'Kore';
        const model = process.env.GEMINI_MODEL_TTS || process.env.NEXT_PUBLIC_GEMINI_MODEL_TTS || 'gemini-2.5-flash-preview-tts';
        const response = await ai.models.generateContent({
          model,
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName } },
            },
          },
        });
        const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioBase64) return NextResponse.json({ error: 'No audio data' }, { status: 502 });
        return NextResponse.json({ audioBase64 });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e) {
    console.error('gemini-client', e);
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
