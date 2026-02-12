import { AspectRatio, ImageSize } from "@/types/cinematic";

/** Call server-side Gemini proxy; API key never exposed to client. */
async function geminiClient<T>(action: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/gemini-client", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "gemini-client request failed");
  return data as T;
}

// Helper to decode base64 audio (client-side only)
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

/**
 * Generate a high-quality image using Gemini (via server proxy).
 */
export const generateImage = async (
  prompt: string,
  aspectRatio: AspectRatio = AspectRatio.RATIO_16_9,
  imageSize: ImageSize = ImageSize.SIZE_1K
): Promise<string> => {
  try {
    const { imageBase64 } = await geminiClient<{ imageBase64: string }>("generateImage", {
      prompt,
      aspectRatio,
      imageSize,
    });
    return imageBase64;
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};

/**
 * Edit an existing image using Gemini (via server proxy).
 */
export const editImage = async (
  base64Image: string,
  prompt: string
): Promise<string> => {
  try {
    const { imageBase64 } = await geminiClient<{ imageBase64: string }>("editImage", {
      base64Image,
      prompt,
    });
    return imageBase64;
  } catch (error) {
    console.error("Image editing failed:", error);
    throw error;
  }
};

/**
 * Analyze an image to generate a description (via server proxy).
 */
export const analyzeImage = async (base64Image: string): Promise<string> => {
  try {
    const { text } = await geminiClient<{ text: string }>("analyzeImage", {
      base64Image,
    });
    return text;
  } catch (error) {
    console.error("Image analysis failed:", error);
    throw error;
  }
};

/**
 * Generate speech from text using Gemini TTS (via server proxy).
 */
export const generateSpeech = async (
  text: string,
  voiceName: string = "Kore"
): Promise<AudioBuffer> => {
  try {
    const { audioBase64 } = await geminiClient<{ audioBase64: string }>("generateSpeech", {
      text,
      voiceName,
    });
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ sampleRate: 24000 });
    return await decodeAudioData(audioBase64, audioContext);
  } catch (error) {
    console.error("TTS generation failed:", error);
    throw error;
  }
};
