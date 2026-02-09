'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Upload, Trash2, Image as ImageIcon, Video as VideoIcon, Music as MusicIcon, LayoutGrid, Images, Mic, Square, Type, FileText, LayoutTemplate, ChevronLeft, Sparkles } from 'lucide-react';
import PhotoGrid from '@/components/PhotoGrid';
import { GalleryDisplayView } from '@/components/upload/GalleryDisplay';
import BlockRichTextEditor from '@/components/editor/BlockRichTextEditor';
import type { ContentBlock, ContentBlockType, ImageDisplayMode, SectionBlockData, SectionTemplateId } from '@/types/editor';
import type { AIGeneratedDocBlock } from '@/types/ai-document-blocks';
import type { LayoutType } from '@/types/cinematic';
import { CINEMATIC_TEMPLATES, ALL_CINEMATIC_LAYOUTS } from '@/lib/editor-cinematic-templates';
import { SECTION_TEMPLATES, getDefaultSectionData } from '@/lib/editor-section-templates';
import { CinematicTemplatePreview } from '@/components/editor/CinematicTemplatePreview';

const MAX_IMAGES = 6;

/** Returns true if the block has meaningful content (no empty blocks). */
function blockHasContent(b: ContentBlock): boolean {
  switch (b.type) {
    case 'text':
      return (b.content ?? '').trim().length > 0;
    case 'richtext':
      return (b.content ?? '').replace(/<[^>]+>/g, '').trim().length > 0;
    case 'image':
      const imgs = b.metadata?.images?.length ? b.metadata.images : b.content ? [b.content] : [];
      return imgs.length > 0;
    case 'cinematic':
      return !!(b.metadata?.cinematicImage || (b.content ?? '').trim());
    case 'section':
      return !!(b.metadata?.sectionTemplateId && b.metadata?.sectionData);
    case 'video':
    case 'audio':
      return (b.content ?? '').length > 0;
    default:
      return false;
  }
}

interface EditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  block: ContentBlock | null;
  onSave: (block: ContentBlock) => void;
  onDelete: () => void;
  /** Called when panel is closed with no content, so parent can remove the block. */
  onDiscard?: () => void;
  /** When set and block is null, panel shows type picker; when user selects type, this is called. */
  onSelectType?: (type: ContentBlockType) => void;
  /** When user selects a cinematic layout template, this is called with the layout. */
  onSelectCinematicTemplate?: (layout: LayoutType) => void;
  /** When user inserts AI-generated content as richtext, this is called with HTML. */
  onInsertGeneratedContent?: (html: string) => void;
  /** When user inserts AI-generated document blocks (richtext/text/image), this is called. imageUrls 与生成时上传顺序一致，用于解析 imageIndex。 */
  onInsertGeneratedBlocks?: (blocks: AIGeneratedDocBlock[], imageUrls: string[]) => void;
  /** When user selects an Apple-style section template, this is called with the template id. */
  onSelectSectionTemplate?: (templateId: SectionTemplateId) => void;
}

const BLOCK_TYPES: { type: ContentBlockType; icon: typeof Type; label: string }[] = [
  { type: 'text', icon: Type, label: '文本' },
  { type: 'richtext', icon: FileText, label: '富文本' },
  { type: 'image', icon: ImageIcon, label: '图片' },
  { type: 'video', icon: VideoIcon, label: '视频' },
  { type: 'audio', icon: MusicIcon, label: '音频' },
];

/** Apple light mode only: white panel, gray controls, #1d1d1f text. Apple Arcade–inspired layout. */
export function EditPanel({ isOpen, onClose, block, onSave, onDelete, onDiscard, onSelectType, onSelectCinematicTemplate, onSelectSectionTemplate, onInsertGeneratedContent, onInsertGeneratedBlocks }: EditPanelProps) {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageDisplayMode, setImageDisplayMode] = useState<ImageDisplayMode>('grid');
  const [isRecording, setIsRecording] = useState(false);
  const [templatePanelOpen, setTemplatePanelOpen] = useState(false);
  const [templateTab, setTemplateTab] = useState<'template' | 'ai'>('template');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImages, setAiImages] = useState<string[]>([]);
  const [aiGeneratedBlocks, setAiGeneratedBlocks] = useState<AIGeneratedDocBlock[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiImageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setTemplatePanelOpen(false);
      setTemplateTab('template');
      setAiPrompt('');
      setAiImages([]);
      setAiGeneratedBlocks([]);
      setAiError(null);
    }
  }, [isOpen]);

  const [cinematicImage, setCinematicImage] = useState('');
  const [cinematicLayout, setCinematicLayout] = useState<LayoutType>('full_bleed');
  const [sectionTemplateId, setSectionTemplateId] = useState<SectionTemplateId>('hero_cta');
  const [sectionData, setSectionData] = useState<SectionBlockData>({});

  useEffect(() => {
    if (block) {
      setContent(block.content);
      setFileName(block.metadata?.fileName || '');
      setIsRecording(false);
      if (block.type === 'image') {
        const list = block.metadata?.images?.length
          ? block.metadata.images
          : block.content
            ? [block.content]
            : [];
        setImages(list);
        setImageDisplayMode(block.metadata?.imageDisplayMode ?? 'grid');
      }
      if (block.type === 'cinematic') {
        setCinematicImage(block.metadata?.cinematicImage ?? '');
        setCinematicLayout(block.metadata?.cinematicLayout ?? 'full_bleed');
      }
      if (block.type === 'section') {
        const tid = block.metadata?.sectionTemplateId ?? 'hero_cta';
        setSectionTemplateId(tid);
        setSectionData(block.metadata?.sectionData ?? getDefaultSectionData(tid));
      }
    }
  }, [block]);

  useEffect(() => {
    if (isOpen && block?.type === 'text' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, block?.type]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      // Safari/iOS only supports audio/mp4; Chrome/Firefox support webm. Try mp4 first for mobile.
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      const ext = mimeType.startsWith('audio/mp4') ? 'mp4' : 'webm';
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setContent(url);
        setFileName(`录制_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 14)}.${ext}`);
      };
      recorder.start(200);
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access failed:', err);
      alert('无法访问麦克风，请检查权限后重试。');
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const showTypePicker = isOpen && !block && onSelectType;

  const handleAiImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const urls: string[] = [];
    for (let i = 0; i < files.length && urls.length < MAX_IMAGES; i++) {
      const file = files[i];
      if (file?.type.startsWith('image/')) urls.push(URL.createObjectURL(file));
    }
    setAiImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
    e.target.value = '';
  }, []);

  const handleGenerateSection = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiGeneratedBlocks([]);
    try {
      const body: { prompt: string; images?: string[] } = {
        prompt: aiPrompt.trim(),
      };
      if (aiImages.length > 0) {
        const dataUrls = await Promise.all(
          aiImages.map((url) =>
            fetch(url)
              .then((r) => r.blob())
              .then(
                (blob) =>
                  new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                  })
              )
          )
        );
        body.images = dataUrls;
      }
      const res = await fetch('/api/generate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');
      if (!Array.isArray(data.blocks)) throw new Error('未返回内容块');
      setAiGeneratedBlocks(data.blocks);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : '生成失败，请重试');
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiImages]);

  const handleInsertAsBlocks = useCallback(() => {
    if (aiGeneratedBlocks.length === 0 || !onInsertGeneratedBlocks) return;
    onInsertGeneratedBlocks(aiGeneratedBlocks, aiImages);
    setAiGeneratedBlocks([]);
    onClose();
  }, [aiGeneratedBlocks, aiImages, onInsertGeneratedBlocks, onClose]);

  /** Template panel: 模版 (待开发) + AI (prompt → preview → 插入) — Apple TV style */
  if (showTypePicker && templatePanelOpen) {
    return (
      <>
        <div
          className={`fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-300 bg-black/20 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          onClick={onClose}
          aria-hidden
        />
        <div
          className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col rounded-t-[28px] bg-[#fbfbfd] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] ${
            isOpen ? 'translate-y-0 animate-sheetSlideUp' : 'translate-y-full transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]'
          }`}
        >
          <div className="flex items-center justify-center pt-3 pb-1">
            <div className="h-0.5 w-9 rounded-full bg-black/[0.12]" />
          </div>
          <div className="grid grid-cols-3 items-center px-5 pb-2">
            <button
              type="button"
              onClick={() => setTemplatePanelOpen(false)}
              className="justify-self-start rounded-full p-2.5 text-[#1d1d1f] hover:bg-black/[0.04] active:scale-95 transition-all duration-200"
              aria-label="返回"
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>
            <h3 className="text-center text-[17px] font-semibold text-[#1d1d1f] tracking-tight">模板</h3>
            <button
              type="button"
              onClick={onClose}
              className="justify-self-end rounded-full p-2.5 text-[#1d1d1f] hover:bg-black/[0.04] active:scale-95 transition-all duration-200"
              aria-label="关闭"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
          <div className="flex gap-1 mx-4 p-1 rounded-2xl bg-black/[0.04]">
            <button
              type="button"
              onClick={() => setTemplateTab('template')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[14px] font-semibold transition-all duration-200 ${
                templateTab === 'template'
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f]'
              }`}
            >
              <LayoutTemplate size={16} strokeWidth={2} />
              模板
            </button>
            <button
              type="button"
              onClick={() => setTemplateTab('ai')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[14px] font-semibold transition-all duration-200 ${
                templateTab === 'ai'
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f]'
              }`}
            >
              <Sparkles size={16} strokeWidth={2} />
              AI
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {templateTab === 'template' && (
              <div className="space-y-5">
                <div>
                  <p className="text-[13px] text-[#6e6e73] mb-3">杂志风区块（选布局即插入）</p>
                  {CINEMATIC_TEMPLATES.map((t) => (
                    <button
                      key={t.layout}
                      type="button"
                      onClick={() => {
                        onSelectCinematicTemplate?.(t.layout);
                        setTemplatePanelOpen(false);
                        onClose();
                      }}
                      className="w-full flex items-center gap-4 rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-left text-[15px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors active:scale-[0.99] mb-2"
                    >
                      <div className="flex-shrink-0 w-20 h-[52px] rounded-xl overflow-hidden bg-[#f5f5f7]">
                        <CinematicTemplatePreview layout={t.layout} className="h-full w-full" />
                      </div>
                      <span className="flex-1">{t.label}</span>
                      <LayoutTemplate size={18} strokeWidth={2} className="text-[#86868b] flex-shrink-0" />
                    </button>
                  ))}
                </div>
                {onSelectSectionTemplate && (
                  <div>
                    <p className="text-[13px] text-[#6e6e73] mb-3">宣传区块（Apple 风格）</p>
                    <div className="grid grid-cols-1 gap-2">
                      {SECTION_TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            onSelectSectionTemplate(t.id);
                            setTemplatePanelOpen(false);
                            onClose();
                          }}
                          className="w-full flex items-center justify-between rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-left text-[15px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors active:scale-[0.99]"
                        >
                          <span>{t.label}</span>
                          <LayoutTemplate size={18} strokeWidth={2} className="text-[#86868b] flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {templateTab === 'ai' && (
              <div className="space-y-4">
                <div>
                  <input
                    ref={aiImageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAiImageSelect}
                    className="hidden"
                  />
                  {aiImages.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {aiImages.map((url, idx) => (
                        <div key={url} className="relative">
                          <img src={url} alt="" className="h-14 w-14 rounded-xl object-cover ring-1 ring-black/[0.06]" />
                          <button
                            type="button"
                            onClick={() => setAiImages((p) => p.filter((_, i) => i !== idx))}
                            className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center hover:bg-[#424245] transition-colors"
                            aria-label="移除"
                          >
                            <X size={10} strokeWidth={2.5} />
                          </button>
                        </div>
                      ))}
                      {aiImages.length < MAX_IMAGES && (
                        <button
                          type="button"
                          onClick={() => aiImageInputRef.current?.click()}
                          className="h-14 w-14 rounded-xl border border-dashed border-black/[0.12] flex items-center justify-center text-[#86868b] hover:bg-black/[0.03] transition-colors"
                        >
                          <Upload size={18} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => aiImageInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-black/[0.1] py-3 text-[13px] text-[#6e6e73] hover:bg-black/[0.02] transition-colors"
                    >
                      <ImageIcon size={16} strokeWidth={2} />
                      图片（最多 {MAX_IMAGES} 张）
                    </button>
                  )}
                </div>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => { setAiPrompt(e.target.value); setAiError(null); }}
                  placeholder="描述场景或心情…"
                  className="w-full min-h-[80px] rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-1 focus:ring-black/[0.08] focus:border-transparent transition-shadow"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={handleGenerateSection}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="w-full rounded-full py-3 text-[15px] font-semibold bg-[#1d1d1f] text-white hover:bg-[#424245] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] transition-all"
                >
                  {aiLoading ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block align-middle" />
                  ) : (
                    <>
                      <Sparkles size={16} strokeWidth={2} className="inline-block align-middle mr-1.5" />
                      生成
                    </>
                  )}
                </button>
                {aiError && <p className="text-[12px] text-[#ff3b30]">{aiError}</p>}
                {aiGeneratedBlocks.length > 0 && (
                  <button
                    type="button"
                    onClick={handleInsertAsBlocks}
                    className="w-full rounded-full py-3 text-[15px] font-semibold bg-[#1d1d1f] text-white hover:bg-[#424245] active:scale-[0.98] flex items-center justify-center gap-2 transition-all"
                  >
                    插入（{aiGeneratedBlocks.length}）
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  /** Type picker view — Apple TV style: pill handle, soft cards, rounded CTAs */
  if (showTypePicker) {
    return (
      <>
        <div
          className={`fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-300 bg-black/20 ${
            isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={onClose}
          aria-hidden
        />
        <div
          className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col rounded-t-[28px] bg-[#fbfbfd] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] ${
            isOpen
              ? 'translate-y-0 animate-sheetSlideUp'
              : 'translate-y-full transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]'
          }`}
        >
          <div className="flex items-center justify-center pt-3 pb-1">
            <div className="h-0.5 w-9 rounded-full bg-black/[0.12]" />
          </div>
          <div className="grid grid-cols-3 items-center px-5 pb-2">
            <div />
            <h3 className="text-center text-[17px] font-semibold text-[#1d1d1f] tracking-tight">
              添加内容
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="justify-self-end rounded-full p-2.5 text-[#1d1d1f] hover:bg-black/[0.04] transition-all duration-200 active:scale-95"
              aria-label="关闭"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-8 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTemplatePanelOpen(true)}
                className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-6 text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:bg-[#fafafa] transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f5f7]">
                  <LayoutTemplate size={26} strokeWidth={2} className="text-[#6e6e73]" />
                </div>
                <span className="text-[15px] font-semibold">模板</span>
              </button>
              {BLOCK_TYPES.map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onSelectType!(type)}
                  className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-6 text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:bg-[#fafafa] transition-all duration-200 active:scale-[0.98]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f5f7]">
                    <Icon size={26} strokeWidth={2} className="text-[#6e6e73]" />
                  </div>
                  <span className="text-[15px] font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!block) return null;

  /** Current state as a block (for empty check when closing without save). */
  const getCurrentBlock = (): ContentBlock => {
    if (block.type === 'image') {
      return {
        ...block,
        content: images[0] ?? '',
        metadata: {
          ...block.metadata,
          images: images.length ? images : undefined,
          imageDisplayMode,
        },
      };
    }
    if (block.type === 'cinematic') {
      return {
        ...block,
        content,
        metadata: {
          ...block.metadata,
          cinematicLayout: cinematicLayout,
          cinematicImage: cinematicImage || block.metadata?.cinematicImage,
        },
      };
    }
    if (block.type === 'section') {
      return {
        ...block,
        metadata: {
          ...block.metadata,
          sectionTemplateId,
          sectionData,
        },
      };
    }
    return {
      ...block,
      content,
      metadata: { ...block.metadata, fileName: fileName || undefined },
    };
  };

  const handleSave = () => {
    const updated = getCurrentBlock();
    if (!blockHasContent(updated)) {
      onDiscard?.();
      onClose();
      return;
    }
    onSave(updated);
    onClose();
  };

  const handleClose = () => {
    if (!blockHasContent(getCurrentBlock())) {
      onDiscard?.();
    }
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const list = Array.from(files).map((file) => URL.createObjectURL(file));
    if (block.type === 'image') {
      setImages((prev) => [...prev, ...list].slice(0, MAX_IMAGES));
    } else {
      const file = files[0];
      if (file) {
        setContent(URL.createObjectURL(file));
        setFileName(file.name);
      }
    }
    e.target.value = '';
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const renderEditor = () => {
    switch (block.type) {
      case 'text':
        return (
          <div className="flex-1 px-2">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder=""
              className="h-full w-full resize-none bg-transparent px-4 py-3.5 text-[15px] leading-relaxed rounded-xl focus:outline-none text-[#1d1d1f] placeholder:text-[#86868b] focus:bg-black/[0.02] transition-colors"
              rows={8}
            />
          </div>
        );

      case 'richtext':
        return (
          <div className="flex-1 px-2 min-h-[200px]">
            <BlockRichTextEditor
              content={content}
              onChange={setContent}
              placeholder="内容"
            />
          </div>
        );

      case 'image':
        return (
          <div className="flex-1 px-4 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <div className="flex rounded-full p-0.5 bg-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setImageDisplayMode('grid')}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200 active:scale-95 ${
                    imageDisplayMode === 'grid'
                      ? 'bg-white text-[#1d1d1f] shadow-sm'
                      : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                  }`}
                  aria-pressed={imageDisplayMode === 'grid'}
                >
                  <LayoutGrid size={14} strokeWidth={2} />
                  网格
                </button>
                <button
                  type="button"
                  onClick={() => setImageDisplayMode('gallery')}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200 active:scale-95 ${
                    imageDisplayMode === 'gallery'
                      ? 'bg-white text-[#1d1d1f] shadow-sm'
                      : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                  }`}
                  aria-pressed={imageDisplayMode === 'gallery'}
                >
                  <Images size={14} strokeWidth={2} />
                  相册
                </button>
              </div>
            </div>
            {images.length > 0 ? (
              <div className="space-y-3">
                {imageDisplayMode === 'gallery' ? (
                  <GalleryDisplayView
                    images={images}
                    ariaLabel="编辑区块照片"
                    className="max-h-[320px]"
                  />
                ) : (
                  <PhotoGrid
                    images={images}
                    totalCount={images.length}
                    ariaLabel="编辑区块照片"
                    className="max-h-[320px]"
                  />
                )}
                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[13px] font-semibold bg-black/[0.06] text-[#1d1d1f] hover:bg-black/[0.09] transition-colors"
                  >
                    <Upload size={14} strokeWidth={2} />
                    添加（{images.length}/{MAX_IMAGES}）
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUploadClick}
                className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/[0.1] hover:bg-black/[0.02] transition-colors active:scale-[0.99]"
              >
                <ImageIcon size={28} className="text-[#86868b]" strokeWidth={1.5} />
                <span className="text-[13px] text-[#6e6e73]">添加图片</span>
              </button>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="flex-1 px-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {content ? (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-2xl bg-[#f5f5f7]">
                  <video src={content} controls className="h-auto w-full">
                    Your browser does not support the video tag.
                  </video>
                </div>
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-semibold bg-black/[0.06] text-[#1d1d1f] hover:bg-black/[0.09] transition-all duration-200 active:scale-[0.98]"
                >
                  <Upload size={16} strokeWidth={2} />
                  替换视频
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUploadClick}
                className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/[0.1] hover:bg-black/[0.02] transition-colors active:scale-[0.99]"
              >
                <VideoIcon size={28} className="text-[#86868b]" strokeWidth={1.5} />
                <span className="text-[13px] text-[#6e6e73]">添加视频</span>
              </button>
            )}
          </div>
        );

      case 'cinematic':
        return (
          <div className="flex-1 px-4 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setCinematicImage(URL.createObjectURL(file));
                e.target.value = '';
              }}
              className="hidden"
            />
            <div>
              <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">布局</label>
              <select
                value={cinematicLayout}
                onChange={(e) => setCinematicLayout(e.target.value as LayoutType)}
                className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-black/[0.08]"
              >
                {ALL_CINEMATIC_LAYOUTS.map((t) => (
                  <option key={t.layout} value={t.layout}>{t.label}</option>
                ))}
              </select>
            </div>
            {cinematicImage ? (
              <div className="space-y-2">
                <img src={cinematicImage} alt="" className="w-full rounded-2xl object-cover max-h-48" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-full py-2.5 text-[13px] font-semibold bg-black/[0.06] text-[#1d1d1f] hover:bg-black/[0.09]"
                >
                  更换图片
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/[0.1] hover:bg-black/[0.02]"
              >
                <ImageIcon size={24} className="text-[#86868b]" />
                <span className="text-[13px] text-[#6e6e73]">添加图片</span>
              </button>
            )}
            <div>
              <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">图注 / 文案</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="描述这个瞬间..."
                rows={3}
                className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-1 focus:ring-black/[0.08] resize-none"
              />
            </div>
          </div>
        );

      case 'section':
        return (
          <div className="flex-1 px-4 space-y-4">
            <p className="text-[13px] text-[#6e6e73]">
              {SECTION_TEMPLATES.find((t) => t.id === sectionTemplateId)?.label ?? sectionTemplateId}
            </p>
            {sectionTemplateId === 'hero_cta' && sectionData.hero_cta && (
              <>
                <div>
                  <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">主标题</label>
                  <input
                    type="text"
                    value={sectionData.hero_cta.headline}
                    onChange={(e) =>
                      setSectionData((prev) => ({
                        ...prev,
                        hero_cta: prev.hero_cta
                          ? { ...prev.hero_cta, headline: e.target.value }
                          : { headline: e.target.value, primaryCta: { label: '' }, subline: '' },
                      }))
                    }
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-black/[0.08]"
                    placeholder="主标题"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">副标题</label>
                  <input
                    type="text"
                    value={sectionData.hero_cta.subline}
                    onChange={(e) =>
                      setSectionData((prev) => ({
                        ...prev,
                        hero_cta: prev.hero_cta
                          ? { ...prev.hero_cta, subline: e.target.value }
                          : { headline: '', primaryCta: { label: '' }, subline: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-black/[0.08]"
                    placeholder="副标题"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">主按钮文案</label>
                  <input
                    type="text"
                    value={sectionData.hero_cta.primaryCta?.label ?? ''}
                    onChange={(e) =>
                      setSectionData((prev) => ({
                        ...prev,
                        hero_cta: prev.hero_cta
                          ? { ...prev.hero_cta, primaryCta: { ...prev.hero_cta.primaryCta, label: e.target.value } }
                          : { headline: '', primaryCta: { label: e.target.value }, subline: '' },
                      }))
                    }
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-black/[0.08]"
                    placeholder="主按钮"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">次按钮文案（可选）</label>
                  <input
                    type="text"
                    value={sectionData.hero_cta.secondaryCta?.label ?? ''}
                    onChange={(e) =>
                      setSectionData((prev) => ({
                        ...prev,
                        hero_cta: prev.hero_cta
                          ? { ...prev.hero_cta, secondaryCta: { label: e.target.value } }
                          : { headline: '', primaryCta: { label: '' }, subline: '', secondaryCta: { label: e.target.value } },
                      }))
                    }
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-black/[0.08]"
                    placeholder="次按钮"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">背景图 URL（可选）</label>
                  <input
                    type="text"
                    value={sectionData.hero_cta.backgroundImage ?? ''}
                    onChange={(e) =>
                      setSectionData((prev) => ({
                        ...prev,
                        hero_cta: prev.hero_cta
                          ? { ...prev.hero_cta, backgroundImage: e.target.value || undefined }
                          : { headline: '', primaryCta: { label: '' }, subline: '', backgroundImage: e.target.value || undefined },
                      }))
                    }
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-black/[0.08]"
                    placeholder="https://..."
                  />
                </div>
              </>
            )}
            {sectionTemplateId === 'ribbon' && sectionData.ribbon && (
              <>
                <div>
                  <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">横幅文案</label>
                  <input
                    type="text"
                    value={sectionData.ribbon.message}
                    onChange={(e) =>
                      setSectionData((prev) => ({
                        ...prev,
                        ribbon: prev.ribbon ? { ...prev.ribbon, message: e.target.value } : { message: e.target.value, ctaLabel: '' },
                      }))
                    }
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-black/[0.08]"
                    placeholder="横幅文案"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">按钮文案</label>
                  <input
                    type="text"
                    value={sectionData.ribbon.ctaLabel ?? ''}
                    onChange={(e) =>
                      setSectionData((prev) => ({
                        ...prev,
                        ribbon: prev.ribbon ? { ...prev.ribbon, ctaLabel: e.target.value } : { message: '', ctaLabel: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-black/[0.08]"
                    placeholder="按钮"
                  />
                </div>
              </>
            )}
            {sectionTemplateId === 'value_props' && sectionData.value_props && (
              <div>
                <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">要点列表（每行一条）</label>
                <textarea
                  value={sectionData.value_props.items.join('\n')}
                  onChange={(e) =>
                    setSectionData((prev) => ({
                      ...prev,
                      value_props: { items: e.target.value.split('\n').filter(Boolean) },
                    }))
                  }
                  rows={5}
                  className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-[15px] text-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-black/[0.08] resize-none"
                  placeholder="要点一&#10;要点二"
                />
              </div>
            )}
            {!['hero_cta', 'ribbon', 'value_props'].includes(sectionTemplateId) && (
              <p className="text-[13px] text-[#86868b]">该模板内容已在画布中展示，后续可在此扩展编辑。</p>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="flex-1 px-4 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {content ? (
              <>
                <div className="rounded-2xl bg-black/[0.04] ring-1 ring-black/[0.06] overflow-hidden" role="region" aria-label="音频播放">
                  <audio
                    src={content}
                    controls
                    className="w-full h-10 [&::-webkit-media-controls-panel]:bg-transparent"
                  >
                    Your browser does not support the audio tag.
                  </audio>
                </div>
                {fileName && (
                  <p className="text-[11px] truncate text-[#86868b] px-0.5" title={fileName}>
                    {fileName}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-semibold bg-black/[0.06] text-[#1d1d1f] hover:bg-black/[0.09] transition-colors active:scale-[0.98]"
                  >
                    <Upload size={14} strokeWidth={2} aria-hidden />
                    替换
                  </button>
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-semibold bg-black/[0.06] text-[#1d1d1f] hover:bg-black/[0.09] transition-colors active:scale-[0.98]"
                  >
                    <Mic size={14} strokeWidth={2} aria-hidden />
                    重录
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="flex-1 flex items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-semibold bg-black/[0.06] text-[#1d1d1f] hover:bg-black/[0.09] transition-all duration-200 active:scale-[0.98]"
                >
                  <Upload size={18} strokeWidth={2} />
                  上传音频
                </button>
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={false}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-70 ${
                    isRecording
                      ? 'bg-[#ff3b30]/12 text-[#ff3b30] hover:bg-[#ff3b30]/18'
                      : 'bg-black/[0.06] text-[#1d1d1f] hover:bg-black/[0.09]'
                  }`}
                >
                  {isRecording ? (
                    <Square size={18} fill="currentColor" className="text-[#ff3b30]" />
                  ) : (
                    <Mic size={18} strokeWidth={2} />
                  )}
                  {isRecording ? '停止' : '录制'}
                </button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop — Apple TV: softer blur, lighter overlay */}
      <div
        className={`fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-300 bg-black/20 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={handleClose}
        aria-hidden
      />

      {/* Panel — Apple TV: pill handle, soft shadow, pill CTA */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[82vh] flex-col rounded-t-[28px] bg-[#fbfbfd] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] ${
          isOpen
            ? 'translate-y-0 animate-sheetSlideUp'
            : 'translate-y-full transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]'
        }`}
      >
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="h-0.5 w-9 rounded-full bg-black/[0.12]" />
        </div>
        <div className="grid grid-cols-3 items-center px-5 pb-3">
          <button
            type="button"
            onClick={onDelete}
            className="justify-self-start flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-all duration-200 active:scale-95"
          >
            <Trash2 size={14} strokeWidth={2} />
            删除
          </button>
          <h3 className="justify-self-center text-[17px] font-semibold text-[#1d1d1f] tracking-tight">
            {block.type === 'text' && '文本'}
            {block.type === 'richtext' && '富文本'}
            {block.type === 'image' && '图片'}
            {block.type === 'video' && '视频'}
            {block.type === 'audio' && '音频'}
            {block.type === 'cinematic' && (ALL_CINEMATIC_LAYOUTS.find((t) => t.layout === block.metadata?.cinematicLayout)?.label ?? '杂志风区块')}
            {block.type === 'section' && (SECTION_TEMPLATES.find((t) => t.id === sectionTemplateId)?.label ?? '宣传区块')}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="justify-self-end rounded-full p-2.5 text-[#1d1d1f] hover:bg-black/[0.04] transition-all duration-200 active:scale-95"
            aria-label="关闭"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {renderEditor()}
        </div>
        <div className="p-5 pt-2 bg-[#fbfbfd]">
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-full py-3 text-[15px] font-semibold bg-[#1d1d1f] text-white hover:bg-[#424245] transition-colors active:scale-[0.98]"
          >
            完成
          </button>
        </div>
      </div>
    </>
  );
}
