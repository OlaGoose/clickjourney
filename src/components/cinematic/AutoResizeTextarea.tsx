'use client';

import { useRef, useEffect } from 'react';

interface AutoResizeTextareaProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}

export const AutoResizeTextarea = ({ 
  value, 
  onChange, 
  className, 
  placeholder 
}: AutoResizeTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-transparent outline-none resize-none overflow-hidden placeholder-white/30 ${className}`}
      placeholder={placeholder}
      rows={1}
    />
  );
};
