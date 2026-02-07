'use client';

import { StoryBlock } from '@/types/cinematic';
import { ImageUploader } from './ImageUploader';
import { useState } from 'react';

interface StaticBlockRendererProps {
  block: StoryBlock;
  index: number;
  isEditMode: boolean;
  onUpdate: (id: string, updates: Partial<StoryBlock>) => void;
}

/**
 * Static Block Renderer - Airbnb Magazine Style
 * 完全静态的、精致的排版系统
 * 如同Apple做旅游杂志的极致品味
 */
export const StaticBlockRenderer = ({ block, index, isEditMode, onUpdate }: StaticBlockRendererProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

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
      className={`image-container relative overflow-hidden bg-gradient-to-br from-black/3 to-black/5 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {isEditMode && isHovered && (
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center transition-opacity">
          <div className="bg-white/95 px-4 py-2 rounded-full text-xs font-medium text-black">
            点击更换图片
          </div>
        </div>
      )}
    </div>
  );

  const TextArea = ({ 
    value, 
    placeholder, 
    className = '', 
    rows = 2 
  }: { 
    value: string; 
    placeholder: string; 
    className?: string; 
    rows?: number;
  }) => (
    <textarea
      value={value}
      onChange={(e) => onUpdate(block.id, { text: e.target.value })}
      disabled={!isEditMode}
      placeholder={placeholder}
      rows={rows}
      className={`w-full bg-transparent border-none outline-none resize-none disabled:cursor-default transition-colors ${
        isEditMode ? 'hover:bg-black/[0.02] focus:bg-black/[0.03]' : ''
      } ${className}`}
    />
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
          
          {/* Caption Below */}
          <div className="py-8 md:py-12">
            <TextArea
              value={block.text}
              placeholder="描述这个瞬间..."
              className="font-serif text-2xl md:text-4xl text-black leading-[1.4] tracking-tight"
              rows={2}
            />
          </div>
        </div>
      );

    case 'hero_split':
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Large Image - 8 cols */}
          <div className="md:col-span-8 aspect-[4/5] overflow-hidden bg-black/5">
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
              <div className="w-12 h-px bg-black/20" />
              <textarea
                value={block.text}
                onChange={(e) => onUpdate(block.id, { text: e.target.value })}
                disabled={!isEditMode}
                className="w-full bg-transparent border-none outline-none resize-none font-serif text-3xl md:text-4xl text-black leading-[1.3] tracking-tight disabled:cursor-default"
                placeholder="这里发生了什么..."
                rows={3}
              />
            </div>
          </div>
        </div>
      );

    case 'side_by_side':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Image */}
          <div className={`aspect-[3/4] overflow-hidden bg-black/5 ${index % 2 === 0 ? 'order-1' : 'order-1 md:order-2'}`}>
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
            <textarea
              value={block.text}
              onChange={(e) => onUpdate(block.id, { text: e.target.value })}
              disabled={!isEditMode}
              className="w-full bg-transparent border-none outline-none resize-none font-serif text-xl md:text-2xl text-black/80 leading-[1.6] disabled:cursor-default"
              placeholder="讲述这个故事..."
              rows={4}
            />
          </div>
        </div>
      );

    case 'immersive_focus':
      return (
        <div className="relative">
          {/* Centered Large Image */}
          <div className="aspect-[1/1] md:aspect-[16/10] overflow-hidden bg-black/5 mb-8">
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
            <textarea
              value={block.text}
              onChange={(e) => onUpdate(block.id, { text: e.target.value })}
              disabled={!isEditMode}
              className="w-full bg-transparent border-none outline-none resize-none text-center font-serif text-2xl md:text-3xl text-black leading-[1.4] tracking-tight disabled:cursor-default"
              placeholder="一个值得铭记的瞬间..."
              rows={2}
            />
          </div>
        </div>
      );

    case 'magazine_spread':
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20">
          {/* Image with Breathing Space */}
          <div className="md:col-span-7 space-y-6">
            <div className="aspect-[4/3] overflow-hidden bg-black/5">
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
            <div className="text-9xl font-serif text-black/8 select-none leading-none">
              "
            </div>
            <textarea
              value={block.text}
              onChange={(e) => onUpdate(block.id, { text: e.target.value })}
              disabled={!isEditMode}
              className="w-full bg-transparent border-none outline-none resize-none font-serif text-lg md:text-xl text-black/70 leading-[1.8] disabled:cursor-default"
              placeholder="深入的思考..."
              rows={5}
            />
            <div className="w-20 h-px bg-black/10" />
          </div>
        </div>
      );

    case 'minimal_caption':
      return (
        <div className="space-y-6">
          {/* Dominant Image */}
          <div className="aspect-[16/9] overflow-hidden bg-black/5">
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
            <textarea
              value={block.text}
              onChange={(e) => onUpdate(block.id, { text: e.target.value })}
              disabled={!isEditMode}
              className="w-full bg-transparent border-none outline-none resize-none text-sm md:text-base text-black/50 leading-relaxed disabled:cursor-default font-light"
              placeholder="简短的注释..."
              rows={1}
            />
          </div>
        </div>
      );

    case 'portrait_feature':
      return (
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Portrait Image */}
            <div className="md:col-span-2 aspect-[3/4] overflow-hidden bg-black/5">
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
              <textarea
                value={block.text}
                onChange={(e) => onUpdate(block.id, { text: e.target.value })}
                disabled={!isEditMode}
                className="w-full bg-transparent border-none outline-none resize-none font-serif text-lg md:text-xl text-black/70 leading-[1.6] disabled:cursor-default"
                placeholder="关于这个人..."
                rows={6}
              />
            </div>
          </div>
        </div>
      );

    case 'text_overlay':
      return (
        <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-black/5 flex items-center justify-center">
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
            <textarea
              value={block.text}
              onChange={(e) => onUpdate(block.id, { text: e.target.value })}
              disabled={!isEditMode}
              className="w-full bg-transparent border-none outline-none resize-none text-center font-serif text-4xl md:text-6xl text-black font-bold leading-[1.2] tracking-tight disabled:cursor-default"
              placeholder="大胆的声明..."
              rows={2}
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="grid grid-cols-1 gap-8">
          <div className="aspect-[16/9] overflow-hidden bg-black/5">
            <ImageUploader onUpload={(base64) => onUpdate(block.id, { image: base64 })}>
              <img
                src={block.image}
                alt="Story moment"
                style={{ filter: getImageFilter() }}
                className="w-full h-full object-cover"
              />
            </ImageUploader>
          </div>
          <textarea
            value={block.text}
            onChange={(e) => onUpdate(block.id, { text: e.target.value })}
            disabled={!isEditMode}
            className="w-full bg-transparent border-none outline-none resize-none font-serif text-xl text-black leading-relaxed disabled:cursor-default"
            placeholder="添加描述..."
            rows={2}
          />
        </div>
      );
  }
};
