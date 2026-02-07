import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import type { DirectorScript, LayoutType } from '@/types/cinematic';

interface GenerateScriptRequest {
  images: string[]; // Base64 encoded images
  transcript: string;
  userContext?: string;
}

interface GeminiBlock {
  layout: LayoutType;
  text: string;
  animation: string;
}

interface GeminiResponse {
  title: string;
  location: string;
  blocks: GeminiBlock[];
}

/**
 * POST: Generate a cinematic travel memory script using Gemini AI
 * 
 * This endpoint analyzes user-uploaded images and audio transcript to create
 * a beautifully orchestrated story with Apple-level cinematography.
 */
export async function POST(request: Request) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI service not configured (missing GEMINI_API_KEY)' },
      { status: 503 }
    );
  }

  let body: GenerateScriptRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { images, transcript, userContext } = body;

  if (!images || !Array.isArray(images) || images.length === 0) {
    return NextResponse.json(
      { error: 'At least one image is required' },
      { status: 400 }
    );
  }

  if (images.length > 9) {
    return NextResponse.json(
      { error: 'Maximum 9 images allowed' },
      { status: 400 }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Construct the ultimate prompt (Apple-level storytelling)
    const systemPrompt = `You are Apple's Chief Creative Director for Memories, tasked with transforming travel photos into cinematic masterpieces.

MISSION: Create a film-grade story script from the user's journey.

DESIGN PHILOSOPHY (The "Apple Standard"):
- Every word must earn its place. Be poetic, not verbose.
- Seek the extraordinary in the ordinary. Avoid clichés.
- Write like a novelist, think like a cinematographer.
- Maximum 20 characters per caption (Chinese).

AUDIO CONTEXT:
${transcript || 'No audio transcript provided. Rely purely on visual storytelling.'}

${userContext ? `USER NOTES:\n${userContext}\n` : ''}

LAYOUT ASSIGNMENT RULES:
1. "full_bleed" - For epic landscapes, sunsets, seascapes, or establishing shots
   - Use for the opening (first image) to set the tone
   - Best for wide, horizontal compositions
   
2. "side_by_side" - For narrative moments with context
   - Use when combining visual + detailed story
   - Alternate with other layouts for rhythm
   
3. "immersive_focus" - For intimate moments, portraits, details, emotions
   - Use for close-ups, faces, textures
   - Create emotional peaks in the story arc

ANIMATION SUGGESTIONS:
- "slow_zoom" - For full_bleed layouts (Ken Burns effect)
- "parallax_drift" - For side_by_side layouts
- "fade_in" - For immersive_focus layouts

OUTPUT FORMAT (Strict JSON):
{
  "title": "Poetic trip title (5-8 characters in Chinese)",
  "location": "City/Region, Country",
  "blocks": [
    {
      "layout": "full_bleed" | "side_by_side" | "immersive_focus",
      "text": "One powerful sentence. Cinematic. Emotional.",
      "animation": "slow_zoom" | "parallax_drift" | "fade_in"
    }
  ]
}

CRITICAL RULES:
- Generate exactly ${images.length} blocks (one per image)
- Text must be in Chinese
- Each text: 1 sentence, max 40 characters
- Create a story arc: opening → development → climax → reflection
- First block MUST be "full_bleed" to establish the scene
- Last block should be reflective or poetic
- Mix layouts naturally (avoid repeating the same layout 3+ times consecutively)

Now analyze the ${images.length} images and create magic.`;

    // Prepare content parts with all images
    const contentParts = [
      { text: systemPrompt },
      ...images.map((base64Data) => ({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data.replace(/^data:image\/\w+;base64,/, ''),
        },
      })),
      { text: '\nGenerate the JSON script now. Output ONLY valid JSON, no markdown code blocks.' }
    ];

    console.log(`[AI Director] Analyzing ${images.length} images with transcript...`);

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: {
        parts: contentParts,
      },
      config: {
        temperature: 0.9, // High creativity for artistic output
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    if (!response || !response.text) {
      throw new Error('AI returned empty response');
    }

    const rawText = response.text || '';
    console.log('[AI Director] Raw response:', rawText);

    // Parse the AI response (handle potential markdown wrapping)
    let parsed: GeminiResponse;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = rawText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : rawText;
      parsed = JSON.parse(jsonText.trim());
    } catch (parseError) {
      console.error('[AI Director] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'AI generated invalid response format', details: rawText },
        { status: 500 }
      );
    }

    // Validate the response structure
    if (!parsed.title || !parsed.location || !Array.isArray(parsed.blocks)) {
      return NextResponse.json(
        { error: 'Invalid script structure from AI', details: parsed },
        { status: 500 }
      );
    }

    if (parsed.blocks.length !== images.length) {
      console.warn(`[AI Director] Block count mismatch: expected ${images.length}, got ${parsed.blocks.length}`);
    }

    // Build the final DirectorScript with actual image data
    const directorScript: DirectorScript = {
      title: parsed.title,
      location: parsed.location,
      blocks: parsed.blocks.slice(0, images.length).map((block, index) => ({
        id: `block_${Date.now()}_${index}`,
        layout: block.layout,
        image: `data:image/jpeg;base64,${images[index].replace(/^data:image\/\w+;base64,/, '')}`,
        text: block.text,
        animation: block.animation || 'fade_in',
      })),
    };

    console.log('[AI Director] Script generated successfully:', {
      title: directorScript.title,
      blocks: directorScript.blocks.length,
    });

    return NextResponse.json(directorScript);

  } catch (error) {
    console.error('[AI Director] Generation failed:', error);
    
    // Provide helpful error messages based on error type
    let userMessage = 'Failed to generate cinematic script';
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        userMessage = 'AI service is not configured. Please check your API key.';
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        userMessage = 'AI service is temporarily unavailable. Please try again later.';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Request timed out. Please try with fewer images or compress them further.';
      } else if (error.message.includes('invalid') || error.message.includes('parse')) {
        userMessage = 'AI generated invalid response. Please try again.';
      }
    }
    
    return NextResponse.json(
      { 
        error: userMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
      },
      { status: 500 }
    );
  }
}
