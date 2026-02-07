'use client';

import { useRef } from 'react';
import { Upload } from 'lucide-react';

interface ImageUploaderProps {
  children?: React.ReactNode;
  onUpload: (base64: string) => void;
}

export const ImageUploader = ({ children, onUpload }: ImageUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative group w-full h-full">
      {children}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      <button 
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
        className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30"
        title="Upload Image"
      >
        <Upload size={16} />
      </button>
    </div>
  );
};
