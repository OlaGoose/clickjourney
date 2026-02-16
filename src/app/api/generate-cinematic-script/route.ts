import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import type { DirectorScript, LayoutType } from '@/types/cinematic';

interface GenerateScriptRequest {
  images: string[];
  transcript: string;
  userContext?: string;
  /** User-provided travel location (memory place); overrides AI-inferred location when set. */
  location?: string;
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

  const { images, transcript, userContext, location: userLocation } = body;
  const imageCount = images?.length ?? 0;

  if (imageCount === 0) {
    return NextResponse.json(
      { error: 'At least one image is required' },
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

    const systemPrompt = `<role>
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

<location>
${userLocation?.trim() ? `Primary location (use for "location" in JSON): ${userLocation.trim()}` : 'Infer from images.'}
</location>

<user_context>
${transcript ? `<transcript>\n${transcript}\n</transcript>` : '<transcript>No audio provided. Create story from visual evidence alone.</transcript>'}
${userContext ? `\n<user_notes>\n${userContext}\n</user_notes>` : ''}
</user_context>

<layout_palette>
Choose wisely for each image based on composition and narrative needs:

1. **full_bleed** - Epic opener, sweeping landscapes, grand vistas
   Use: First image, dramatic moments, hero shots

2. **immersive_focus** - Emotional climax, full bleed with centered text
   Use: Peak moments, intimate portraits, decisive instances

3. **magazine_spread** - Editorial storytelling, split screen with space
   Use: Show AND tell moments, architectural details, contrasts

4. **minimal_caption** - Pure visual (90% image, 10% text)
   Use: When image speaks volumes, atmospheric shots, textures

5. **portrait_feature** - Human connection, vertical emphasis
   Use: People, vertical compositions, intimate moments
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
      "layout": "full_bleed" | "immersive_focus" | "magazine_spread" | "minimal_caption" | "portrait_feature",
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
- First block: Use "full_bleed" to establish tone
- Last block: Reflective or climactic to leave lasting impression
- Layout variety: No more than 2 consecutive identical layouts
- Narrative arc: opening → journey → transformation → reflection
- Ground text in user's transcript when available—use their specific observations
</critical_rules>

<final_instruction>
Now analyze the ${imageCount} images. Create a story that honors the user's authentic experience while elevating it to cinematic art.
</final_instruction>`;

    const contentParts = [
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
      { text: '\nGenerate the JSON script now. Output ONLY valid JSON, no markdown code blocks.' },
    ];

    console.log(`[AI Director] Processing ${imageCount} images with transcript...`);

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

      // Prefer user-provided location when set; otherwise use AI response
      const locationStr = userLocation?.trim() || parsed.location;
      // Build the final DirectorScript with actual image data and enhanced metadata
      const directorScript: DirectorScript = {
        title: parsed.title,
        location: locationStr,
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
