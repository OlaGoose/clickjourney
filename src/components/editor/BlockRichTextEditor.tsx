'use client';

import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';

const PRESET_COLORS = [
  '#1d1d1f',
  '#6e6e73',
  '#ff3b30',
  '#ff9500',
  '#ffcc00',
  '#34c759',
  '#007aff',
  '#af52de',
] as const;

interface BlockRichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

/** Lightweight rich text editor for block panel: text formatting + color only (no image/video/audio). */
export default function BlockRichTextEditor({ content, onChange, placeholder }: BlockRichTextEditorProps) {
  const [, setToolbarTick] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: placeholder || '输入内容…',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-[#007aff] underline' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
    ],
    content: content || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'prose prose-neutral max-w-none focus:outline-none min-h-[120px] px-2 py-3 text-[15px] leading-relaxed [&_.ProseMirror]:min-h-[100px] [&_.ProseMirror]:!text-[#1d1d1f] [&_.ProseMirror_p]:!text-[#1d1d1f] [&_.ProseMirror_li]:!text-[#1d1d1f] [&_.ProseMirror_h1]:!text-[#1d1d1f] [&_.ProseMirror_h2]:!text-[#1d1d1f] [&_.ProseMirror_h3]:!text-[#1d1d1f] [&_.ProseMirror_blockquote]:!text-[#1d1d1f] [&_.ProseMirror_div]:!text-[#1d1d1f]',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content || '<p></p>');
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => setToolbarTick((t) => t + 1);
    editor.on('selectionUpdate', onUpdate);
    editor.on('transaction', onUpdate);
    return () => {
      editor.off('selectionUpdate', onUpdate);
      editor.off('transaction', onUpdate);
    };
  }, [editor]);

  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#6e6e73] transition-colors ${
      active ? 'bg-[#e8e8ed] text-[#1d1d1f]' : 'hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
    }`;

  return (
    <div className="flex-1 flex flex-col min-h-0 block-richtext-editor">
      <style dangerouslySetInnerHTML={{ __html: `
        .block-richtext-editor .ProseMirror,
        .block-richtext-editor .ProseMirror p,
        .block-richtext-editor .ProseMirror li,
        .block-richtext-editor .ProseMirror h1,
        .block-richtext-editor .ProseMirror h2,
        .block-richtext-editor .ProseMirror h3,
        .block-richtext-editor .ProseMirror blockquote,
        .block-richtext-editor .ProseMirror div { color: #1d1d1f !important; }
      `}} />
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-black/[0.06] bg-[#fafafa] rounded-t-2xl">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnClass(editor.isActive('bold'))}
          title="粗体"
          aria-label="粗体"
        >
          <strong className="text-sm">B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnClass(editor.isActive('italic'))}
          title="斜体"
          aria-label="斜体"
        >
          <em className="text-sm">I</em>
        </button>
        <span className="w-px h-5 bg-black/10 mx-0.5" aria-hidden />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={btnClass(editor.isActive('heading', { level: 1 }))}
          title="标题 1"
        >
          <span className="text-xs font-bold">H1</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btnClass(editor.isActive('heading', { level: 2 }))}
          title="标题 2"
        >
          <span className="text-xs font-bold">H2</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={btnClass(editor.isActive('heading', { level: 3 }))}
          title="标题 3"
        >
          <span className="text-xs font-bold">H3</span>
        </button>
        <span className="w-px h-5 bg-black/10 mx-0.5" aria-hidden />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnClass(editor.isActive('bulletList'))}
          title="无序列表"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnClass(editor.isActive('orderedList'))}
          title="有序列表"
        >
          <span className="text-xs font-medium">1.</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={btnClass(editor.isActive('blockquote'))}
          title="引用"
        >
          &quot;
        </button>
        <span className="w-px h-5 bg-black/10 mx-0.5" aria-hidden />
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={btnClass(editor.isActive({ textAlign: 'left' }))}
          title="左对齐"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="15" y2="12" />
            <line x1="3" y1="18" x2="18" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={btnClass(editor.isActive({ textAlign: 'center' }))}
          title="居中"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="6" y1="12" x2="18" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={btnClass(editor.isActive({ textAlign: 'right' }))}
          title="右对齐"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="9" y1="12" x2="21" y2="12" />
            <line x1="6" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="w-px h-5 bg-black/10 mx-0.5" aria-hidden />
        <div className="flex items-center gap-0.5" role="group" aria-label="文字颜色">
          {PRESET_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => editor.chain().focus().setColor(hex).run()}
              className="h-6 w-6 rounded-md border border-black/10 shrink-0 hover:ring-2 hover:ring-black/10 transition-shadow"
              style={{ backgroundColor: hex }}
              title={hex}
              aria-label={`颜色 ${hex}`}
            />
          ))}
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetColor().run()}
            className={btnClass(false)}
            title="清除颜色"
          >
            <span className="text-[10px] font-medium text-[#86868b]">清除</span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto rounded-b-2xl border border-t-0 border-black/[0.06] bg-white text-[#1d1d1f]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
