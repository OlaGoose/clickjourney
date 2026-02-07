'use client';

import { useState, useEffect } from 'react';
import { MapPin, Calendar, Edit2, ArrowLeft, Share2, Download } from 'lucide-react';
import Link from 'next/link';
import { DirectorScript, StoryBlock } from '@/types/cinematic';
import { StaticBlockRenderer } from '@/components/cinematic/StaticBlockRenderer';

const DEFAULT_SCRIPT: DirectorScript = {
  title: "未命名的旅程",
  location: "未知目的地",
  blocks: [
    {
      id: '1',
      layout: "full_bleed",
      image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&h=1200&fit=crop",
      text: "每一段旅程，都从一个决定开始",
      animation: "fade_in",
      textPosition: "center",
      textSize: "large",
      imageFilter: "none",
      mood: "contemplative"
    }
  ]
};

export default function CinematicMemoryPage() {
  const [script, setScript] = useState<DirectorScript>(DEFAULT_SCRIPT);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);

  // Load script from sessionStorage
  useEffect(() => {
    const loadScript = () => {
      try {
        const storedScript = sessionStorage.getItem('cinematicScript');
        if (storedScript) {
          const parsedScript = JSON.parse(storedScript);
          console.log('[Cinematic] Loaded script:', parsedScript);
          setScript(parsedScript);
          sessionStorage.removeItem('cinematicScript');
        }
      } catch (error) {
        console.error('[Cinematic] Failed to load script:', error);
      } finally {
        setIsLoading(false);
      }
    };

    setTimeout(loadScript, 500);
  }, []);

  const handleUpdateBlock = (id: string, updates: Partial<StoryBlock>) => {
    setScript(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-black/20 border-t-black rounded-full animate-spin mx-auto" />
          <p className="text-sm text-black/40 tracking-wide">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Header - Airbnb Style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Link 
            href="/memories/upload"
            className="flex items-center gap-2 text-black/70 hover:text-black transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">返回</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isEditMode 
                  ? 'bg-black text-white' 
                  : 'bg-black/5 text-black hover:bg-black/10'
              }`}
            >
              <Edit2 size={16} />
              {isEditMode ? '完成编辑' : '编辑'}
            </button>
            
            <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <Share2 size={20} className="text-black/70" />
            </button>
            
            <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <Download size={20} className="text-black/70" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        {/* Hero Title Section - Magazine Style */}
        <section className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="space-y-8">
            {/* Date & Location */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-black/50">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{getCurrentDate()}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <input
                  type="text"
                  value={script.location}
                  onChange={(e) => setScript(s => ({...s, location: e.target.value}))}
                  disabled={!isEditMode}
                  className="bg-transparent border-none outline-none uppercase tracking-wider disabled:cursor-default"
                  placeholder="添加地点"
                />
              </div>
            </div>

            {/* Title */}
            <div>
              <input
                type="text"
                value={script.title}
                onChange={(e) => setScript(s => ({...s, title: e.target.value}))}
                disabled={!isEditMode}
                className="w-full bg-transparent border-none outline-none font-serif text-5xl md:text-7xl text-black leading-[1.1] tracking-tight disabled:cursor-default"
                placeholder="为你的旅程命名"
              />
            </div>

            {/* Subtitle / Intro */}
            <p className="text-xl md:text-2xl text-black/60 leading-relaxed max-w-3xl font-light">
              {script.blocks.length} 个瞬间，一个故事
            </p>

            {/* Divider */}
            <div className="w-24 h-px bg-black/20" />
          </div>
        </section>

        {/* Story Blocks - Static Grid Layout */}
        <section className="max-w-7xl mx-auto px-6 md:px-12 space-y-24 md:space-y-32 pb-32">
          {script.blocks.map((block, index) => (
            <article 
              key={block.id}
              id={`chapter-${index + 1}`}
              className={`relative ${activeChapter === block.id ? 'ring-2 ring-black/10 rounded-lg p-4' : ''}`}
              onClick={() => isEditMode && setActiveChapter(block.id)}
            >
              {/* Chapter Number */}
              <div className="flex items-baseline gap-6 mb-8">
                <span className="text-7xl md:text-8xl font-serif text-black/5 select-none">
                  {(index + 1).toString().padStart(2, '0')}
                </span>
                {block.mood && (
                  <span className="text-xs tracking-[0.2em] uppercase text-black/30">
                    {block.mood}
                  </span>
                )}
              </div>

              {/* Block Content */}
              <StaticBlockRenderer
                block={block}
                index={index}
                isEditMode={isEditMode}
                onUpdate={handleUpdateBlock}
              />
            </article>
          ))}
        </section>

        {/* Ending Section */}
        <section className="max-w-5xl mx-auto px-6 md:px-12 py-24 md:py-32 border-t border-black/10">
          <div className="text-center space-y-8">
            <div className="inline-block">
              <div className="w-16 h-px bg-black/20 mx-auto mb-8" />
              <p className="text-6xl md:text-7xl font-serif text-black tracking-wider">
                —
              </p>
              <div className="w-16 h-px bg-black/20 mx-auto mt-8" />
            </div>
            
            <p className="text-lg md:text-xl text-black/40 font-light italic">
              旅行的意义，不在于抵达，而在于沿途的风景
            </p>
            
            <div className="pt-12">
              <Link 
                href="/memories/upload"
                className="inline-flex items-center gap-2 text-black hover:text-black/60 transition-colors group"
              >
                <span className="text-sm tracking-wider uppercase">创建新旅程</span>
                <ArrowLeft size={16} className="rotate-180 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-black/5 py-12">
          <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
            <p className="text-xs text-black/30 tracking-wide">
              Created with Orbit Journey · {getCurrentDate()}
            </p>
          </div>
        </footer>
      </main>

      {/* Chapter Navigation - Side TOC */}
      {script.blocks.length > 3 && (
        <nav className="hidden lg:block fixed right-8 top-1/2 -translate-y-1/2 space-y-3">
          {script.blocks.map((block, index) => (
            <button
              key={block.id}
              onClick={() => {
                document.getElementById(`chapter-${index + 1}`)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="block w-1 h-1 rounded-full bg-black/20 hover:bg-black/60 hover:w-2 hover:h-2 transition-all"
              title={`第 ${index + 1} 章`}
            />
          ))}
        </nav>
      )}
    </div>
  );
}
