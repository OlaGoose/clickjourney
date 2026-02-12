/**
 * Location info API: AI-generated brief fact + nearby place.
 * Provider order: auto => Gemini → Doubao → OpenAI (first configured wins).
 */

import { NextRequest, NextResponse } from 'next/server';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta';

interface GroundingChunk {
  maps?: { uri?: string; title?: string };
  web?: { uri?: string; title?: string };
}

export interface LocationInfoResponse {
  text: string;
  groundingChunks?: GroundingChunk[];
}

function getProvider(): 'gemini' | 'doubao' | 'openai' | null {
  const mode = (process.env.AI_PROVIDER || process.env.NEXT_PUBLIC_AI_PROVIDER || 'auto').toLowerCase();
  const gemini = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const doubao = process.env.DOUBAO_API_KEY || process.env.NEXT_DOUBAO_API_KEY;
  const openai = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (mode === 'auto') {
    if (gemini) return 'gemini';
    if (doubao) return 'doubao';
    if (openai) return 'openai';
    return null;
  }
  if (mode === 'gemini' && gemini) return 'gemini';
  if (mode === 'doubao' && doubao) return 'doubao';
  if (mode === 'openai' && openai) return 'openai';
  return null;
}

async function fetchWithGemini(locationName: string, lat: number, lng: number): Promise<LocationInfoResponse> {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY)!;
  const model = process.env.GEMINI_MODEL || process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `${GEMINI_ENDPOINT}/models/${model}:generateContent`;
  const body: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `I am currently looking at ${locationName} (latitude ${lat}, longitude ${lng}) on a digital globe. Tell me a very brief, interesting 2-sentence fact about this specific location, followed by one top-rated place to visit nearby. Be concise.`,
          },
        ],
      },
    ],
    generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini: ${err}`);
  }
  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    'Could not retrieve information.';
  const groundingChunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks as
    | GroundingChunk[]
    | undefined;
  return { text, groundingChunks };
}

async function fetchWithDoubao(locationName: string, lat: number, lng: number): Promise<LocationInfoResponse> {
  const apiKey = (process.env.DOUBAO_API_KEY || process.env.NEXT_DOUBAO_API_KEY)!;
  const endpoint = (process.env.DOUBAO_CHAT_ENDPOINT || process.env.NEXT_DOUBAO_CHAT_ENDPOINT)!;
  const model = process.env.DOUBAO_CHAT_MODEL || process.env.NEXT_DOUBAO_CHAT_MODEL || 'doubao-seed-1-6-lite-251015';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: `I am looking at ${locationName} (lat: ${lat}, lng: ${lng}) on a digital globe. In 2 short sentences: (1) one interesting fact about this place, (2) one top-rated place to visit nearby. Be brief.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 256,
    }),
  });
  if (!res.ok) throw new Error(`Doubao: ${await res.text()}`);
  const data = await res.json();
  const text =
    data.choices?.[0]?.message?.content?.trim() || 'Could not retrieve information.';
  return { text };
}

async function fetchWithOpenAI(locationName: string, lat: number, lng: number): Promise<LocationInfoResponse> {
  const apiKey = (process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY)!;
  const model = process.env.OPENAI_MODEL || process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: `I am looking at ${locationName} (lat: ${lat}, lng: ${lng}) on a digital globe. In 2 short sentences: (1) one interesting fact about this place, (2) one top-rated place to visit nearby. Be brief.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 256,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI: ${await res.text()}`);
  const data = await res.json();
  const text =
    data.choices?.[0]?.message?.content?.trim() || 'Could not retrieve information.';
  return { text };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || 'this location';
  const lat = parseFloat(searchParams.get('lat') ?? '0');
  const lng = parseFloat(searchParams.get('lng') ?? '0');

  const provider = getProvider();
  if (!provider) {
    return NextResponse.json(
      { text: 'AI provider not configured. Set AI_PROVIDER and API keys (server env).' },
      { status: 503 }
    );
  }

  try {
    let result: LocationInfoResponse;
    if (provider === 'gemini') result = await fetchWithGemini(name, lat, lng);
    else if (provider === 'doubao') result = await fetchWithDoubao(name, lat, lng);
    else result = await fetchWithOpenAI(name, lat, lng);
    return NextResponse.json(result);
  } catch (e) {
    console.error('location-info', e);
    return NextResponse.json(
      { text: "Sorry, I couldn't connect to the travel guide at the moment." },
      { status: 200 }
    );
  }
}
