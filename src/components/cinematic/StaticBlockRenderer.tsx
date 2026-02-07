'use client';

import { StoryBlock } from '@/types/cinematic';
import { ImageUploader } from './ImageUploader';
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

  const ImageContainer = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div
      className={`image-container relative overflow-hidden bg-gradient-to-br ${t('from-black/3 to-black/5', 'from-white/5 to-white/5')} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {isEditMode && isHovered && (
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${t('bg-black/10', 'bg-white/10')}`}>
          <div className={t('bg-white/95 text-black', 'bg-black/90 text-white') + ' px-4 py-2 rounded-full text-xs font-medium'}>
            点击更换图片
          </div>
        </div>
      )}
    </div>
  );

  // Layout-specific rendering
  switch (block.layout) {
    case 'full_bleed':
      return (
        <div className="grid grid-cols-1 gap-0">
          {/* Full Width Hero Image */}
          <ImageContainer className="aspect-[16/9] md:aspect-[21/9]">
            <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
              <img
                src={block.image}
                alt="Story moment"
                style={{ filter: getImageFilter() }}
                className="w-full h-full object-cover transition-transform duration-700"
                onLoad={() => setImageLoaded(true)}
              />
            </ImageUploader>
          </ImageContainer>
          
          {/* Caption Below — no height limit, full content visible */}
          <div className="py-8 md:py-12">
            <BlockTextArea
              value={block.text}
              onUpdate={onUpdate}
              blockId={block.id}
              placeholder="描述这个瞬间..."
              className={`font-serif text-2xl md:text-4xl font-medium leading-[1.4] tracking-[-0.015em] ${t('text-black', 'text-white')}`}
              isEditMode={isEditMode}
              isDark={isDark}
            />
          </div>
        </div>
      );

    case 'hero_split':
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Large Image - 8 cols */}
          <div className={`md:col-span-8 aspect-[4/5] overflow-hidden ${t('bg-black/5', 'bg-white/5')}`}>
            <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
              <img
                src={block.image}
                alt="Story moment"
                style={{ filter: getImageFilter() }}
                className="w-full h-full object-cover"
              />
            </ImageUploader>
          </div>
          
          {/* Text Panel - 4 cols */}
          <div className="md:col-span-4 flex flex-col justify-center">
            <div className="space-y-6">
              <div className={`w-12 h-px ${t('bg-black/20', 'bg-white/20')}`} />
              <BlockTextArea
                value={block.text}
                onUpdate={onUpdate}
                blockId={block.id}
                placeholder="这里发生了什么..."
                className={`font-serif text-3xl md:text-4xl font-medium leading-[1.3] tracking-[-0.015em] ${t('text-black', 'text-white')}`}
                isEditMode={isEditMode}
                isDark={isDark}
              />
            </div>
          </div>
        </div>
      );

    case 'side_by_side':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Image */}
          <div className={`aspect-[3/4] overflow-hidden ${t('bg-black/5', 'bg-white/5')} ${index % 2 === 0 ? 'order-1' : 'order-1 md:order-2'}`}>
            <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
              <img
                src={block.image}
                alt="Story moment"
                style={{ filter: getImageFilter() }}
                className="w-full h-full object-cover"
              />
            </ImageUploader>
          </div>
          
          {/* Text */}
          <div className={`space-y-6 ${index % 2 === 0 ? 'order-2' : 'order-2 md:order-1'}`}>
            <BlockTextArea
              value={block.text}
              onUpdate={onUpdate}
              blockId={block.id}
              placeholder="讲述这个故事..."
              className={`font-serif text-xl md:text-2xl font-normal leading-[1.6] ${t('text-black/80', 'text-white/80')}`}
              isEditMode={isEditMode}
              isDark={isDark}
            />
          </div>
        </div>
      );

    case 'immersive_focus':
      return (
        <div className="relative">
          {/* Centered Large Image */}
          <div className={`aspect-[1/1] md:aspect-[16/10] overflow-hidden mb-8 ${t('bg-black/5', 'bg-white/5')}`}>
            <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
              <img
                src={block.image}
                alt="Story moment"
                style={{ filter: getImageFilter() }}
                className="w-full h-full object-cover"
              />
            </ImageUploader>
          </div>
          
          {/* Centered Caption */}
          <div className="max-w-3xl mx-auto text-center">
            <BlockTextArea
              value={block.text}
              onUpdate={onUpdate}
              blockId={block.id}
              placeholder="一个值得铭记的瞬间..."
              className={`text-center font-serif text-2xl md:text-3xl font-medium leading-[1.4] tracking-[-0.015em] ${t('text-black', 'text-white')}`}
              isEditMode={isEditMode}
              isDark={isDark}
            />
          </div>
        </div>
      );

    case 'magazine_spread':
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20">
          {/* Image with Breathing Space */}
          <div className="md:col-span-7 space-y-6">
            <div className={`aspect-[4/3] overflow-hidden ${t('bg-black/5', 'bg-white/5')}`}>
              <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
                <img
                  src={block.image}
                  alt="Story moment"
                  style={{ filter: getImageFilter() }}
                  className="w-full h-full object-cover"
                />
              </ImageUploader>
            </div>
          </div>
          
          {/* Editorial Text */}
          <div className="md:col-span-5 flex flex-col justify-center space-y-8">
            <div className={`text-9xl font-serif select-none leading-none ${t('text-black/8', 'text-white/8')}`}>
              "
            </div>
            <BlockTextArea
              value={block.text}
              onUpdate={onUpdate}
              blockId={block.id}
              placeholder="深入的思考..."
              className={`font-serif text-lg md:text-xl font-normal leading-[1.8] ${t('text-black/70', 'text-white/70')}`}
              isEditMode={isEditMode}
              isDark={isDark}
            />
            <div className={`w-20 h-px ${t('bg-black/10', 'bg-white/10')}`} />
          </div>
        </div>
      );

    case 'minimal_caption':
      return (
        <div className="space-y-6">
          {/* Dominant Image */}
          <div className={`aspect-[16/9] overflow-hidden ${t('bg-black/5', 'bg-white/5')}`}>
            <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
              <img
                src={block.image}
                alt="Story moment"
                style={{ filter: getImageFilter() }}
                className="w-full h-full object-cover"
              />
            </ImageUploader>
          </div>
          
          {/* Minimal Caption */}
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
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Portrait Image */}
            <div className={`md:col-span-2 aspect-[3/4] overflow-hidden ${t('bg-black/5', 'bg-white/5')}`}>
              <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
                <img
                  src={block.image}
                  alt="Portrait"
                  style={{ filter: getImageFilter() }}
                  className="w-full h-full object-cover"
                />
              </ImageUploader>
            </div>
            
            {/* Side Text */}
            <div className="md:col-span-1 flex flex-col justify-end pb-8">
              <BlockTextArea
                value={block.text}
                onUpdate={onUpdate}
                blockId={block.id}
                placeholder="关于这个人..."
                className={`font-serif text-lg md:text-xl font-normal leading-[1.6] ${t('text-black/70', 'text-white/70')}`}
                isEditMode={isEditMode}
                isDark={isDark}
              />
            </div>
          </div>
        </div>
      );

    case 'text_overlay':
      return (
        <div className={`relative aspect-[16/9] md:aspect-[21/9] overflow-hidden flex items-center justify-center ${t('bg-black/5', 'bg-white/5')}`}>
          <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
            <img
              src={block.image}
              alt="Background"
              style={{ filter: getImageFilter() }}
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
          </ImageUploader>
          
          {/* Overlaid Text */}
          <div className="relative z-10 max-w-4xl px-8 text-center">
            <BlockTextArea
              value={block.text}
              onUpdate={onUpdate}
              blockId={block.id}
              placeholder="大胆的声明..."
              className={`text-center font-serif text-4xl md:text-6xl font-bold leading-[1.1] tracking-[-0.02em] ${t('text-black', 'text-white')}`}
              isEditMode={isEditMode}
              isDark={isDark}
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="grid grid-cols-1 gap-8">
          <div className={`aspect-[16/9] overflow-hidden ${t('bg-black/5', 'bg-white/5')}`}>
            <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
              <img
                src={block.image}
                alt="Story moment"
                style={{ filter: getImageFilter() }}
                className="w-full h-full object-cover"
              />
            </ImageUploader>
          </div>
          <BlockTextArea
            value={block.text}
            onUpdate={onUpdate}
            blockId={block.id}
            placeholder="添加描述..."
            className={`font-serif text-xl leading-relaxed ${t('text-black', 'text-white')}`}
            isEditMode={isEditMode}
            isDark={isDark}
          />
        </div>
      );
  }
};
