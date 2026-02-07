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
