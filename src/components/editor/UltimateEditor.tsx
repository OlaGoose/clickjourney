'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Audio } from '@/lib/tiptap/audio-extension';
import { Video } from '@/lib/tiptap/video-extension';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface UltimateEditorProps {
  content: string;
  onChange: (content: string) => void;
  onMediaChange?: (images: string[], audios: string[], videos: string[]) => void;
  placeholder?: string;
  /** When true, toolbar is fixed at top with reference style and editor has no border */
  toolbarFixed?: boolean;
  /** Rendered between fixed toolbar and editor (e.g. title input) */
  topSlot?: ReactNode;
}

export default function UltimateEditor({ content, onChange, onMediaChange, placeholder, toolbarFixed, topSlot }: UltimateEditorProps) {
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
        class: 'prose prose-invert max-w-none focus:outline-none min-h-full overflow-y-auto overflow-x-hidden px-4 md:px-3 py-1',
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

  const btnClass = (active: boolean) =>
    `editor-toolbar-btn flex-shrink-0 inline-flex items-center justify-center text-white/70 ${active ? 'is-active' : ''}`;

  const toolbar = (
    <>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btnClass(editor.isActive('bold'))}
        title="Bold"
        aria-label="Bold"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnClass(editor.isActive('italic'))}
        title="Italic"
        aria-label="Italic"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" x2="10" y1="4" y2="4" />
          <line x1="14" x2="5" y1="20" y2="20" />
          <line x1="15" x2="9" y1="4" y2="20" />
        </svg>
      </button>
      <div className="editor-toolbar-divider" aria-hidden />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btnClass(editor.isActive('heading', { level: 1 }))}
        title="Heading 1"
        aria-label="Heading 1"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 12h12" />
          <path d="M6 20V4" />
          <path d="M18 20V4" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btnClass(editor.isActive('heading', { level: 2 }))}
        title="Heading 2"
        aria-label="Heading 2"
      >
        <span className="text-[0.975rem] font-bold">H2</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btnClass(editor.isActive('heading', { level: 3 }))}
        title="Heading 3"
        aria-label="Heading 3"
      >
        <span className="text-[0.975rem] font-bold">H3</span>
      </button>
      <div className="editor-toolbar-divider" aria-hidden />
      <button
        type="button"
        onClick={() => imageInputRef.current?.click()}
        className={btnClass(false)}
        title="Add Image"
        aria-label="Add Image"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="17" height="17" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => audioInputRef.current?.click()}
        className={btnClass(false)}
        title="Add Audio"
        aria-label="Add Audio"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => videoInputRef.current?.click()}
        className={btnClass(false)}
        title="Add Video"
        aria-label="Add Video"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </button>
      <div className="editor-toolbar-divider" aria-hidden />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btnClass(editor.isActive('bulletList'))}
        title="Bullet List"
        aria-label="Bullet List"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btnClass(editor.isActive('orderedList'))}
        title="Numbered List"
        aria-label="Numbered List"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="10" y1="6" x2="21" y2="6" />
          <line x1="10" y1="12" x2="21" y2="12" />
          <line x1="10" y1="18" x2="21" y2="18" />
          <path d="M4 6h1v4" />
          <path d="M4 10h2" />
          <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btnClass(editor.isActive('blockquote'))}
        title="Quote"
        aria-label="Quote"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
          <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
        </svg>
      </button>
      <div className="editor-toolbar-divider" aria-hidden />
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={btnClass(editor.isActive({ textAlign: 'left' }))}
        title="Align Left"
        aria-label="Align Left"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="17" y1="10" x2="3" y2="10" />
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="14" x2="3" y2="14" />
          <line x1="17" y1="18" x2="3" y2="18" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={btnClass(editor.isActive({ textAlign: 'center' }))}
        title="Align Center"
        aria-label="Align Center"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="10" x2="6" y2="10" />
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="14" x2="3" y2="14" />
          <line x1="18" y1="18" x2="6" y2="18" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={btnClass(editor.isActive({ textAlign: 'right' }))}
        title="Align Right"
        aria-label="Align Right"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="21" y1="10" x2="7" y2="10" />
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="14" x2="3" y2="14" />
          <line x1="21" y1="18" x2="7" y2="18" />
        </svg>
      </button>
    </>
  );

  const toolbarWrapperClass =
    'flex items-center gap-0.5 px-1.5 py-1 overflow-x-auto no-scrollbar';

  if (toolbarFixed) {
    return (
      <>
        {/* Fixed header: optional topSlot (e.g. title) then toolbar; or toolbar only */}
        <div className={`fixed top-14 left-0 right-0 z-20 flex flex-col px-3 bg-gradient-to-b from-black/80 via-black/60 to-transparent ${topSlot ? 'pb-2' : 'pb-1'}`}>
          {topSlot}
          <div className={topSlot ? 'flex justify-center mt-2' : 'flex justify-center'}>
            <div className={`max-w-md w-full ${toolbarWrapperClass}`}>
              {toolbar}
            </div>
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

        {/* Content: padding clears fixed header (toolbar only or title + toolbar) */}
        <div className={`flex h-full min-h-0 w-full flex-col overflow-hidden ${topSlot ? 'pt-12' : 'pt-8'}`}>
          <div className="editor-scroll-area min-h-0 flex-1 overflow-hidden flex flex-col [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex [&>div]:flex-col [&_.ProseMirror]:min-h-full">
            <EditorContent editor={editor} />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl md:rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm">
      <div className={`flex items-center no-scrollbar editor-toolbar-scroll shrink-0 ${toolbarWrapperClass}`}>
        {toolbar}
      </div>
      <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={(e) => handleImageUpload(e.target.files)} className="hidden" />
      <input ref={audioInputRef} type="file" accept="audio/*" multiple onChange={(e) => handleAudioUpload(e.target.files)} className="hidden" />
      <input ref={videoInputRef} type="file" accept="video/*" multiple onChange={(e) => handleVideoUpload(e.target.files)} className="hidden" />
      <div className="editor-scroll-area min-h-0 flex-1 overflow-hidden flex flex-col [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex [&>div]:flex-col [&_.ProseMirror]:min-h-full">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
