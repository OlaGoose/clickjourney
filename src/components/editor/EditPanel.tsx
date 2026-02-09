'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Upload, Trash2, Image as ImageIcon, Video as VideoIcon, Music as MusicIcon, LayoutGrid, Images, Mic, Square, Type } from 'lucide-react';
import PhotoGrid from '@/components/PhotoGrid';
import { GalleryDisplayView } from '@/components/upload/GalleryDisplay';
import type { ContentBlock, ContentBlockType, ImageDisplayMode } from '@/types/editor';

const MAX_IMAGES = 6;

/** Returns true if the block has meaningful content (no empty blocks). */
function blockHasContent(b: ContentBlock): boolean {
  switch (b.type) {
    case 'text':
      return (b.content ?? '').trim().length > 0;
    case 'image':
      const imgs = b.metadata?.images?.length ? b.metadata.images : b.content ? [b.content] : [];
      return imgs.length > 0;
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
}

const BLOCK_TYPES: { type: ContentBlockType; icon: typeof Type; label: string }[] = [
  { type: 'text', icon: Type, label: '文本' },
  { type: 'image', icon: ImageIcon, label: '图片' },
  { type: 'video', icon: VideoIcon, label: '视频' },
  { type: 'audio', icon: MusicIcon, label: '音频' },
];

/** Apple light mode only: white panel, gray controls, #1d1d1f text. Apple Arcade–inspired layout. */
export function EditPanel({ isOpen, onClose, block, onSave, onDelete, onDiscard, onSelectType }: EditPanelProps) {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageDisplayMode, setImageDisplayMode] = useState<ImageDisplayMode>('grid');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setContent(url);
        setFileName(`录制_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 14)}.webm`);
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

  /** Type picker view (Apple Arcade–style): when adding new block, show choice in same sheet. */
  if (showTypePicker) {
    return (
      <>
        <div
          className={`fixed inset-0 z-40 backdrop-blur-md transition-opacity duration-300 bg-black/25 ${
            isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={onClose}
          aria-hidden
        />
        <div
          className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col rounded-t-[32px] bg-[#fbfbfd] shadow-[0_-8px_32px_rgba(0,0,0,0.12)] ${
            isOpen
              ? 'translate-y-0 animate-sheetSlideUp'
              : 'translate-y-full transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]'
          }`}
        >
          <div className="flex items-center justify-center pt-3 pb-2">
            <div className="h-1 w-10 rounded-full bg-[#d2d2d7]" />
          </div>
          <div className="grid grid-cols-3 items-center px-4 pb-2">
            <div />
            <h3 className="text-center text-[17px] font-semibold text-[#1d1d1f]">
              添加内容
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="justify-self-end rounded-full p-2.5 text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all active:scale-95"
              aria-label="关闭"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2">
            <p className="mb-4 text-[13px] text-[#6e6e73]">
              选择要添加的内容类型
            </p>
            <div className="grid grid-cols-2 gap-3">
              {BLOCK_TYPES.map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onSelectType(type)}
                  className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white p-6 text-[#1d1d1f] border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:bg-[#fafafa] transition-all active:scale-[0.98]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f5f7]">
                    <Icon size={24} strokeWidth={2} className="text-[#6e6e73]" />
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
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入文本内容..."
              className="h-full w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed rounded-2xl focus:outline-none text-[#1d1d1f] placeholder:text-[#86868b] focus:bg-[#f5f5f7]/80"
              rows={8}
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
            {/* 呈现形式：网格 / 相册 — pill toggle Apple-style */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#6e6e73]">
                呈现形式
              </span>
              <div className="flex rounded-full p-0.5 bg-[#e8e8ed]">
                <button
                  type="button"
                  onClick={() => setImageDisplayMode('grid')}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-95 ${
                    imageDisplayMode === 'grid'
                      ? 'bg-white text-[#1d1d1f] shadow-sm'
                      : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                  }`}
                  aria-pressed={imageDisplayMode === 'grid'}
                >
                  <LayoutGrid size={14} />
                  网格
                </button>
                <button
                  type="button"
                  onClick={() => setImageDisplayMode('gallery')}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-95 ${
                    imageDisplayMode === 'gallery'
                      ? 'bg-white text-[#1d1d1f] shadow-sm'
                      : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                  }`}
                  aria-pressed={imageDisplayMode === 'gallery'}
                >
                  <Images size={14} />
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
                    className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold bg-[#e8e8ed] text-[#1d1d1f] hover:bg-[#d2d2d7] transition-all active:scale-95"
                  >
                    <Upload size={16} />
                    添加图片（{images.length}/{MAX_IMAGES}）
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUploadClick}
                className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-all hover:opacity-90 active:scale-[0.99]"
              >
                <ImageIcon size={32} className="text-[#86868b]" />
                <span className="text-sm font-medium text-[#6e6e73]">
                  点击上传图片（可多选，最多 {MAX_IMAGES} 张）
                </span>
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
                  className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold bg-[#e8e8ed] text-[#1d1d1f] hover:bg-[#d2d2d7] transition-all active:scale-95"
                >
                  <Upload size={16} />
                  替换视频
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUploadClick}
                className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-all hover:opacity-90 active:scale-[0.99]"
              >
                <VideoIcon size={32} className="text-[#86868b]" />
                <span className="text-sm font-medium text-[#6e6e73]">
                  点击上传视频
                </span>
              </button>
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
                <div className="rounded-2xl p-4 bg-[#f5f5f7]">
                  <audio src={content} controls className="w-full">
                    Your browser does not support the audio tag.
                  </audio>
                  {fileName && (
                    <p className="mt-2 text-xs truncate text-[#86868b]">
                      {fileName}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="flex-1 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold bg-[#e8e8ed] text-[#1d1d1f] hover:bg-[#d2d2d7] transition-all active:scale-95"
                  >
                    <Upload size={16} />
                    替换音频
                  </button>
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex-1 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold bg-[#e8e8ed] text-[#1d1d1f] hover:bg-[#d2d2d7] transition-all active:scale-95"
                  >
                    <Mic size={16} />
                    重新录制
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="flex h-24 w-full items-center justify-center gap-3 rounded-2xl bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-all hover:opacity-90 active:scale-[0.99]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8e8ed]">
                    <Upload size={22} className="text-[#6e6e73]" />
                  </div>
                  <span className="text-[15px] font-semibold text-[#1d1d1f]">
                    上传音频
                  </span>
                </button>
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={false}
                  className="flex h-24 w-full items-center justify-center gap-3 rounded-2xl bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-70"
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isRecording ? 'bg-[#ff3b30]/15' : 'bg-[#e8e8ed]'}`}>
                    {isRecording ? (
                      <Square size={20} className="text-[#ff3b30]" fill="currentColor" />
                    ) : (
                      <Mic size={22} className="text-[#6e6e73]" />
                    )}
                  </div>
                  <span className="text-[15px] font-semibold text-[#1d1d1f]">
                    {isRecording ? '停止录制' : '麦克风录制'}
                  </span>
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
      {/* Backdrop — 与面板同步淡入；关闭时先收再淡出 */}
      <div
        className={`fixed inset-0 z-40 backdrop-blur-md transition-opacity duration-300 bg-black/25 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={handleClose}
        aria-hidden
      />

      {/* Panel — Apple Arcade–inspired: light gray sheet, rounded corners, clear sections */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[82vh] flex-col rounded-t-[28px] bg-[#fbfbfd] shadow-[0_-8px_32px_rgba(0,0,0,0.1)] ${
          isOpen
            ? 'translate-y-0 animate-sheetSlideUp'
            : 'translate-y-full transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]'
        }`}
      >
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-[#d2d2d7]" />
        </div>
        <div className="grid grid-cols-3 items-center px-4 pb-3">
          <button
            type="button"
            onClick={onDelete}
            className="justify-self-start flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-all active:scale-95"
          >
            <Trash2 size={14} />
            删除
          </button>
          <h3 className="justify-self-center text-[17px] font-semibold text-[#1d1d1f]">
            {block.type === 'text' && '编辑文本'}
            {block.type === 'image' && '编辑图片'}
            {block.type === 'video' && '编辑视频'}
            {block.type === 'audio' && '编辑音频'}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="justify-self-end rounded-full p-2.5 text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all active:scale-95"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-1">
          {renderEditor()}
        </div>
        <div className="p-4 pt-2 bg-[#fbfbfd]">
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-[14px] py-3.5 text-[16px] font-semibold bg-[#1d1d1f] text-white hover:bg-[#424245] shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-all active:scale-[0.98]"
          >
            完成
          </button>
        </div>
      </div>
    </>
  );
}
