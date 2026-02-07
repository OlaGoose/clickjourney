import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import type { DirectorScript, LayoutType } from '@/types/cinematic';

interface ImageAnalysis {
  index: number;
  description: string;
  visualFeatures: {
    mood: string;
    composition: string;
    colorPalette: string;
    subject: string;
    timeOfDay: string;
  };
}

interface GenerateScriptRequest {
  images: string[]; // Base64 encoded images (for backward compatibility)
  imageAnalyses?: ImageAnalysis[]; // Pre-analyzed image data (preferred)
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

  const { images, imageAnalyses, transcript, userContext } = body;

  // Support both new (imageAnalyses) and old (images) flow
  const useAnalysisFlow = imageAnalyses && Array.isArray(imageAnalyses) && imageAnalyses.length > 0;
  const imageCount = useAnalysisFlow ? imageAnalyses.length : (images?.length || 0);

  if (imageCount === 0) {
    return NextResponse.json(
      { error: 'At least one image or image analysis is required' },
      { status: 400 }
    );
  }

  if (imageCount > 9) {
    return NextResponse.json(
      { error: 'Maximum 9 images allowed' },
      { status: 400 }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Construct the ultimate prompt with enhanced editorial standards
    const systemPrompt = useAnalysisFlow 
      ? `You are the creative genius behind National Geographic, Kinfolk, and Apple's best Stories features—a master of visual storytelling who transforms moments into cinematic masterpieces.

MISSION: Create a film-grade story script from pre-analyzed travel images.

EDITORIAL PHILOSOPHY (World-Class Standard):
- Write like Hemingway: Every word earns its place. Be profound, not verbose.
- Think like a film director: Consider pacing, emotional arc, visual rhythm.
- Design like a Swiss typographer: Balance, negative space, hierarchy.
- Feel like a poet: Seek beauty in the ordinary. Avoid tourism clichés.
- Maximum 20 characters per caption (Chinese).

AUDIO CONTEXT:
${transcript || 'No audio transcript provided. Let visuals lead the narrative.'}

${userContext ? `USER NOTES:\n${userContext}\n` : ''}

IMAGE ANALYSES (Pre-processed visual data):
${imageAnalyses!.map((analysis, i) => `
[Image ${i + 1}]
- Description: ${analysis.description}
- Mood: ${analysis.visualFeatures.mood}
- Composition: ${analysis.visualFeatures.composition}
- Color Palette: ${analysis.visualFeatures.colorPalette}
- Subject: ${analysis.visualFeatures.subject}
- Time of Day: ${analysis.visualFeatures.timeOfDay}
`).join('\n')}

LAYOUT ASSIGNMENT RULES (Magazine-Grade):
1. "full_bleed" - Epic openers, sweeping vistas, establishing mood
   - Use for landscapes, dramatic skies, architectural grandeur
   - Best for the opening image to set the tone
   - Creates immersion through scale
   
2. "side_by_side" - Editorial storytelling, context + narrative
   - Combine visual + rich narrative text
   - Use for moments that need explanation or reflection
   - Creates intimacy through juxtaposition
   
3. "immersive_focus" - Emotional peaks, portraits, sensory details
   - Close-ups that reveal character or emotion
   - Moments of stillness or intensity
   - Creates impact through simplicity

ANIMATION SUGGESTIONS (Cinematic Motion):
- "slow_zoom" - For full_bleed (Ken Burns effect, gradual reveal)
- "parallax_drift" - For side_by_side (editorial depth, layered storytelling)
- "fade_in" - For immersive_focus (gentle emergence, emotional build)

OUTPUT FORMAT (Strict JSON):
{
  "title": "Evocative title (5-8 characters in Chinese, poetic and memorable)",
  "location": "City/Region, Country",
  "blocks": [
    {
      "layout": "full_bleed" | "side_by_side" | "immersive_focus",
      "text": "One powerful sentence. Cinematic. Emotional. (Chinese, max 40 chars)",
      "animation": "slow_zoom" | "parallax_drift" | "fade_in"
    }
  ]
}

CRITICAL RULES:
- Generate exactly ${imageCount} blocks (one per image, in order)
- Text must be in Chinese
- Each text: 1 sentence, max 40 characters
- Create a three-act structure: Setup (25%) → Conflict/Journey (50%) → Resolution (25%)
- First block MUST be "full_bleed" to establish the world
- Last block should offer reflection, closure, or a lingering emotion
- Vary layouts naturally (avoid 3+ consecutive repeats)
- Use visual features to inform layout choice:
  * "landscape" + "golden-hour" + "calm" → likely full_bleed
  * "portrait" + "dramatic" + "close-up" → likely immersive_focus
  * "architecture" + "muted" + "symmetrical" → could be side_by_side
- Match text mood to visual mood (don't force joy onto melancholy)
- Honor the time-of-day: morning = beginnings, evening = reflection

Now craft a story that feels like a limited-edition photo book.`
      : `You are Apple's Chief Creative Director for Memories, tasked with transforming travel photos into cinematic masterpieces.

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

Now analyze the ${imageCount} images and create magic.`;

    // Prepare content parts
    // For analysis flow: only send text (no images)
    // For legacy flow: send images as before
    const contentParts = useAnalysisFlow
      ? [
          { text: systemPrompt },
          { text: '\nGenerate the JSON script now based on the image analyses above. Output ONLY valid JSON, no markdown code blocks.' }
        ]
      : [
          { text: systemPrompt },
          ...images.map((base64Data) => {
            const cleanData = base64Data
              .replace(/^data:image\/\w+;base64,/, '')
              .replace(/\s+/g, '');
            return {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanData,
              },
            };
          }),
          { text: '\nGenerate the JSON script now. Output ONLY valid JSON, no markdown code blocks.' }
        ];

    console.log(`[AI Director] Mode: ${useAnalysisFlow ? 'Text-based (with image analyses)' : 'Image-based (legacy)'}`);
    console.log(`[AI Director] Processing ${imageCount} ${useAnalysisFlow ? 'analyzed images' : 'raw images'} with transcript...`);
    console.log(`[AI Director] Content parts count: ${contentParts.length}`);
    console.log(`[AI Director] System prompt length: ${systemPrompt.length} characters`);

    const model = process.env.NEXT_PUBLIC_GEMINI_MODEL_CINEMATIC || 'gemini-3-flash-preview';
    console.log(`[AI Director] Using model: ${model}`);
    
    try {
      const response = await ai.models.generateContent({
        model,
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
        console.error('[AI Director] Empty response from API');
        throw new Error('AI returned empty response');
      }

      const rawText = response.text || '';
      console.log('[AI Director] Raw response:', rawText.substring(0, 200) + '...');

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

      if (parsed.blocks.length !== imageCount) {
        console.warn(`[AI Director] Block count mismatch: expected ${imageCount}, got ${parsed.blocks.length}`);
      }

      // Build the final DirectorScript with actual image data
      const directorScript: DirectorScript = {
        title: parsed.title,
        location: parsed.location,
        blocks: parsed.blocks.slice(0, imageCount).map((block, index) => ({
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
      
    } catch (apiError: any) {
      console.error('[AI Director] API Error:', {
        message: apiError.message,
        status: apiError.status,
        statusText: apiError.statusText,
        details: apiError.toString(),
      });
      
      // Check for specific error patterns
      if (apiError.message?.includes('pattern') || apiError.message?.includes('match')) {
        return NextResponse.json(
          { 
            error: '模型名称验证失败，请检查配置',
            details: `Model: ${model}, Error: ${apiError.message}`,
            retryable: false
          },
          { status: 500 }
        );
      }
      
      throw apiError; // Re-throw to be caught by outer catch
    }


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
