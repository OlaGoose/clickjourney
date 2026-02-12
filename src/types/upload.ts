/** Single image in the upload gallery (local blob URL or remote). */
export interface UploadedImage {
  id: string;
  url: string;
}

/** Props for the Airbnb-style gallery display component. */
export interface GalleryProps {
  images: UploadedImage[];
  onDelete: (id: string) => void;
  onReplace: (id: string) => void;
}

/** Result of deep image analysis (e.g. from /api/analyze-images). */
export interface ImageAnalysis {
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
