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
  /** Primary location coordinates in decimal degrees (inferred from images) */
  latitude?: number;
  longitude?: number;
  blocks: GeminiBlock[];
}

/**
 * POST: Generate a cinematic travel memory script using Gemini AI
 * 
 * This endpoint analyzes user-uploaded images and audio transcript to create
 * a beautifully orchestrated story with Apple-level cinematography.
 */
export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
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
  "latitude": 35.6762,
  "longitude": 139.6503,
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
- "latitude" and "longitude": Infer primary location from images; provide WGS84 decimal degrees (city center if uncertain). Required.

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
      : `<role>
You are a synthesis of the world's finest travel writers (Paul Theroux, Pico Iyer) and memoir authors (Annie Dillard, Cheryl Strayed). You transform travel photographs and personal reflections into cinematic visual stories that capture the poetry of human experience.
</role>

<mission>
Create a film-grade story script from the user's journey. Each block should feel like a frame from a masterfully directed film—rich in sensory detail, emotional resonance, and narrative momentum.
</mission>

<instructions>
1. **Analyze**: Study each image for composition, mood, and visual storytelling potential
2. **Match Layout**: Choose from 8 distinct layouts based on image characteristics
3. **Craft Text**: Write 2-4 evocative sentences per block that:
   - Capture the emotional truth of the moment
   - Use vivid sensory details (what you see, hear, feel)
   - Reflect the user's authentic voice from their transcript
   - Build a complete narrative arc across all blocks
4. **Validate**: Ensure variety in layouts and progression in storytelling
</instructions>

<user_context>
${transcript ? `<transcript>\n${transcript}\n</transcript>` : '<transcript>No audio provided. Create story from visual evidence alone.</transcript>'}
${userContext ? `\n<user_notes>\n${userContext}\n</user_notes>` : ''}
</user_context>

<layout_palette>
Choose wisely for each image based on composition and narrative needs:

1. **full_bleed** - Epic opener, sweeping landscapes, grand vistas
   Use: First image, dramatic moments, hero shots
   
2. **hero_split** - Asymmetric power (70% image, 30% text)
   Use: Strong verticals, architecture, portraits with negative space
   
3. **immersive_focus** - Emotional climax, full bleed with centered text
   Use: Peak moments, intimate portraits, decisive instances
   
4. **magazine_spread** - Editorial storytelling, split screen with space
   Use: Show AND tell moments, architectural details, contrasts
   
5. **minimal_caption** - Pure visual (90% image, 10% text)
   Use: When image speaks volumes, atmospheric shots, textures
   
6. **portrait_feature** - Human connection, vertical emphasis
   Use: People, vertical compositions, intimate moments
   
7. **text_overlay** - Bold statement, text integrated with image
   Use: Simple compositions, strong colors, graphic moments
   
8. **side_by_side** - Balanced narrative, classic 50/50 split
   Use: Thoughtful moments, need context, quiet reflections
</layout_palette>

<text_examples>
Instead of: "美丽的日落"
Write: "天空燃烧成普鲁士蓝，那一刻我明白了为什么人们会为了一个颜色跨越半个地球。疲惫在这抹蓝色面前变得微不足道。"

Instead of: "东京塔很高"
Write: "游客的快门声此起彼伏，但我只想安静地站在这里。这座钢铁巨人见证了这座城市的每一次呼吸，而我只是匆匆过客中的一个。"

Instead of: "横滨很安静"
Write: "面包超人的笑脸在海风中摇晃。这座城市有种让人放松的魔力——现代与艺术交织，海浪拍打着码头，一切都是刚刚好的节奏。"
</text_examples>

<verbosity_control>
- Each block text: 2-4 sentences (40-120 characters in Chinese)
- Be evocative but not flowery
- Prioritize emotional truth over description
- Use the user's own words and observations when available
- Write as if this will be read aloud in a documentary
</verbosity_control>

<output_format>
Return ONLY valid JSON (no markdown blocks):
{
  "title": "Poetic title (4-8 Chinese characters)",
  "location": "City/Region, Country",
  "latitude": 35.6762,
  "longitude": 139.6503,
  "blocks": [
    {
      "layout": "full_bleed" | "hero_split" | "immersive_focus" | "magazine_spread" | "minimal_caption" | "portrait_feature" | "text_overlay" | "side_by_side",
      "text": "Rich, evocative narrative (2-4 sentences, 40-120 Chinese chars)",
      "animation": "slow_zoom" | "parallax_drift" | "fade_in" | "scale_in" | "slide_up",
      "textPosition": "top" | "bottom" | "center" | "left" | "right" | "overlay",
      "textSize": "small" | "medium" | "large" | "huge",
      "imageFilter": "none" | "grayscale" | "warm" | "cool" | "vibrant" | "muted",
      "mood": "contemplative" | "joyful" | "melancholic" | "adventurous" | "peaceful" | "nostalgic"
    }
  ]
}
- "latitude" and "longitude": Infer the primary location from images (landmarks, scenery, signs) and provide approximate WGS84 decimal degrees. Use the city center if uncertain. Required.
</output_format>

<critical_rules>
- Generate exactly ${images.length} blocks (one per image, in sequence)
- All text in Chinese, authentic to user's voice
- First block: Use "full_bleed" or "hero_split" to establish tone
- Last block: Reflective or climactic to leave lasting impression
- Layout variety: No more than 2 consecutive identical layouts
- Narrative arc: opening → journey → transformation → reflection
- Ground text in user's transcript when available—use their specific observations
</critical_rules>

<final_instruction>
Now analyze the ${imageCount} images. Create a story that honors the user's authentic experience while elevating it to cinematic art.
</final_instruction>`;

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

    const model = process.env.GEMINI_MODEL_CINEMATIC || process.env.NEXT_PUBLIC_GEMINI_MODEL_CINEMATIC || 'gemini-3-flash-preview';
    console.log(`[AI Director] Using model: ${model}`);
    
    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: contentParts,
        },
        config: {
          temperature: 1.0, // Gemini 3 default - do not change to avoid degraded performance
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

      const lat = typeof parsed.latitude === 'number' && parsed.latitude >= -90 && parsed.latitude <= 90 ? parsed.latitude : undefined;
      const lng = typeof parsed.longitude === 'number' && parsed.longitude >= -180 && parsed.longitude <= 180 ? parsed.longitude : undefined;

      if (parsed.blocks.length !== imageCount) {
        console.warn(`[AI Director] Block count mismatch: expected ${imageCount}, got ${parsed.blocks.length}`);
      }

      // Build the final DirectorScript with actual image data and enhanced metadata
      const directorScript: DirectorScript = {
        title: parsed.title,
        location: parsed.location,
        ...(lat != null && lng != null && { latitude: lat, longitude: lng }),
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
