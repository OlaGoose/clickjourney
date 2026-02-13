'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, Check } from 'lucide-react';
import { useDayNightTheme } from '@/hooks/useDayNightTheme';

export interface VlogFileUploadProps {
  label: string;
  accept: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  selectedCount: number;
  disabled?: boolean;
}

/**
 * File upload area styled like /memories/upload: glass card, rounded-xl, day/night aware.
 */
export function VlogFileUpload({
  label,
  accept,
  multiple = false,
  onFilesSelected,
  selectedCount,
  disabled = false,
}: VlogFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = useDayNightTheme() === 'dark';

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || !e.dataTransfer.files?.length) return;
      const files = Array.from(e.dataTransfer.files);
      const valid = files.filter((f) => {
        if (accept.includes('image')) return f.type.startsWith('image/');
        if (accept.includes('audio')) return f.type.startsWith('audio/');
        return true;
      });
      if (valid.length > 0) onFilesSelected(multiple ? valid : [valid[0]!]);
    },
    [accept, disabled, multiple, onFilesSelected]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      const list = Array.from(files);
      onFilesSelected(multiple ? list : [list[0]!]);
      e.target.value = '';
    },
    [multiple, onFilesSelected]
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative rounded-2xl border-2 border-dashed transition-all duration-300
        flex flex-col items-center justify-center text-center min-h-[140px] p-6
        ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
        ${
          isDark
            ? 'bg-white/10 border-white/20 hover:border-white/30 hover:bg-white/15'
            : 'bg-white/40 border-black/10 hover:border-black/20 hover:bg-white/60'
        }
        ${isDragging ? (isDark ? 'border-white/50 bg-white/20' : 'border-blue-500/50 bg-blue-500/10') : ''}
        ${selectedCount > 0 ? (isDark ? 'border-green-500/40 bg-green-500/10' : 'border-green-500/30 bg-green-500/5') : ''}
      `}
      aria-label={label}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
        aria-hidden
      />
      <div
        className={`mb-2 transition-colors ${
          selectedCount > 0
            ? 'text-green-500'
            : isDark
              ? 'text-white/50'
              : 'text-gray-500'
        }`}
      >
        {selectedCount > 0 ? (
          <Check size={28} strokeWidth={2.5} />
        ) : (
          <Upload size={28} strokeWidth={2.5} />
        )}
      </div>
      <h3
        className={`text-sm font-semibold mb-0.5 ${
          isDark ? 'text-white/90' : 'text-gray-800'
        }`}
      >
        {label}
      </h3>
      <p
        className={`text-xs ${
          isDark ? 'text-white/50' : 'text-gray-500'
        }`}
      >
        {selectedCount > 0
          ? `${selectedCount} file${selectedCount > 1 ? 's' : ''} ready`
          : isDragging
            ? 'Drop here'
            : multiple
              ? 'Drag & drop or click'
              : 'Click or drag to upload'}
      </p>
    </div>
  );
}
