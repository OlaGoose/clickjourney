'use client';

interface ImageUploaderProps {
  children?: React.ReactNode;
  onUpload: (base64: string) => void;
}

export const ImageUploader = ({ children }: ImageUploaderProps) => {
  return <div className="relative w-full h-full">{children}</div>;
};
