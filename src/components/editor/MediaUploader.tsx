'use client';

import { useRef, useState } from 'react';
import { fileToUrlOrDataUrl } from '@/lib/upload-media';

interface MediaUploaderProps {
  type: 'image' | 'audio' | 'video';
  files: string[];
  onChange: (files: string[]) => void;
  maxFiles?: number;
  /** When set, uploads go to Supabase Storage under this user folder. */
  userId?: string | null;
}

export default function MediaUploader({ type, files, onChange, maxFiles = 10, userId }: MediaUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const acceptTypes = {
    image: 'image/*',
    audio: 'audio/*',
    video: 'video/*',
  };

  const icons = {
    image: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
    audio: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>
    ),
    video: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
    ),
  };

  const labels = {
    image: 'Photos',
    audio: 'Audio',
    video: 'Videos',
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setIsUploading(true);

    try {
      const newFiles: string[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        if (file) {
          const url = await fileToUrlOrDataUrl(file, { userId });
          newFiles.push(url);
        }
      }
      onChange([...files, ...newFiles]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onChange(newFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-400">
        {labels[type]} {files.length > 0 && `(${files.length})`}
      </label>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-white/20 hover:border-white/40 bg-black/20'
        }`}
      >
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <div className="text-gray-400 mb-2">{icons[type]}</div>
          <p className="text-sm text-gray-400 text-center">
            {isUploading ? 'Uploading...' : `Drop ${labels[type].toLowerCase()} here or click to select`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Up to {maxFiles} files
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes[type]}
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {files.map((file, index) => (
            <div key={index} className="relative group rounded-xl overflow-hidden bg-black/40 border border-white/10">
              {type === 'image' ? (
                <img src={file} alt={`Upload ${index + 1}`} className="w-full h-32 object-cover" />
              ) : type === 'audio' ? (
                <div className="w-full h-32 flex flex-col items-center justify-center p-4">
                  <audio src={file} controls className="w-full" />
                </div>
              ) : (
                <video src={file} className="w-full h-32 object-cover" controls />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(index);
                }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
