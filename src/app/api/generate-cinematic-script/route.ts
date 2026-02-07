import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import type { DirectorScript, LayoutType } from '@/types/cinematic';

interface ImageAnalysis {
  index: number;
  description: string;
  storyPotential: string;
  emotionalTone: string;
  visualFeatures: {
    mood: string;
    composition: string;
    colorPalette: string;
    colorDominance: string;
    subject: string;
    timeOfDay: string;
    lighting: string;
    depth: string;
    movement: string;
    texture: string;
    perspective: string;
    focus: string;
  };
  layoutSuggestion: string;
  textPlacement: string;
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
  textPosition?: 'top' | 'bottom' | 'center' | 'left' | 'right' | 'overlay';
  textSize?: 'small' | 'medium' | 'large' | 'huge';
  imageFilter?: 'none' | 'grayscale' | 'warm' | 'cool' | 'vibrant' | 'muted';
  mood?: string;
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
      ? `You are Airbnb's Chief Experience Designer meets Apple's Chief Creative Officer meets The New Yorker's Photo Editor—a visionary who creates travel stories that people remember forever.

MISSION: Transform analyzed travel photographs into an immersive, breathtaking visual narrative that rivals the best travel magazines and Apple keynote presentations.

EDITORIAL PHILOSOPHY (Airbnb + Apple Standard):
- EMOTION FIRST: Every image, every word must evoke feeling
- MINIMALISM: Elegant restraint. Say more with less.
- AUTHENTICITY: Real moments, real emotions. No tourism clichés.
- RHYTHM: Like a symphony—build tension, release, surprise, resolution
- BEAUTY: Make every frame worthy of being printed and framed

AUDIO CONTEXT:
${transcript || 'No audio transcript. Pure visual poetry.'}

${userContext ? `USER NOTES:\n${userContext}\n` : ''}

DEEP IMAGE ANALYSES (Gemini 3 Pro Insights):
${imageAnalyses!.map((analysis, i) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMAGE ${i + 1} ANALYSIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📸 Description: ${analysis.description}
🎬 Story Potential: ${analysis.storyPotential}
💫 Emotional Tone: ${analysis.emotionalTone}

VISUAL DNA:
• Mood: ${analysis.visualFeatures.mood}
• Composition: ${analysis.visualFeatures.composition}
• Color Palette: ${analysis.visualFeatures.colorPalette} (${analysis.visualFeatures.colorDominance})
• Lighting: ${analysis.visualFeatures.lighting}
• Depth: ${analysis.visualFeatures.depth}
• Movement: ${analysis.visualFeatures.movement}
• Texture: ${analysis.visualFeatures.texture}
• Perspective: ${analysis.visualFeatures.perspective}
• Focus: ${analysis.visualFeatures.focus}
• Subject: ${analysis.visualFeatures.subject}
• Time: ${analysis.visualFeatures.timeOfDay}

RECOMMENDED:
• Layout: ${analysis.layoutSuggestion}
• Text Position: ${analysis.textPlacement}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LAYOUT PALETTE (Choose wisely for each image):

1. "full_bleed" - EPIC OPENER
   → Sweeping landscapes, grand vistas, opening statements
   → Text: bottom center, large, white on dark gradient
   → When: First image, dramatic landscapes, hero moments

2. "hero_split" - ASYMMETRIC POWER
   → Large image (70%) + impactful text (30%)
   → Text: side panel, huge typography, high contrast
   → When: Strong vertical compositions, architectural shots, portraits with space

3. "immersive_focus" - EMOTIONAL CLIMAX
   → Full bleed with centered text overlay
   → Text: center, huge, layered with image
   → When: Peak emotional moments, intimate portraits, decisive moments

4. "magazine_spread" - EDITORIAL STORYTELLING
   → Split screen with generous negative space
   → Text: opposite side, medium, thoughtful placement
   → When: Need to show AND tell, architectural details, before/after feelings

5. "minimal_caption" - PURE VISUAL
   → 90% image, 10% text
   → Text: corner or edge, small, subtle
   → When: Image speaks for itself, atmospheric shots, texture closeups

6. "portrait_feature" - HUMAN CONNECTION
   → Vertical emphasis, subject-focused
   → Text: bottom or top band, medium, name-like
   → When: People, vertical compositions, intimate moments

7. "text_overlay" - BOLD STATEMENT
   → Text directly on image, integrated
   → Text: anywhere, huge, part of composition
   → When: Simple compositions, strong colors, graphic moments

8. "side_by_side" - BALANCED NARRATIVE
   → Classic 50/50 editorial split
   → Text: dedicated panel, multiple sizes, hierarchy
   → When: Thoughtful moments, need more context, quiet reflections

OUTPUT FORMAT (Strict JSON):
{
  "title": "Poetic title (4-6 Chinese characters, unforgettable)",
  "location": "City/Region, Country",
  "blocks": [
    {
      "layout": "full_bleed" | "hero_split" | "immersive_focus" | "magazine_spread" | "minimal_caption" | "portrait_feature" | "text_overlay" | "side_by_side",
      "text": "One powerful line. Cinematic. Emotional. (Chinese, 15-40 chars)",
      "animation": "slow_zoom" | "parallax_drift" | "fade_in" | "scale_in" | "slide_up",
      "textPosition": "top" | "bottom" | "center" | "left" | "right" | "overlay",
      "textSize": "small" | "medium" | "large" | "huge",
      "imageFilter": "none" | "grayscale" | "warm" | "cool" | "vibrant" | "muted",
      "mood": "Use the analyzed mood"
    }
  ]
}

GOLDEN RULES:
✓ ${imageCount} blocks total (one per image, in sequence)
✓ Text in Chinese, authentic and poetic
✓ First image: ALWAYS full_bleed or hero_split (establish the world)
✓ Last image: reflective or climactic (leave an impression)
✓ Variety: No more than 2 consecutive identical layouts
✓ Use AI analysis suggestions BUT apply editorial judgment
✓ Match layout to composition:
  → Landscape/wide-angle → full_bleed, hero_split
  → Portrait/close-up → portrait_feature, immersive_focus
  → Symmetric/architectural → magazine_spread, side_by_side
  → Atmospheric/texture → minimal_caption, text_overlay
✓ Text size proportional to layout impact:
  → full_bleed, immersive_focus → large or huge
  → minimal_caption → small
  → others → medium or large
✓ Image filter based on color analysis:
  → Warm/golden palette → warm filter
  → Cool/blue palette → cool filter
  → Vibrant colors → vibrant filter
  → Muted tones → muted or grayscale filter
✓ Create NARRATIVE ARC:
  → Act 1 (0-30%): Arrival, discovery, wonder
  → Act 2 (30-70%): Journey, experience, transformation
  → Act 3 (70-100%): Reflection, meaning, lasting impression

Now create an experience so beautiful it makes people want to travel.`
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

      // Build the final DirectorScript with actual image data and enhanced metadata
      const directorScript: DirectorScript = {
        title: parsed.title,
        location: parsed.location,
        blocks: parsed.blocks.slice(0, imageCount).map((block, index) => ({
          id: `block_${Date.now()}_${index}`,
          layout: block.layout,
          image: `data:image/jpeg;base64,${images[index].replace(/^data:image\/\w+;base64,/, '')}`,
          text: block.text,
          animation: block.animation || 'fade_in',
          textPosition: block.textPosition,
          textSize: block.textSize,
          imageFilter: block.imageFilter,
          mood: block.mood,
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
