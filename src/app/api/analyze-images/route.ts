import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

interface ImageAnalysisRequest {
  images: string[]; // Base64 encoded images
}

export interface ImageAnalysis {
  index: number;
  description: string;
  visualFeatures: {
    mood: string; // calm, energetic, melancholic, joyful, etc.
    composition: string; // landscape, portrait, close-up, wide-angle, etc.
    colorPalette: string; // warm, cool, vibrant, muted, etc.
    subject: string; // nature, people, architecture, food, etc.
    timeOfDay: string; // morning, noon, afternoon, evening, night, golden-hour, etc.
  };
}

/**
 * POST: Analyze multiple images and extract visual features and descriptions
 * 
 * This endpoint pre-processes images to extract semantic information,
 * allowing the final script generation to be faster and more text-focused.
 */
export async function POST(request: Request) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
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
    const model = process.env.NEXT_PUBLIC_GEMINI_MODEL_IMAGE_ANALYZE || 'gemini-3-pro-preview';
    
    console.log(`[Image Analyzer] Processing ${images.length} images...`);
    
    const analyses: ImageAnalysis[] = [];
    
    // Process each image sequentially to get detailed analysis
    for (let i = 0; i < images.length; i++) {
      const cleanData = images[i]
        .replace(/^data:image\/\w+;base64,/, '')
        .replace(/\s+/g, '');
      
      const analysisPrompt = `Analyze this travel photo with the precision of a National Geographic photographer and a Kinfolk magazine art director.

Provide your analysis in this exact JSON format (no markdown, just JSON):
{
  "description": "A rich, cinematic description (2-3 sentences, in Chinese, capturing the essence and story potential of this image)",
  "mood": "one word: calm/energetic/melancholic/joyful/contemplative/dramatic/serene/vibrant",
  "composition": "one word: landscape/portrait/close-up/wide-angle/symmetrical/rule-of-thirds/leading-lines/frame-in-frame",
  "colorPalette": "one word: warm/cool/vibrant/muted/monochrome/golden/pastel/contrasting",
  "subject": "one word: nature/people/architecture/food/street/water/sky/urban/wildlife/culture",
  "timeOfDay": "one word: morning/noon/afternoon/evening/night/golden-hour/blue-hour/twilight"
}

Focus on visual storytelling potential. What emotion does this image evoke? What story does it want to tell?`;

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
          visualFeatures: {
            mood: parsed.mood,
            composition: parsed.composition,
            colorPalette: parsed.colorPalette,
            subject: parsed.subject,
            timeOfDay: parsed.timeOfDay,
          },
        });
        
        console.log(`[Image Analyzer] Image ${i + 1} analyzed successfully`);
      } catch (error: any) {
        console.error(`[Image Analyzer] Failed to analyze image ${i + 1}:`, error);
        // Provide fallback analysis
        analyses.push({
          index: i,
          description: '一张值得记录的旅行瞬间',
          visualFeatures: {
            mood: 'calm',
            composition: 'landscape',
            colorPalette: 'warm',
            subject: 'nature',
            timeOfDay: 'afternoon',
          },
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
