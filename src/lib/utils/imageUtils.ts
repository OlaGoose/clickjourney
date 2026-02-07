/**
 * Image utility functions for the Cinematic Memory feature
 */

/**
 * Convert a blob URL or File to Base64 string
 */
export const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return blobToBase64(blob);
  } catch (error) {
    console.error('Failed to convert URL to base64:', error);
    throw new Error('Image conversion failed');
  }
};

/**
 * Convert a Blob to Base64 string (without data URI prefix)
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data URI prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1] || base64String;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Compress and convert image to optimized Base64
 * Reduces file size while maintaining quality
 */
export const compressImageToBase64 = async (
  imageUrl: string,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = maxWidth;
          height = width / aspectRatio;
        } else {
          height = maxHeight;
          width = height * aspectRatio;
        }
      }
      
      // Create canvas and compress
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG for better compression
      const base64 = canvas.toDataURL('image/jpeg', quality);
      const base64Data = base64.split(',')[1];
      
      resolve(base64Data);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
};

/**
 * Batch compress multiple images
 * Shows progress for better UX
 */
export const compressMultipleImages = async (
  imageUrls: string[],
  onProgress?: (current: number, total: number) => void
): Promise<string[]> => {
  const results: string[] = [];
  
  for (let i = 0; i < imageUrls.length; i++) {
    onProgress?.(i + 1, imageUrls.length);
    const base64 = await compressImageToBase64(imageUrls[i]);
    results.push(base64);
  }
  
  return results;
};

/**
 * Estimate the size of a base64 string in KB
 */
export const estimateBase64Size = (base64: string): number => {
  // Base64 encoding increases size by ~33%
  const sizeInBytes = (base64.length * 3) / 4;
  return Math.round(sizeInBytes / 1024);
};
