'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Upload, Trash2, Image as ImageIcon, Video as VideoIcon, Music as MusicIcon, LayoutGrid, Images, Mic, Square, Type, FileText, LayoutTemplate, ChevronLeft, ChevronDown, Sparkles, AlignLeft, AlignCenter, AlignRight, Minus } from 'lucide-react';
import { useOptionalAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { fileToUrlOrDataUrl } from '@/lib/upload-media';
import PhotoGrid from '@/components/PhotoGrid';
import { GalleryDisplayView } from '@/components/upload/GalleryDisplay';
import BlockRichTextEditor from '@/components/editor/BlockRichTextEditor';
import type { ContentBlock, ContentBlockType, DividerStyle, ImageDisplayMode, SectionBlockData, SectionTemplateId, TitleStyle } from '@/types/editor';
import type { AIGeneratedDocBlock } from '@/types/ai-document-blocks';
import type { LayoutType } from '@/types/cinematic';
import { CINEMATIC_TEMPLATES, ALL_CINEMATIC_LAYOUTS } from '@/lib/editor-cinematic-templates';
import { SECTION_TEMPLATES, getDefaultSectionData } from '@/lib/editor-section-templates';
import { CinematicTemplatePreview } from '@/components/editor/CinematicTemplatePreview';
import { DividerBlock } from '@/components/editor/DividerBlock';
import { ImageUploadSkeleton } from '@/components/editor/ImageUploadSkeleton';

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
    case 'divider':
      return true;
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
  /** When true, closing without changes will discard the block (no new content added). */
  isNewlyAddedBlock?: boolean;
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
  /** When 'title' or 'description', panel shows title/description editor instead of block or type picker. */
  editingTarget?: 'title' | 'description' | null;
  titleData?: { title: string; titleStyle?: TitleStyle };
  descriptionData?: { description: string; descriptionStyle?: TitleStyle };
  onSaveTitle?: (data: { title: string; titleStyle?: TitleStyle }) => void;
  onSaveDescription?: (data: { description: string; descriptionStyle?: TitleStyle }) => void;
}

const BLOCK_TYPES: { type: ContentBlockType; icon: typeof Type; label: string }[] = [
  { type: 'text', icon: Type, label: '文本' },
  { type: 'richtext', icon: FileText, label: '富文本' },
  { type: 'image', icon: ImageIcon, label: '图片' },
  { type: 'divider', icon: Minus, label: '分割线' },
  { type: 'video', icon: VideoIcon, label: '视频' },
  { type: 'audio', icon: MusicIcon, label: '音频' },
];

/** Apple light mode only: white panel, gray controls, #1d1d1f text. Apple Arcade–inspired layout. */
/** Returns true if two blocks have the same meaningful content (for cinematic/section template blocks). */
function blockUnchangedFromInitial(initial: ContentBlock, current: ContentBlock): boolean {
  if (initial.type !== current.type) return false;
  if (initial.type === 'cinematic') {
    return (
      (initial.content ?? '') === (current.content ?? '') &&
      (initial.metadata?.cinematicLayout ?? 'full_bleed') === (current.metadata?.cinematicLayout ?? 'full_bleed') &&
      (initial.metadata?.cinematicImage ?? '') === (current.metadata?.cinematicImage ?? '') &&
      (initial.metadata?.showBorder ?? false) === (current.metadata?.showBorder ?? false)
    );
  }
  if (initial.type === 'section') {
    return (
      (initial.metadata?.sectionTemplateId ?? '') === (current.metadata?.sectionTemplateId ?? '') &&
      JSON.stringify(initial.metadata?.sectionData ?? {}) === JSON.stringify(current.metadata?.sectionData ?? {}) &&
      (initial.metadata?.showBorder ?? false) === (current.metadata?.showBorder ?? false)
    );
  }
  return false;
}

/** Build unified template list with i18n labels for section templates. */
function useUnifiedTemplates(): Array<
  | { kind: 'cinematic'; layout: LayoutType; label: string }
  | { kind: 'section'; id: SectionTemplateId; label: string }
> {
  const { t } = useLocale();
  return [
    ...CINEMATIC_TEMPLATES.map((tpl) => ({ kind: 'cinematic' as const, layout: tpl.layout, label: tpl.label })),
    ...SECTION_TEMPLATES.map((tpl) => ({
      kind: 'section' as const,
      id: tpl.id,
      label: tpl.id === 'marquee' ? t('editor.sectionMarquee') : tpl.id === 'friends' ? t('editor.sectionFriends') : tpl.id === 'agenda' ? t('editor.sectionAgenda') : tpl.label,
    })),
  ];
}

export function EditPanel({ isOpen, onClose, block, isNewlyAddedBlock, onSave, onDelete, onDiscard, onSelectType, onSelectCinematicTemplate, onSelectSectionTemplate, onInsertGeneratedContent, onInsertGeneratedBlocks, editingTarget, titleData, descriptionData, onSaveTitle, onSaveDescription }: EditPanelProps) {
  const auth = useOptionalAuth();
  const { t } = useLocale();
  const userId = auth?.user?.id ?? null;
  const unifiedTemplates = useUnifiedTemplates();

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
  const sectionImageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  /** 当前正在替换的 section 图片槽位，用于统一 file input 回调 */
  const [sectionImageTarget, setSectionImageTarget] = useState<{ key: string } | null>(null);
  const sectionImageTargetRef = useRef<{ key: string } | null>(null);
  const initialBlockRef = useRef<ContentBlock | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTemplatePanelOpen(false);
      setTemplateTab('template');
      setAiPrompt('');
      setAiImages([]);
      setAiGeneratedBlocks([]);
      setAiError(null);
      setCinematicLayoutDropdownOpen(false);
      setUploadingImageSlot(null);
    }
  }, [isOpen]);

  const [cinematicImage, setCinematicImage] = useState('');
  const [cinematicImageLoaded, setCinematicImageLoaded] = useState(false);
  const [cinematicLayout, setCinematicLayout] = useState<LayoutType>('full_bleed');
  /** Slot id while an image is uploading (e.g. 'cinematic', 'image', 'marquee.0', 'friends.0.avatar'). Used for local skeleton only. */
  const [uploadingImageSlot, setUploadingImageSlot] = useState<string | null>(null);
  const [sectionTemplateId, setSectionTemplateId] = useState<SectionTemplateId>('marquee');
  const [sectionData, setSectionData] = useState<SectionBlockData>({});
  const [showBorder, setShowBorder] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [textColor, setTextColor] = useState<string>('#1d1d1f');
  const [dividerStyle, setDividerStyle] = useState<DividerStyle>('default');
  const [cinematicLayoutDropdownOpen, setCinematicLayoutDropdownOpen] = useState(false);
  const cinematicLayoutDropdownRef = useRef<HTMLDivElement>(null);
  /** Title/description editor (when editingTarget is set) */
  const [fieldValue, setFieldValue] = useState('');
  const [fieldStyle, setFieldStyle] = useState<TitleStyle>({});

  useEffect(() => {
    if (editingTarget && isOpen) {
      if (editingTarget === 'title') {
        setFieldValue(titleData?.title ?? '');
        setFieldStyle(titleData?.titleStyle ?? {});
      } else {
        setFieldValue(descriptionData?.description ?? '');
        setFieldStyle(descriptionData?.descriptionStyle ?? {});
      }
    }
  }, [editingTarget, isOpen, titleData?.title, titleData?.titleStyle, descriptionData?.description, descriptionData?.descriptionStyle]);

  useEffect(() => {
    if (block) {
      setSectionImageTarget(null);
      setContent(block.content);
      setFileName(block.metadata?.fileName || '');
      setIsRecording(false);
      if (block.type === 'text' || block.type === 'richtext') {
        setTextAlign(block.metadata?.textAlign ?? 'left');
        setFontSize(block.metadata?.fontSize ?? 'medium');
        setTextColor(block.metadata?.textColor ?? '#1d1d1f');
      }
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
        setCinematicImageLoaded(false);
      }
      if (block.type === 'section') {
        const rawTid = (block.metadata?.sectionTemplateId ?? 'marquee') as string;
        const tid = (rawTid === 'creator_card' ? 'friends' : rawTid) as SectionTemplateId;
        setSectionTemplateId(tid);
        let sd = block.metadata?.sectionData;
        if (rawTid === 'creator_card' && sd && 'creatorCard' in sd) {
          const c = (sd as { creatorCard?: { avatar: string; name: string; description: string } }).creatorCard;
          sd = { friends: c ? [c] : [{ avatar: '', name: '', description: '' }] };
        }
        setSectionData(sd ?? getDefaultSectionData(tid));
      }
      if (block.type === 'divider') {
        setDividerStyle((block.metadata?.dividerStyle as DividerStyle) ?? 'default');
      }
      setShowBorder(!!block.metadata?.showBorder);
      initialBlockRef.current = block ? JSON.parse(JSON.stringify(block)) : null;
    }
  }, [block]);

  useEffect(() => {
    if (isOpen && block?.type === 'text' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, block?.type]);

  useEffect(() => {
    if (!cinematicLayoutDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cinematicLayoutDropdownRef.current && !cinematicLayoutDropdownRef.current.contains(e.target as Node)) {
        setCinematicLayoutDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [cinematicLayoutDropdownOpen]);

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
        const reader = new FileReader();
        reader.onload = () => {
          setContent(reader.result as string);
          setFileName(`录制_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 14)}.${ext}`);
        };
        reader.readAsDataURL(blob);
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

  const showTypePicker = isOpen && !block && !editingTarget && onSelectType;

  const handleAiImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      const urls: string[] = [];
      for (let i = 0; i < files.length && urls.length < MAX_IMAGES; i++) {
        const file = files[i];
        if (file?.type.startsWith('image/')) {
          const url = await fileToUrlOrDataUrl(file, { userId });
          urls.push(url);
        }
      }
      setAiImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
      e.target.value = '';
    },
    [userId]
  );

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

  const handleSectionImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const target = sectionImageTargetRef.current;
      setSectionImageTarget(null);
      sectionImageTargetRef.current = null;
      if (!target) {
        e.target.value = '';
        return;
      }
      const slotKey = target.key;
      setUploadingImageSlot(slotKey);
      try {
        const url = await fileToUrlOrDataUrl(file, { userId });
        setSectionData((prev) => {
          const next = { ...prev };
          const parts = slotKey.split('.');
          if (parts[0] === 'marquee' && next.marquee?.items) {
            const idx = parseInt(parts[1], 10);
            if (!Number.isNaN(idx) && next.marquee.items[idx]) {
              const items = [...next.marquee.items];
              items[idx] = { ...items[idx], image: url };
              next.marquee = { ...next.marquee, items };
            }
          }
          if (parts[0] === 'friends' && parts[1] !== undefined && parts[2] === 'avatar') {
            const idx = parseInt(parts[1], 10);
            if (!Number.isNaN(idx) && next.friends?.[idx] !== undefined) {
              const arr = [...next.friends];
              arr[idx] = { ...arr[idx], avatar: url };
              next.friends = arr;
            }
          }
          if (parts[0] === 'agenda' && parts[1] !== undefined && parts[2] === 'image') {
            const idx = parseInt(parts[1], 10);
            if (!Number.isNaN(idx) && next.agenda?.items?.[idx] !== undefined) {
              const items = [...next.agenda.items];
              items[idx] = { ...items[idx], image: url };
              next.agenda = { ...next.agenda, items };
            }
          }
          return next;
        });
      } finally {
        setUploadingImageSlot(null);
      }
      e.target.value = '';
    },
    [userId]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      const currentBlock = block;
      if (!currentBlock) return;
      if (currentBlock.type === 'image') {
        setUploadingImageSlot('image');
        try {
          const list: string[] = [];
          for (let i = 0; i < files.length && list.length < MAX_IMAGES; i++) {
            const file = files[i];
            if (file) {
              const url = await fileToUrlOrDataUrl(file, { userId });
              list.push(url);
            }
          }
          setImages((prev) => [...prev, ...list].slice(0, MAX_IMAGES));
        } finally {
          setUploadingImageSlot(null);
        }
      } else {
        const file = files[0];
        if (file) {
          setUploadingImageSlot('file');
          try {
            const url = await fileToUrlOrDataUrl(file, { userId });
            setContent(url);
            setFileName(file.name);
          } finally {
            setUploadingImageSlot(null);
          }
        }
      }
      e.target.value = '';
    },
    [block, userId]
  );

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
              <div className="space-y-2">
                <p className="text-[13px] text-[#6e6e73] mb-3">选择布局即插入</p>
                {unifiedTemplates.map((t) =>
                  t.kind === 'cinematic' ? (
                    <button
                      key={`c-${t.layout}`}
                      type="button"
                      onClick={() => {
                        onSelectCinematicTemplate?.(t.layout);
                        setTemplatePanelOpen(false);
                      }}
                      className="w-full flex items-center gap-4 rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-left text-[15px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors active:scale-[0.99]"
                    >
                      <div className="flex-shrink-0 w-20 h-[52px] rounded-xl overflow-hidden bg-[#f5f5f7]">
                        <CinematicTemplatePreview layout={t.layout} className="h-full w-full" />
                      </div>
                      <span className="flex-1">{t.label}</span>
                      <LayoutTemplate size={18} strokeWidth={2} className="text-[#86868b] flex-shrink-0" />
                    </button>
                  ) : onSelectSectionTemplate ? (
                    <button
                      key={`s-${t.id}`}
                      type="button"
                      onClick={() => {
                        onSelectSectionTemplate(t.id);
                        setTemplatePanelOpen(false);
                      }}
                      className="w-full flex items-center gap-4 rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-left text-[15px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors active:scale-[0.99]"
                    >
                      <div className="flex-shrink-0 w-20 h-[52px] rounded-xl bg-[#f5f5f7] flex items-center justify-center">
                        <LayoutTemplate size={24} strokeWidth={2} className="text-[#86868b]" />
                      </div>
                      <span className="flex-1">{t.label}</span>
                      <LayoutTemplate size={18} strokeWidth={2} className="text-[#86868b] flex-shrink-0" />
                    </button>
                  ) : null
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

  /** Title or description editor sheet (no block) */
  if (isOpen && (editingTarget === 'title' || editingTarget === 'description') && (editingTarget === 'title' ? onSaveTitle : onSaveDescription)) {
    const isTitle = editingTarget === 'title';
    const handleSaveField = () => {
      if (isTitle) {
        onSaveTitle!({ title: fieldValue, titleStyle: fieldStyle });
      } else {
        onSaveDescription!({ description: fieldValue, descriptionStyle: fieldStyle });
      }
      onClose();
    };
    const align = (fieldStyle.textAlign ?? 'left') as 'left' | 'center' | 'right';
    const size = (fieldStyle.fontSize ?? 'medium') as 'small' | 'medium' | 'large';
    const color = fieldStyle.textColor ?? '#1d1d1f';
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/20 transition-opacity duration-300" onClick={onClose} aria-hidden />
        <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col rounded-t-[28px] bg-[#fbfbfd] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] translate-y-0 animate-sheetSlideUp">
          <div className="flex items-center justify-center pt-3 pb-1">
            <div className="h-0.5 w-9 rounded-full bg-black/[0.12]" />
          </div>
          <div className="grid grid-cols-3 items-center px-5 pb-2">
            <div />
            <h3 className="text-center text-[17px] font-semibold text-[#1d1d1f] tracking-tight">
              {isTitle ? '编辑标题' : '编辑描述'}
            </h3>
            <button type="button" onClick={onClose} className="justify-self-end rounded-full p-2.5 text-[#1d1d1f] hover:bg-black/[0.04] transition-all duration-200 active:scale-95" aria-label="关闭">
              <X size={18} strokeWidth={2} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-8 pt-2 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] text-[#6e6e73] mr-1">样式</span>
              <div className="flex rounded-full p-0.5 bg-black/[0.06]">
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setFieldStyle((s) => ({ ...s, textAlign: a }))}
                    className={`rounded-full p-2 transition-all ${align === a ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73]'}`}
                    aria-label={a === 'left' ? '左对齐' : a === 'center' ? '居中' : '右对齐'}
                  >
                    {a === 'left' && <AlignLeft size={16} strokeWidth={2} />}
                    {a === 'center' && <AlignCenter size={16} strokeWidth={2} />}
                    {a === 'right' && <AlignRight size={16} strokeWidth={2} />}
                  </button>
                ))}
              </div>
              <div className="flex rounded-full p-0.5 bg-black/[0.06]">
                {(['small', 'medium', 'large'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFieldStyle((prev) => ({ ...prev, fontSize: s }))}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${size === s ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73]'}`}
                  >
                    {s === 'small' ? '小' : s === 'medium' ? '中' : '大'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {['#1d1d1f', '#6e6e73', '#86868b', '#007aff'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setFieldStyle((prev) => ({ ...prev, textColor: hex }))}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${color === hex ? 'border-[#1d1d1f] scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: hex }}
                    aria-label="颜色"
                  />
                ))}
              </div>
            </div>
            {isTitle ? (
              <input
                type="text"
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                placeholder="标题"
                className="w-full font-bold focus:outline-none rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-[#1d1d1f] placeholder:text-[#86868b]"
                style={{
                  fontSize: size === 'small' ? '1.25rem' : size === 'large' ? '1.75rem' : '1.5rem',
                  color,
                  textAlign: align,
                }}
                maxLength={100}
              />
            ) : (
              <textarea
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                placeholder="描述"
                rows={5}
                className="w-full resize-none focus:outline-none rounded-xl border border-black/[0.08] bg-white px-4 py-3 placeholder:text-[#86868b]"
                style={{
                  fontSize: size === 'small' ? 14 : size === 'large' ? 18 : 16,
                  color,
                  textAlign: align,
                }}
                maxLength={500}
              />
            )}
            <button
              type="button"
              onClick={handleSaveField}
              className="w-full rounded-full py-3 text-[15px] font-semibold bg-[#1d1d1f] text-white hover:bg-[#424245] active:scale-[0.98] transition-all"
            >
              保存
            </button>
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
          showBorder,
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
          showBorder,
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
          showBorder,
        },
      };
    }
    if (block.type === 'text' || block.type === 'richtext') {
      return {
        ...block,
        content,
        metadata: {
          ...block.metadata,
          fileName: fileName || undefined,
          showBorder,
          textAlign,
          fontSize,
          textColor,
        },
      };
    }
    if (block.type === 'divider') {
      return {
        ...block,
        metadata: {
          ...block.metadata,
          dividerStyle,
          showBorder,
        },
      };
    }
    return {
      ...block,
      content,
      metadata: { ...block.metadata, fileName: fileName || undefined, showBorder },
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
    const current = getCurrentBlock();
    if (!blockHasContent(current)) {
      onDiscard?.();
      onClose();
      return;
    }
    if (isNewlyAddedBlock && initialBlockRef.current && (block?.type === 'cinematic' || block?.type === 'section') && blockUnchangedFromInitial(initialBlockRef.current, current)) {
      onDiscard?.();
    }
    onClose();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const renderEditor = () => {
    switch (block.type) {
      case 'text':
        return (
          <div className="flex-1 flex flex-col px-2 min-h-0">
            <div className="flex items-center gap-2 flex-wrap px-2 pb-2 border-b border-black/[0.06] mb-2">
              <span className="text-[12px] text-[#6e6e73] mr-1">字体</span>
              <div className="flex rounded-full p-0.5 bg-black/[0.06]">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => setTextAlign(align)}
                    className={`rounded-full p-2 transition-all ${textAlign === align ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73]'}`}
                    aria-pressed={textAlign === align}
                    aria-label={align === 'left' ? '左对齐' : align === 'center' ? '居中' : '右对齐'}
                  >
                    {align === 'left' && <AlignLeft size={16} strokeWidth={2} />}
                    {align === 'center' && <AlignCenter size={16} strokeWidth={2} />}
                    {align === 'right' && <AlignRight size={16} strokeWidth={2} />}
                  </button>
                ))}
              </div>
              <div className="flex rounded-full p-0.5 bg-black/[0.06]">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setFontSize(size)}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${fontSize === size ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73]'}`}
                    aria-pressed={fontSize === size}
                  >
                    {size === 'small' ? '小' : size === 'medium' ? '中' : '大'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {['#1d1d1f', '#6e6e73', '#86868b', '#007aff'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setTextColor(hex)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${textColor === hex ? 'border-[#1d1d1f] scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: hex }}
                    aria-pressed={textColor === hex}
                    aria-label="颜色"
                  />
                ))}
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder=""
              className="flex-1 min-h-0 w-full resize-none bg-transparent px-4 py-3.5 leading-relaxed rounded-xl focus:outline-none placeholder:text-[#86868b] focus:bg-black/[0.02] transition-colors"
              style={{
                fontSize: fontSize === 'small' ? 14 : fontSize === 'medium' ? 15 : 17,
                color: textColor,
              }}
              rows={6}
            />
          </div>
        );

      case 'richtext':
        return (
          <div className="flex-1 flex flex-col px-2 min-h-0">
            <div className="flex items-center gap-2 flex-wrap px-2 pb-2 border-b border-black/[0.06] mb-2">
              <span className="text-[12px] text-[#6e6e73] mr-1">字体</span>
              <div className="flex rounded-full p-0.5 bg-black/[0.06]">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => setTextAlign(align)}
                    className={`rounded-full p-2 transition-all ${textAlign === align ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73]'}`}
                    aria-pressed={textAlign === align}
                    aria-label={align === 'left' ? '左对齐' : align === 'center' ? '居中' : '右对齐'}
                  >
                    {align === 'left' && <AlignLeft size={16} strokeWidth={2} />}
                    {align === 'center' && <AlignCenter size={16} strokeWidth={2} />}
                    {align === 'right' && <AlignRight size={16} strokeWidth={2} />}
                  </button>
                ))}
              </div>
              <div className="flex rounded-full p-0.5 bg-black/[0.06]">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setFontSize(size)}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${fontSize === size ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73]'}`}
                    aria-pressed={fontSize === size}
                  >
                    {size === 'small' ? '小' : size === 'medium' ? '中' : '大'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {['#1d1d1f', '#6e6e73', '#86868b', '#007aff'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setTextColor(hex)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${textColor === hex ? 'border-[#1d1d1f] scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: hex }}
                    aria-pressed={textColor === hex}
                    aria-label="颜色"
                  />
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-[200px]">
              <BlockRichTextEditor
                content={content}
                onChange={setContent}
                placeholder="内容"
              />
            </div>
          </div>
        );

      case 'divider':
        return (
          <div className="flex-1 px-4 space-y-4">
            <p className="text-[13px] font-medium text-[#6e6e73]">样式</p>
            <div className="flex flex-wrap gap-2">
              {(['thin', 'default', 'accent'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDividerStyle(s)}
                  className={`rounded-xl px-4 py-2.5 text-[14px] font-medium transition-all ${
                    dividerStyle === s
                      ? 'bg-[#1d1d1f] text-white'
                      : 'bg-black/[0.06] text-[#1d1d1f] hover:bg-black/[0.08]'
                  }`}
                  aria-pressed={dividerStyle === s}
                >
                  {s === 'thin' ? '细线' : s === 'default' ? '默认' : '带点'}
                </button>
              ))}
            </div>
            <div className="pt-2 border-t border-black/[0.06]">
              <DividerBlock style={dividerStyle} readOnly className="pointer-events-none" />
            </div>
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
            {uploadingImageSlot === 'image' ? (
              <div className="space-y-3">
                {images.length > 0 ? (
                  <>
                    {imageDisplayMode === 'gallery' ? (
                      <GalleryDisplayView images={images} ariaLabel="编辑区块照片" className="max-h-[320px]" />
                    ) : (
                      <PhotoGrid images={images} totalCount={images.length} ariaLabel="编辑区块照片" className="max-h-[320px]" />
                    )}
                    <ImageUploadSkeleton className="w-full h-24 rounded-xl" />
                  </>
                ) : (
                  <ImageUploadSkeleton className="w-full h-40 rounded-2xl" />
                )}
              </div>
            ) : images.length > 0 ? (
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
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) { e.target.value = ''; return; }
                setUploadingImageSlot('cinematic');
                try {
                  const url = await fileToUrlOrDataUrl(file, { userId });
                  setCinematicImageLoaded(false);
                  setCinematicImage(url);
                } finally {
                  setUploadingImageSlot(null);
                }
                e.target.value = '';
              }}
              className="hidden"
            />
            <div ref={cinematicLayoutDropdownRef} className="relative">
              <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">布局</label>
              <button
                type="button"
                onClick={() => setCinematicLayoutDropdownOpen((o) => !o)}
                className="w-full flex items-center justify-between rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-black/[0.08] hover:bg-black/[0.02] transition-colors"
                aria-expanded={cinematicLayoutDropdownOpen}
                aria-haspopup="listbox"
                aria-label="选择布局"
              >
                <span>{ALL_CINEMATIC_LAYOUTS.find((t) => t.layout === cinematicLayout)?.label ?? cinematicLayout}</span>
                <ChevronDown size={18} strokeWidth={2} className={`text-[#86868b] flex-shrink-0 transition-transform ${cinematicLayoutDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {cinematicLayoutDropdownOpen && (
                <ul
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-black/[0.08] bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                  aria-label="布局选项"
                >
                  {ALL_CINEMATIC_LAYOUTS.map((t) => (
                    <li key={t.layout} role="option" aria-selected={cinematicLayout === t.layout}>
                      <button
                        type="button"
                        onClick={() => {
                          setCinematicLayout(t.layout);
                          setCinematicLayoutDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-[15px] transition-colors ${
                          cinematicLayout === t.layout
                            ? 'bg-black/[0.06] text-[#1d1d1f] font-medium'
                            : 'text-[#1d1d1f] hover:bg-black/[0.04]'
                        }`}
                      >
                        {t.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {uploadingImageSlot === 'cinematic' ? (
              <div className="space-y-2">
                <ImageUploadSkeleton className="w-full min-h-[192px] max-h-48" />
                <div className="h-10" aria-hidden />
              </div>
            ) : (cinematicImage || (block?.type === 'cinematic' && block.metadata?.cinematicImage)) ? (
              <div className="space-y-2">
                <div className="relative w-full rounded-2xl overflow-hidden bg-[#f5f5f7] min-h-[192px] max-h-48">
                  {!cinematicImageLoaded && (
                    <div className="absolute inset-0 animate-pulse bg-[#e8e8ed]" aria-hidden />
                  )}
                  <img
                    src={cinematicImage || block?.metadata?.cinematicImage || ''}
                    alt=""
                    className={`w-full rounded-2xl object-cover max-h-48 transition-opacity duration-200 ${cinematicImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ minHeight: 192 }}
                    onLoad={() => setCinematicImageLoaded(true)}
                  />
                </div>
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
            <input
              ref={sectionImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleSectionImageSelect}
              className="hidden"
            />
            <p className="text-[13px] text-[#6e6e73]">
              {sectionTemplateId === 'marquee' ? t('editor.sectionMarquee') : sectionTemplateId === 'friends' ? t('editor.sectionFriends') : sectionTemplateId === 'agenda' ? t('editor.sectionAgenda') : sectionTemplateId}
            </p>
            {sectionTemplateId === 'marquee' && sectionData.marquee && (
              <>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sectionData.marquee.marqueeAnimate !== false}
                    onChange={(e) =>
                      setSectionData((prev) => ({
                        ...prev,
                        marquee: prev.marquee
                          ? { ...prev.marquee, marqueeAnimate: e.target.checked }
                          : { items: [], marqueeAnimate: e.target.checked },
                      }))
                    }
                    className="rounded border-black/[0.2] text-[#1d1d1f] focus:ring-black/[0.08]"
                  />
                  <span className="text-[13px] font-medium text-[#6e6e73]">跑马灯动效（可动）</span>
                </label>
                <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">横向滚动项（每项可换图）</label>
                {sectionData.marquee.items.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-black/[0.08] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#6e6e73]">项 {idx + 1}</span>
                    </div>
                    {uploadingImageSlot === `marquee.${idx}` ? (
                      <ImageUploadSkeleton className="w-full h-20 rounded-lg" />
                    ) : item.image ? (
                      <div className="space-y-2">
                        <img src={item.image} alt="" className="w-full rounded-lg object-cover h-20" />
                        <button
                          type="button"
                          onClick={() => { const k = { key: `marquee.${idx}` }; setSectionImageTarget(k); sectionImageTargetRef.current = k; sectionImageInputRef.current?.click(); }}
                          className="w-full rounded-full py-1.5 text-[12px] font-semibold bg-black/[0.06] text-[#1d1d1f]"
                        >
                          {t('editor.replaceImage')}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { const k = { key: `marquee.${idx}` }; setSectionImageTarget(k); sectionImageTargetRef.current = k; sectionImageInputRef.current?.click(); }}
                        className="w-full rounded-lg border border-dashed border-black/[0.1] py-2 text-[12px] text-[#6e6e73]"
                      >
                        {t('editor.addImage')}
                      </button>
                    )}
                    <input
                      type="text"
                      value={item.title ?? ''}
                      onChange={(e) => {
                        const items = [...sectionData.marquee!.items];
                        items[idx] = { ...items[idx], title: e.target.value };
                        setSectionData((prev) => ({ ...prev, marquee: { ...prev.marquee!, items } }));
                      }}
                      className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[14px]"
                      placeholder="标题"
                    />
                  </div>
                ))}
              </>
            )}
            {sectionTemplateId === 'friends' && (
              <div className="space-y-4">
                {(sectionData.friends ?? []).map((friend, idx) => (
                  <div key={idx} className="rounded-xl border border-black/[0.08] p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#6e6e73]">{t('editor.sectionFriends')} {idx + 1}</span>
                      {(sectionData.friends?.length ?? 0) > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setSectionData((prev) => ({
                              ...prev,
                              friends: prev.friends?.filter((_, i) => i !== idx) ?? [],
                            }))
                          }
                          className="text-[12px] font-medium text-[#ff3b30] hover:underline"
                        >
                          {t('editor.removeFriend')}
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">{t('editor.uploadPersonImage')}</label>
                      {uploadingImageSlot === `friends.${idx}.avatar` ? (
                        <div className="flex items-center gap-3">
                          <ImageUploadSkeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                        </div>
                      ) : friend.avatar ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={friend.avatar}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0 bg-black/5"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const k = { key: `friends.${idx}.avatar` };
                              setSectionImageTarget(k);
                              sectionImageTargetRef.current = k;
                              sectionImageInputRef.current?.click();
                            }}
                            className="rounded-full py-2 px-4 text-[13px] font-semibold bg-black/[0.06] text-[#1d1d1f] hover:bg-black/[0.09]"
                          >
                            {t('editor.replaceImage')}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const k = { key: `friends.${idx}.avatar` };
                            setSectionImageTarget(k);
                            sectionImageTargetRef.current = k;
                            sectionImageInputRef.current?.click();
                          }}
                          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-black/[0.1] py-4 text-[13px] text-[#6e6e73] hover:bg-black/[0.02]"
                        >
                          <ImageIcon size={20} className="text-[#86868b]" />
                          {t('editor.uploadPersonImage')}
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">{t('editor.friendName')}</label>
                      <input
                        type="text"
                        value={friend.name}
                        onChange={(e) => {
                          const arr = [...(sectionData.friends ?? [])];
                          arr[idx] = { ...arr[idx], name: e.target.value };
                          setSectionData((prev) => ({ ...prev, friends: arr }));
                        }}
                        placeholder="Joe"
                        className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-1 focus:ring-black/[0.08]"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">{t('editor.friendDescription')}</label>
                      <input
                        type="text"
                        value={friend.description}
                        onChange={(e) => {
                          const arr = [...(sectionData.friends ?? [])];
                          arr[idx] = { ...arr[idx], description: e.target.value };
                          setSectionData((prev) => ({ ...prev, friends: arr }));
                        }}
                        placeholder="Hollywood Guide"
                        className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-1 focus:ring-black/[0.08]"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setSectionData((prev) => ({
                      ...prev,
                      friends: [...(prev.friends ?? []), { avatar: '', name: '', description: '' }],
                    }))
                  }
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-black/[0.1] py-3 text-[13px] font-medium text-[#6e6e73] hover:bg-black/[0.02]"
                >
                  <ImageIcon size={16} strokeWidth={2} />
                  {t('editor.addFriend')}
                </button>
              </div>
            )}
            {sectionTemplateId === 'agenda' && sectionData.agenda && (
              <div className="space-y-4">
                {/* Headline */}
                <div>
                  <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">{t('editor.agendaHeadline')}</label>
                  <input
                    type="text"
                    value={sectionData.agenda.headline ?? ''}
                    onChange={(e) =>
                      setSectionData((prev) => ({
                        ...prev,
                        agenda: { ...prev.agenda!, headline: e.target.value },
                      }))
                    }
                    placeholder="体验内容"
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-1 focus:ring-black/[0.08]"
                  />
                </div>

                {/* Intro */}
                <div>
                  <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">{t('editor.agendaIntro')}</label>
                  <textarea
                    value={sectionData.agenda.intro ?? ''}
                    onChange={(e) =>
                      setSectionData((prev) => ({
                        ...prev,
                        agenda: { ...prev.agenda!, intro: e.target.value },
                      }))
                    }
                    placeholder="精心设计的行程，让每一步都充满期待。"
                    rows={2}
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-1 focus:ring-black/[0.08] resize-none"
                  />
                </div>

                {/* Agenda Items */}
                <label className="block text-[13px] font-medium text-[#6e6e73]">{t('editor.agendaItems')}</label>
                {sectionData.agenda.items.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-black/[0.08] p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#6e6e73]">{t('editor.agendaItem')} {idx + 1}</span>
                      {sectionData.agenda!.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setSectionData((prev) => ({
                              ...prev,
                              agenda: {
                                ...prev.agenda!,
                                items: prev.agenda!.items.filter((_, i) => i !== idx),
                              },
                            }))
                          }
                          className="text-[12px] font-medium text-[#ff3b30] hover:underline"
                        >
                          {t('common.remove')}
                        </button>
                      )}
                    </div>

                    {/* Image */}
                    <div>
                      <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">{t('editor.agendaItemImage')}</label>
                      {uploadingImageSlot === `agenda.${idx}.image` ? (
                        <ImageUploadSkeleton className="w-full h-24 rounded-lg" />
                      ) : item.image ? (
                        <div className="space-y-2">
                          <img src={item.image} alt="" className="w-full rounded-lg object-cover h-24" />
                          <button
                            type="button"
                            onClick={() => {
                              const k = { key: `agenda.${idx}.image` };
                              setSectionImageTarget(k);
                              sectionImageTargetRef.current = k;
                              sectionImageInputRef.current?.click();
                            }}
                            className="w-full rounded-full py-1.5 text-[12px] font-semibold bg-black/[0.06] text-[#1d1d1f] hover:bg-black/[0.09]"
                          >
                            {t('editor.replaceImage')}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const k = { key: `agenda.${idx}.image` };
                            setSectionImageTarget(k);
                            sectionImageTargetRef.current = k;
                            sectionImageInputRef.current?.click();
                          }}
                          className="w-full rounded-lg border border-dashed border-black/[0.1] py-4 text-[13px] text-[#6e6e73] hover:bg-black/[0.02] flex items-center justify-center gap-2"
                        >
                          <ImageIcon size={18} className="text-[#86868b]" />
                          {t('editor.addImage')}
                        </button>
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">{t('editor.agendaItemTitle')}</label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const items = [...sectionData.agenda!.items];
                          items[idx] = { ...items[idx], title: e.target.value };
                          setSectionData((prev) => ({
                            ...prev,
                            agenda: { ...prev.agenda!, items },
                          }));
                        }}
                        placeholder="第一站"
                        className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-1 focus:ring-black/[0.08]"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">{t('editor.agendaItemDescription')}</label>
                      <textarea
                        value={item.description}
                        onChange={(e) => {
                          const items = [...sectionData.agenda!.items];
                          items[idx] = { ...items[idx], description: e.target.value };
                          setSectionData((prev) => ({
                            ...prev,
                            agenda: { ...prev.agenda!, items },
                          }));
                        }}
                        placeholder="在这里开始我们的旅程。"
                        rows={2}
                        className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-1 focus:ring-black/[0.08] resize-none"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setSectionData((prev) => ({
                      ...prev,
                      agenda: {
                        ...prev.agenda!,
                        items: [
                          ...prev.agenda!.items,
                          { image: '', title: '', description: '' },
                        ],
                      },
                    }))
                  }
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-black/[0.1] py-3 text-[13px] font-medium text-[#6e6e73] hover:bg-black/[0.02]"
                >
                  <ImageIcon size={16} strokeWidth={2} />
                  {t('editor.addAgendaItem')}
                </button>

                {/* Footer */}
                <div>
                  <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">{t('editor.agendaFooter')}</label>
                  <input
                    type="text"
                    value={sectionData.agenda.footer ?? ''}
                    onChange={(e) =>
                      setSectionData((prev) => ({
                        ...prev,
                        agenda: { ...prev.agenda!, footer: e.target.value },
                      }))
                    }
                    placeholder="活动使用语言：中文"
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-1 focus:ring-black/[0.08]"
                  />
                </div>
              </div>
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
            {block.type === 'cinematic' && (ALL_CINEMATIC_LAYOUTS.find((t) => t.layout === block.metadata?.cinematicLayout)?.label ?? '区块')}
            {block.type === 'section' && (sectionTemplateId === 'marquee' ? t('editor.sectionMarquee') : sectionTemplateId === 'friends' ? t('editor.sectionFriends') : sectionTemplateId === 'agenda' ? t('editor.sectionAgenda') : '区块')}
            {block.type === 'divider' && '分割线'}
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
        <div className="px-5 py-2 flex items-center gap-2 border-b border-black/[0.06]">
          <input
            id="edit-panel-show-border"
            type="checkbox"
            checked={showBorder}
            onChange={(e) => setShowBorder(e.target.checked)}
            className="h-4 w-4 rounded border-black/[0.2] text-[#1d1d1f] focus:ring-black/[0.08]"
          />
          <label htmlFor="edit-panel-show-border" className="text-[14px] font-medium text-[#1d1d1f]">
            显示边框
          </label>
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
