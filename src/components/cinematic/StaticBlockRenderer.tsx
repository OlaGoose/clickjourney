'use client';

import { StoryBlock } from '@/types/cinematic';
import { ImageUploader } from './ImageUploader';
import { ReflectionEndLayout } from './ReflectionEndLayout';
import { useState, useRef, useEffect } from 'react';

/** No height limit: view mode shows full text in a div; edit mode uses auto-resizing textarea so content is always fully visible. */
function BlockTextArea({
  value,
  onUpdate,
  blockId,
  placeholder,
  className,
  isEditMode,
  isDark,
}: {
  value: string;
  onUpdate: (id: string, updates: Partial<StoryBlock>) => void;
  blockId: string;
  placeholder: string;
  className: string;
  isEditMode: boolean;
  isDark?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!isEditMode || !ref.current) return;
    const el = ref.current;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, isEditMode]);

  const editHover = isDark ? 'hover:bg-white/[0.06] focus:bg-white/[0.08]' : 'hover:bg-black/[0.02] focus:bg-black/[0.03]';
  if (!isEditMode) {
    return (
      <div className={`w-full ${className} whitespace-pre-wrap`}>
        {value || '\u00A0'}
      </div>
    );
  }
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onUpdate(blockId, { text: e.target.value })}
      placeholder={placeholder}
      rows={1}
      className={`w-full bg-transparent border-none outline-none resize-none overflow-hidden min-h-[1.5em] disabled:cursor-default transition-colors ${editHover} ${className}`}
    />
  );
}

interface StaticBlockRendererProps {
  block: StoryBlock;
  index: number;
  isEditMode: boolean;
  onUpdate: (id: string, updates: Partial<StoryBlock>) => void;
  /** Night mode (Apple TV style): dark bg, light text. */
  isDark?: boolean;
}

/**
 * Static Block Renderer - Airbnb Magazine Style
 * 完全静态的、精致的排版系统
 * 如同Apple做旅游杂志的极致品味
 */
export const StaticBlockRenderer = ({ block, index, isEditMode, onUpdate, isDark = false }: StaticBlockRendererProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const t = (light: string, dark: string) => (isDark ? dark : light);

  const getImageFilter = () => {
    switch (block.imageFilter) {
      case 'grayscale': return 'grayscale(0.3) contrast(1.1)';
      case 'warm': return 'sepia(0.1) saturate(1.05) brightness(1.01)';
      case 'cool': return 'hue-rotate(-10deg) saturate(0.9) brightness(0.99)';
      case 'vibrant': return 'saturate(1.15) contrast(1.05)';
      case 'muted': return 'saturate(0.7) brightness(0.96) contrast(0.98)';
      default: return 'none';
    }
  };

  /** 所有图片容器统一圆角，移动端友好间距 */
  const imageWrapperClass = 'rounded-2xl overflow-hidden';
  const ImageContainer = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div
      className={`image-container relative ${imageWrapperClass} bg-gradient-to-br ${t('from-black/3 to-black/5', 'from-white/5 to-white/5')} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {isEditMode && isHovered && (
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity rounded-2xl ${t('bg-black/10', 'bg-white/10')}`}>
          <div className={t('bg-white/95 text-black', 'bg-black/90 text-white') + ' px-4 py-2 rounded-full text-xs font-medium'}>
            点击更换图片
          </div>
        </div>
      )}
    </div>
  );

  // Layout-specific rendering（所有图片容器带 rounded-2xl，移动端优先间距与字号）
  switch (block.layout) {
    case 'full_bleed':
      return (
        <div className="relative">
          <ImageContainer className="aspect-[3/4] sm:aspect-[16/9] md:aspect-[21/9]">
            <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
              <img
                src={block.image}
                alt="Story moment"
                style={{ filter: getImageFilter() }}
                className="w-full h-full object-cover transition-transform duration-700 rounded-2xl"
                onLoad={() => setImageLoaded(true)}
              />
            </ImageUploader>
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30 px-6 py-8">
              <div className="max-w-3xl text-center">
                <BlockTextArea
                  value={block.text}
                  onUpdate={onUpdate}
                  blockId={block.id}
                  placeholder="描述这个瞬间..."
                  className={`font-serif text-xl sm:text-2xl md:text-4xl font-medium leading-[1.35] tracking-[-0.015em] text-white drop-shadow-md ${!isEditMode ? 'whitespace-pre-wrap' : ''}`}
                  isEditMode={isEditMode}
                  isDark={false}
                />
              </div>
            </div>
          </ImageContainer>
        </div>
      );

    case 'hero_split':
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12">
          <div className={`md:col-span-8 aspect-[4/5] min-h-[200px] ${imageWrapperClass} ${t('bg-black/5', 'bg-white/5')}`}>
            <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
              <img
                src={block.image}
                alt="Story moment"
                style={{ filter: getImageFilter() }}
                className="w-full h-full object-cover rounded-2xl"
              />
            </ImageUploader>
          </div>
          <div className="md:col-span-4 flex flex-col justify-center px-0 md:px-0">
            <div className="space-y-4 md:space-y-6">
              <div className={`w-12 h-px ${t('bg-black/20', 'bg-white/20')}`} />
              <BlockTextArea
                value={block.text}
                onUpdate={onUpdate}
                blockId={block.id}
                placeholder="这里发生了什么..."
                className={`font-serif text-xl sm:text-2xl md:text-4xl font-medium leading-[1.3] tracking-[-0.015em] ${t('text-black', 'text-white')}`}
                isEditMode={isEditMode}
                isDark={isDark}
              />
            </div>
          </div>
        </div>
      );

    case 'side_by_side':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-16 items-center">
          <div className={`aspect-[3/4] min-h-[220px] ${imageWrapperClass} ${t('bg-black/5', 'bg-white/5')} ${index % 2 === 0 ? 'order-1' : 'order-1 md:order-2'}`}>
            <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
              <img
                src={block.image}
                alt="Story moment"
                style={{ filter: getImageFilter() }}
                className="w-full h-full object-cover rounded-2xl"
              />
            </ImageUploader>
          </div>
          <div className={`space-y-4 md:space-y-6 ${index % 2 === 0 ? 'order-2' : 'order-2 md:order-1'}`}>
            <BlockTextArea
              value={block.text}
              onUpdate={onUpdate}
              blockId={block.id}
              placeholder="讲述这个故事..."
              className={`font-serif text-lg sm:text-xl md:text-2xl font-normal leading-[1.6] ${t('text-black/80', 'text-white/80')}`}
              isEditMode={isEditMode}
              isDark={isDark}
            />
          </div>
        </div>
      );

    case 'immersive_focus':
      return (
        <div className="relative">
          <div className={`aspect-[1/1] md:aspect-[16/10] min-h-[240px] ${imageWrapperClass} mb-6 md:mb-8 ${t('bg-black/5', 'bg-white/5')}`}>
            <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
              <img
                src={block.image}
                alt="Story moment"
                style={{ filter: getImageFilter() }}
                className="w-full h-full object-cover rounded-2xl"
              />
            </ImageUploader>
          </div>
          <div className="max-w-3xl mx-auto text-center px-2">
            <BlockTextArea
              value={block.text}
              onUpdate={onUpdate}
              blockId={block.id}
              placeholder="一个值得铭记的瞬间..."
              className={`text-center font-serif text-xl sm:text-2xl md:text-3xl font-medium leading-[1.4] tracking-[-0.015em] ${t('text-black', 'text-white')}`}
              isEditMode={isEditMode}
              isDark={isDark}
            />
          </div>
        </div>
      );

    case 'magazine_spread':
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-20">
          <div className="md:col-span-7 space-y-4 md:space-y-6">
            <div className={`aspect-[4/3] min-h-[200px] ${imageWrapperClass} ${t('bg-black/5', 'bg-white/5')}`}>
              <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
                <img
                  src={block.image}
                  alt="Story moment"
                  style={{ filter: getImageFilter() }}
                  className="w-full h-full object-cover rounded-2xl"
                />
              </ImageUploader>
            </div>
          </div>
          <div className="md:col-span-5 flex flex-col justify-center space-y-4 md:space-y-8">
            <div className={`text-6xl md:text-9xl font-serif select-none leading-none ${t('text-black/8', 'text-white/8')}`}>
              "
            </div>
            <BlockTextArea
              value={block.text}
              onUpdate={onUpdate}
              blockId={block.id}
              placeholder="深入的思考..."
              className={`font-serif text-base sm:text-lg md:text-xl font-normal leading-[1.8] ${t('text-black/70', 'text-white/70')}`}
              isEditMode={isEditMode}
              isDark={isDark}
            />
            <div className={`w-20 h-px ${t('bg-black/10', 'bg-white/10')}`} />
          </div>
        </div>
      );

    case 'minimal_caption':
      return (
        <div className="space-y-4 md:space-y-6">
          <div className={`aspect-[4/3] sm:aspect-[16/9] min-h-[200px] ${imageWrapperClass} ${t('bg-black/5', 'bg-white/5')}`}>
            <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
              <img
                src={block.image}
                alt="Story moment"
                style={{ filter: getImageFilter() }}
                className="w-full h-full object-cover rounded-2xl"
              />
            </ImageUploader>
          </div>
          <div className="max-w-2xl">
            <BlockTextArea
              value={block.text}
              onUpdate={onUpdate}
              blockId={block.id}
              placeholder="简短的注释..."
              className={`text-sm md:text-base leading-[1.5] font-normal ${t('text-black/50', 'text-white/50')}`}
              isEditMode={isEditMode}
              isDark={isDark}
            />
          </div>
        </div>
      );

    case 'portrait_feature':
      return (
        <div className="max-w-4xl mx-auto px-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
            <div className={`md:col-span-2 aspect-[3/4] min-h-[280px] ${imageWrapperClass} ${t('bg-black/5', 'bg-white/5')}`}>
              <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
                <img
                  src={block.image}
                  alt="Portrait"
                  style={{ filter: getImageFilter() }}
                  className="w-full h-full object-cover rounded-2xl"
                />
              </ImageUploader>
            </div>
            <div className="md:col-span-1 flex flex-col justify-end pb-4 md:pb-8">
              <BlockTextArea
                value={block.text}
                onUpdate={onUpdate}
                blockId={block.id}
                placeholder="关于这个人..."
                className={`font-serif text-base sm:text-lg md:text-xl font-normal leading-[1.6] ${t('text-black/70', 'text-white/70')}`}
                isEditMode={isEditMode}
                isDark={isDark}
              />
            </div>
          </div>
        </div>
      );

    case 'text_overlay':
      return (
        <div className={`relative aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] min-h-[220px] ${imageWrapperClass} flex items-center justify-center ${t('bg-black/5', 'bg-white/5')}`}>
          <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
            <img
              src={block.image}
              alt="Background"
              style={{ filter: getImageFilter() }}
              className="absolute inset-0 w-full h-full object-cover opacity-40 rounded-2xl"
            />
          </ImageUploader>
          <div className="relative z-10 max-w-4xl px-4 sm:px-8 text-center">
            <BlockTextArea
              value={block.text}
              onUpdate={onUpdate}
              blockId={block.id}
              placeholder="大胆的声明..."
              className={`text-center font-serif text-2xl sm:text-4xl md:text-6xl font-bold leading-[1.1] tracking-[-0.02em] ${t('text-black', 'text-white')}`}
              isEditMode={isEditMode}
              isDark={isDark}
            />
          </div>
        </div>
      );

    case 'reflection_end':
      if (isEditMode) {
        return (
          <div className={`rounded-2xl overflow-hidden border ${t('border-black/[0.06]', 'border-white/10')} ${t('bg-neutral-900', 'bg-neutral-900')}`}>
            <div className="px-6 py-8 md:py-12 text-center">
              <p className="font-serif text-4xl md:text-5xl text-white/90 tracking-wider font-light mb-6">Fin.</p>
              <div className="w-16 h-px bg-white/20 mx-auto mb-6" />
              <BlockTextArea
                value={block.text}
                onUpdate={onUpdate}
                blockId={block.id}
                placeholder="写下结尾语，留空则使用默认英文句"
                className="font-serif text-base md:text-lg text-white/80 font-light tracking-wide leading-relaxed text-center max-w-xl mx-auto"
                isEditMode={true}
                isDark={true}
              />
              <div className="w-16 h-px bg-white/20 mx-auto mt-6" />
            </div>
          </div>
        );
      }
      return (
        <div className="rounded-2xl overflow-hidden border border-black/[0.06]">
          <ReflectionEndLayout onReplay={() => {}} closingText={block.text} />
        </div>
      );

    default:
      return (
        <div className="grid grid-cols-1 gap-6 md:gap-8">
          <div className={`aspect-[4/3] sm:aspect-[16/9] min-h-[200px] ${imageWrapperClass} ${t('bg-black/5', 'bg-white/5')}`}>
            <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
              <img
                src={block.image}
                alt="Story moment"
                style={{ filter: getImageFilter() }}
                className="w-full h-full object-cover rounded-2xl"
              />
            </ImageUploader>
          </div>
          <div className="px-0">
            <BlockTextArea
              value={block.text}
              onUpdate={onUpdate}
              blockId={block.id}
              placeholder="添加描述..."
              className={`font-serif text-lg sm:text-xl leading-relaxed ${t('text-black', 'text-white')}`}
              isEditMode={isEditMode}
              isDark={isDark}
            />
          </div>
        </div>
      );
  }
};
