import { GoogleGenAI, Modality } from "@google/genai";
import { AspectRatio, ImageSize } from "@/types/cinematic";

// Helper to decode base64 audio
const decodeAudioData = async (
  base64Data: string,
  ctx: AudioContext
): Promise<AudioBuffer> => {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Create buffer from raw PCM (assuming 24000Hz mono from API default)
  const dataInt16 = new Int16Array(bytes.buffer);
  const numChannels = 1;
  const sampleRate = 24000;
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  
  return buffer;
};

// Initialize Gemini
const getAI = () => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GEMINI_API_KEY not configured");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generate a high-quality image using Gemini 3 Pro Image Preview
 */
export const generateImage = async (
  prompt: string,
  aspectRatio: AspectRatio = AspectRatio.RATIO_16_9,
  imageSize: ImageSize = ImageSize.SIZE_1K
): Promise<string> => {
  const ai = getAI();
  
  const model = process.env.NEXT_PUBLIC_GEMINI_MODEL_IMAGE || 'gemini-3-pro-image-preview';
  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: imageSize,
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned");
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};

/**
 * Edit an existing image using Gemini 2.5 Flash Image
 */
export const editImage = async (
  base64Image: string,
  prompt: string
): Promise<string> => {
  const ai = getAI();
  // Strip prefix if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

  const model = process.env.NEXT_PUBLIC_GEMINI_MODEL_IMAGE_EDIT || 'gemini-2.5-flash-image';
  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png',
            },
          },
          { text: prompt },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No edited image returned");
  } catch (error) {
    console.error("Image editing failed:", error);
    throw error;
  }
};

/**
 * Analyze an image to generate a description using Gemini 3 Pro
 */
export const analyzeImage = async (base64Image: string): Promise<string> => {
  const ai = getAI();
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

  const model = process.env.NEXT_PUBLIC_GEMINI_MODEL_IMAGE_ANALYZE || 'gemini-3-pro-preview';
  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png',
            },
          },
          { text: "Analyze this image and write a poetic, cinematic caption for a travel story (max 2 sentences)." },
        ],
      },
    });
    
    return response.text || "Could not analyze image.";
  } catch (error) {
    console.error("Image analysis failed:", error);
    throw error;
  }
};

/**
 * Generate speech from text using Gemini 2.5 Flash TTS
 */
export const generateSpeech = async (
  text: string,
  voiceName: string = 'Kore'
): Promise<AudioBuffer> => {
  const ai = getAI();
  
  const model = process.env.NEXT_PUBLIC_GEMINI_MODEL_TTS || 'gemini-2.5-flash-preview-tts';
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return await decodeAudioData(base64Audio, audioContext);

  } catch (error) {
    console.error("TTS generation failed:", error);
    throw error;
  }
};
