import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

interface ImageAnalysisRequest {
  images: string[]; // Base64 encoded images
}

export interface ImageAnalysis {
  index: number;
  description: string;
  storyPotential: string; // What story this image could tell
  emotionalTone: string; // Deep emotional resonance
  visualFeatures: {
    mood: string; // calm, energetic, melancholic, joyful, nostalgic, adventurous, peaceful, dramatic
    composition: string; // landscape, portrait, close-up, wide-angle, symmetrical, rule-of-thirds, leading-lines, frame-in-frame
    colorPalette: string; // warm, cool, vibrant, muted, monochrome, golden, pastel, contrasting, earthy, oceanic
    colorDominance: string; // The dominant colors in the image
    subject: string; // nature, people, architecture, food, street, water, sky, urban, wildlife, culture, abstract
    timeOfDay: string; // morning, noon, afternoon, evening, night, golden-hour, blue-hour, twilight, dawn, dusk
    lighting: string; // natural, dramatic, soft, harsh, backlit, golden, silhouette, diffused
    depth: string; // shallow, deep, layered, flat, atmospheric
    movement: string; // static, dynamic, flowing, energetic, calm, frozen
    texture: string; // smooth, rough, organic, geometric, weathered, pristine
    perspective: string; // eye-level, bird-eye, worm-eye, tilted, straight
    focus: string; // sharp, soft, selective, bokeh, dreamy
  };
  layoutSuggestion: string; // Suggested layout based on analysis
  textPlacement: string; // Where text should go: center, bottom, side, overlay, minimal
}

/**
 * POST: Analyze multiple images and extract visual features and descriptions
 * 
 * This endpoint pre-processes images to extract semantic information,
 * allowing the final script generation to be faster and more text-focused.
 */
export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI service not configured (missing GEMINI_API_KEY)' },
      { status: 503 }
    );
  }

  let body: ImageAnalysisRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { images } = body;

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
    // Force use Gemini 3 Pro for superior analysis
    const model = 'gemini-3-pro-preview';
    
    console.log(`[Image Analyzer] Processing ${images.length} images with Gemini 3 Pro...`);
    
    const analyses: ImageAnalysis[] = [];
    
    // Process each image sequentially to get detailed analysis
    for (let i = 0; i < images.length; i++) {
      const cleanData = images[i]
        .replace(/^data:image\/\w+;base64,/, '')
        .replace(/\s+/g, '');
      
      const analysisPrompt = `You are the world's greatest visual storyteller—combining the eye of Sebastião Salgado, the narrative craft of a New York Times photo editor, and the aesthetic precision of an Airbnb Experience curator.

MISSION: Analyze this travel photograph with extreme depth to unlock its full cinematic potential.

Provide your analysis in this exact JSON format (no markdown, just pure JSON):
{
  "description": "A deeply evocative description (2-3 sentences, in Chinese) that captures not just what's in the frame, but the FEELING, the MOMENT, the STORY waiting to be told. Make it poetic yet specific.",
  "storyPotential": "What narrative arc does this image suggest? (1 sentence, Chinese) e.g., '一个关于告别与重逢的故事' or '寻找内心平静的旅程'",
  "emotionalTone": "The deepest emotional resonance (1-2 words, Chinese) e.g., '怀旧而温暖' '孤独中的自由' '宁静的力量'",
  "mood": "Primary mood (one word): calm/energetic/melancholic/joyful/nostalgic/adventurous/peaceful/dramatic/contemplative/serene/vibrant/mysterious/playful",
  "composition": "Compositional structure (one word): landscape/portrait/close-up/wide-angle/symmetrical/rule-of-thirds/leading-lines/frame-in-frame/diagonal/centered/off-center",
  "colorPalette": "Color mood (one word): warm/cool/vibrant/muted/monochrome/golden/pastel/contrasting/earthy/oceanic/sunset/ethereal",
  "colorDominance": "Dominant color family (2-3 words): e.g., 'deep blues and oranges' 'soft pastels' 'earthy browns and greens'",
  "subject": "Primary subject (one word): nature/people/architecture/food/street/water/sky/urban/wildlife/culture/abstract/landscape/portrait/object",
  "timeOfDay": "Time indicator (one word): morning/noon/afternoon/evening/night/golden-hour/blue-hour/twilight/dawn/dusk/midday",
  "lighting": "Lighting quality (one word): natural/dramatic/soft/harsh/backlit/golden/silhouette/diffused/moody/bright/shadowy",
  "depth": "Depth perception (one word): shallow/deep/layered/flat/atmospheric/infinite",
  "movement": "Sense of motion (one word): static/dynamic/flowing/energetic/calm/frozen/suspended/rushing",
  "texture": "Tactile quality (one word): smooth/rough/organic/geometric/weathered/pristine/delicate/rugged",
  "perspective": "Viewpoint (one word): eye-level/bird-eye/worm-eye/tilted/straight/dramatic/intimate",
  "focus": "Focus style (one word): sharp/soft/selective/bokeh/dreamy/crisp/hazy",
  "layoutSuggestion": "Best layout for this image (one word): full_bleed/side_by_side/immersive_focus/hero_split/magazine_spread/portrait_feature",
  "textPlacement": "Optimal text position (one word): center/bottom/top/side/overlay/minimal/corner/floating"
}

ANALYSIS GUIDELINES:
- Look beyond the obvious: What's the SUBTEXT?
- Consider the viewer's emotional journey: What do they FEEL first?
- Think about narrative: Where does this fit in a story arc?
- Assess compositional power: What makes this image UNFORGETTABLE?
- Identify unique visual signatures: What makes this image DIFFERENT?

Analyze now with maximum depth and insight.`;

      try {
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: cleanData,
                },
              },
              { text: analysisPrompt },
            ],
          },
          config: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        });

        const rawText = response.text || '';
        console.log(`[Image Analyzer] Image ${i + 1} raw response:`, rawText.substring(0, 100) + '...');
        
        // Parse JSON response
        const jsonMatch = rawText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : rawText;
        const parsed = JSON.parse(jsonText.trim());
        
        analyses.push({
          index: i,
          description: parsed.description,
          storyPotential: parsed.storyPotential,
          emotionalTone: parsed.emotionalTone,
          visualFeatures: {
            mood: parsed.mood,
            composition: parsed.composition,
            colorPalette: parsed.colorPalette,
            colorDominance: parsed.colorDominance,
            subject: parsed.subject,
            timeOfDay: parsed.timeOfDay,
            lighting: parsed.lighting,
            depth: parsed.depth,
            movement: parsed.movement,
            texture: parsed.texture,
            perspective: parsed.perspective,
            focus: parsed.focus,
          },
          layoutSuggestion: parsed.layoutSuggestion,
          textPlacement: parsed.textPlacement,
        });
        
        console.log(`[Image Analyzer] Image ${i + 1} analyzed successfully`);
      } catch (error: any) {
        console.error(`[Image Analyzer] Failed to analyze image ${i + 1}:`, error);
        // Provide fallback analysis
        analyses.push({
          index: i,
          description: '一张值得记录的旅行瞬间，捕捉了时光中的永恒',
          storyPotential: '一段未完的旅程',
          emotionalTone: '平静而深远',
          visualFeatures: {
            mood: 'calm',
            composition: 'landscape',
            colorPalette: 'warm',
            colorDominance: 'soft naturals',
            subject: 'nature',
            timeOfDay: 'afternoon',
            lighting: 'natural',
            depth: 'deep',
            movement: 'calm',
            texture: 'organic',
            perspective: 'eye-level',
            focus: 'sharp',
          },
          layoutSuggestion: 'full_bleed',
          textPlacement: 'bottom',
        });
      }
    }

    console.log(`[Image Analyzer] Completed analysis of ${analyses.length} images`);
    return NextResponse.json({ analyses });

  } catch (error) {
    console.error('[Image Analyzer] Generation failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze images',
        details: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
      },
      { status: 500 }
    );
  }
}
