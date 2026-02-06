'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Audio } from '@/lib/tiptap/audio-extension';
import { Video } from '@/lib/tiptap/video-extension';
import { useEffect, useRef, useState } from 'react';

interface UltimateEditorProps {
  content: string;
  onChange: (content: string) => void;
  onMediaChange?: (images: string[], audios: string[], videos: string[]) => void;
  placeholder?: string;
}

export default function UltimateEditor({ content, onChange, onMediaChange, placeholder }: UltimateEditorProps) {
  const [images, setImages] = useState<string[]>([]);
  const [audios, setAudios] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Share your journey story...',
      }),
      Image.configure({
        inline: false,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Audio,
      Video,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-400 hover:text-blue-300 underline',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-full overflow-y-auto overflow-x-hidden px-4 md:px-6 py-6',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    if (onMediaChange) {
      onMediaChange(images, audios, videos);
    }
  }, [images, audios, videos, onMediaChange]);

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || !editor) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;
          editor.chain().focus().setImage({ src }).run();
          setImages((prev) => [...prev, src]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleAudioUpload = async (files: FileList | null) => {
    if (!files || !editor) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;
          editor.chain().focus().setAudio({ src }).run();
          setAudios((prev) => [...prev, src]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleVideoUpload = async (files: FileList | null) => {
    if (!files || !editor) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;
          editor.chain().focus().setVideo({ src }).run();
          setVideos((prev) => [...prev, src]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl md:rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm">
      {/* H5 Toolbar: single row, horizontal scroll */}
      <div className="flex items-center border-b border-white/10 bg-black/30 no-scrollbar editor-toolbar-scroll shrink-0">
        <div className="flex items-center gap-0.5 p-2 flex-nowrap shrink-0">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2.5 rounded-lg shrink-0 transition-all ${
              editor.isActive('bold') ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Bold"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
              <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2.5 rounded-lg shrink-0 transition-all ${
              editor.isActive('italic') ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Italic"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="4" x2="10" y2="4"/>
              <line x1="14" y1="20" x2="5" y2="20"/>
              <line x1="15" y1="4" x2="9" y2="20"/>
            </svg>
          </button>
          <span className="w-px h-5 bg-white/10 mx-0.5 shrink-0" aria-hidden />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-2.5 rounded-lg shrink-0 text-xs font-bold transition-all ${
              editor.isActive('heading', { level: 1 }) ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2.5 rounded-lg shrink-0 text-xs font-bold transition-all ${
              editor.isActive('heading', { level: 2 }) ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-2.5 rounded-lg shrink-0 text-xs font-bold transition-all ${
              editor.isActive('heading', { level: 3 }) ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Heading 3"
          >
            H3
          </button>
          <span className="w-px h-5 bg-white/10 mx-0.5 shrink-0" aria-hidden />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="p-2.5 rounded-lg shrink-0 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            title="Add Image"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="p-2.5 rounded-lg shrink-0 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            title="Add Audio"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="p-2.5 rounded-lg shrink-0 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            title="Add Video"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </button>
          <span className="w-px h-5 bg-white/10 mx-0.5 shrink-0" aria-hidden />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2.5 rounded-lg shrink-0 transition-all ${
              editor.isActive('bulletList') ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Bullet List"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2.5 rounded-lg shrink-0 transition-all ${
              editor.isActive('orderedList') ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Numbered List"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="10" y1="6" x2="21" y2="6"/>
              <line x1="10" y1="12" x2="21" y2="12"/>
              <line x1="10" y1="18" x2="21" y2="18"/>
              <path d="M4 6h1v4"/>
              <path d="M4 10h2"/>
              <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2.5 rounded-lg shrink-0 transition-all ${
              editor.isActive('blockquote') ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Quote"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
            </svg>
          </button>
          <span className="w-px h-5 bg-white/10 mx-0.5 shrink-0" aria-hidden />
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-2.5 rounded-lg shrink-0 transition-all ${
              editor.isActive({ textAlign: 'left' }) ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Align Left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="17" y1="10" x2="3" y2="10"/>
              <line x1="21" y1="6" x2="3" y2="6"/>
              <line x1="21" y1="14" x2="3" y2="14"/>
              <line x1="17" y1="18" x2="3" y2="18"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-2.5 rounded-lg shrink-0 transition-all ${
              editor.isActive({ textAlign: 'center' }) ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Align Center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="10" x2="6" y2="10"/>
              <line x1="21" y1="6" x2="3" y2="6"/>
              <line x1="21" y1="14" x2="3" y2="14"/>
              <line x1="18" y1="18" x2="6" y2="18"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-2.5 rounded-lg shrink-0 transition-all ${
              editor.isActive({ textAlign: 'right' }) ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Align Right"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="21" y1="10" x2="7" y2="10"/>
              <line x1="21" y1="6" x2="3" y2="6"/>
              <line x1="21" y1="14" x2="3" y2="14"/>
              <line x1="21" y1="18" x2="7" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleImageUpload(e.target.files)}
        className="hidden"
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={(e) => handleAudioUpload(e.target.files)}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={(e) => handleVideoUpload(e.target.files)}
        className="hidden"
      />

      {/* Editor Content — ProseMirror fills to bottom, scrolls inside */}
      <div className="editor-scroll-area min-h-0 flex-1 overflow-hidden flex flex-col [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex [&>div]:flex-col [&_.ProseMirror]:min-h-full">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
