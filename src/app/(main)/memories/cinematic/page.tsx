'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Edit2, ArrowLeft, Share2, Download, Save, Check } from 'lucide-react';
import Link from 'next/link';
import { DirectorScript, StoryBlock } from '@/types/cinematic';
import { StaticBlockRenderer } from '@/components/cinematic/StaticBlockRenderer';
import { useDayNightTheme } from '@/hooks/useDayNightTheme';
import { useOptionalAuth } from '@/lib/auth';
import { saveMemory } from '@/lib/storage';
import { directorScriptToCarouselItem } from '@/lib/upload-to-memory';
import { saveCinematicScript, saveLocalCinematic } from '@/lib/cinematic-storage';
import './cinematic.css';

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
  const router = useRouter();
  const [script, setScript] = useState<DirectorScript>(DEFAULT_SCRIPT);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;

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

  /** Save current script to memory carousel (recall cards on home). */
  const handleSaveToMemory = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const carouselInput = directorScriptToCarouselItem(script);
      if (userId) {
        const { data, error } = await saveMemory(userId, carouselInput);
        if (error) {
          setSaveStatus('error');
          return;
        }
        if (data?.id) saveCinematicScript(data.id, script);
      } else {
        const tempId = `cinematic-${Date.now()}`;
        saveLocalCinematic({ ...carouselInput, id: tempId }, script);
      }
      setSaveStatus('saved');
      router.push('/');
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [script, userId]);

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const isDark = useDayNightTheme() === 'dark';

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDark ? 'bg-[#050505]' : 'bg-white'}`}>
        <div className="text-center space-y-4">
          <div className={`w-12 h-12 border-2 rounded-full animate-spin mx-auto ${isDark ? 'border-white/20 border-t-white' : 'border-black/20 border-t-black'}`} />
          <p className={`text-sm tracking-wide ${isDark ? 'text-white/40' : 'text-black/40'}`}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'dark bg-[#050505]' : 'bg-white'}`}>
      {/* Fixed Header — light: Airbnb style; dark: Apple TV style */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b transition-colors duration-300 ${
          isDark ? 'bg-black/95 border-white/10' : 'bg-white/95 border-black/5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Link
            href="/memories/upload"
            className={`flex items-center gap-2 transition-colors group ${
              isDark ? 'text-white/70 hover:text-white' : 'text-black/70 hover:text-black'
            }`}
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">返回</span>
          </Link>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={handleSaveToMemory}
              disabled={saveStatus === 'saving'}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                saveStatus === 'saved'
                  ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500/20 text-emerald-700'
                  : saveStatus === 'saving'
                    ? isDark ? 'bg-white/10 text-white/50 cursor-wait' : 'bg-black/5 text-black/50 cursor-wait'
                    : isDark
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-black/5 text-black hover:bg-black/10'
              }`}
              title="保存到回忆"
              aria-label="保存到回忆"
            >
              {saveStatus === 'saving' ? (
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : saveStatus === 'saved' ? (
                <Check size={16} />
              ) : (
                <Save size={16} />
              )}
              <span className="hidden sm:inline">
                {saveStatus === 'saved' ? '已保存' : saveStatus === 'saving' ? '保存中…' : saveStatus === 'error' ? '保存失败' : '保存'}
              </span>
            </button>

            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isEditMode
                  ? 'bg-white text-black dark:bg-white dark:text-black'
                  : isDark
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-black/5 text-black hover:bg-black/10'
              }`}
            >
              <Edit2 size={16} />
              {isEditMode ? '完成编辑' : '编辑'}
            </button>

            <button className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`} title="分享" aria-label="分享">
              <Share2 size={20} className={isDark ? 'text-white/70' : 'text-black/70'} />
            </button>

            <button className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`} title="下载" aria-label="下载">
              <Download size={20} className={isDark ? 'text-white/70' : 'text-black/70'} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        {/* Hero Title Section - Magazine Style */}
        <section className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="space-y-8">
            <div className={`flex flex-wrap items-center gap-6 text-sm ${isDark ? 'text-white/50' : 'text-black/50'}`}>
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{getCurrentDate()}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <input
                  type="text"
                  value={script.location}
                  onChange={(e) => setScript(s => ({ ...s, location: e.target.value }))}
                  disabled={!isEditMode}
                  className={`bg-transparent border-none outline-none uppercase tracking-wider disabled:cursor-default ${isDark ? 'text-white placeholder:text-white/30' : ''}`}
                  placeholder="添加地点"
                />
              </div>
            </div>

            <div>
              <input
                type="text"
                value={script.title}
                onChange={(e) => setScript(s => ({ ...s, title: e.target.value }))}
                disabled={!isEditMode}
                className={`w-full bg-transparent border-none outline-none font-serif text-5xl md:text-7xl font-semibold leading-[1.08] tracking-[-0.015em] disabled:cursor-default ${isDark ? 'text-white placeholder:text-white/30' : 'text-black'}`}
                placeholder="为你的旅程命名"
              />
            </div>

            <p className={`text-xl md:text-2xl leading-[1.47] max-w-3xl font-normal ${isDark ? 'text-white/60' : 'text-black/60'}`}>
              {script.blocks.length} 个瞬间，一个故事
            </p>

            <div className={`w-24 h-px ${isDark ? 'bg-white/20' : 'bg-black/20'}`} />
          </div>
        </section>

        {/* Story Blocks - Static Grid Layout */}
        <section className="max-w-7xl mx-auto px-6 md:px-12 space-y-24 md:space-y-32 pb-32">
          {script.blocks.map((block, index) => (
            <article
              key={block.id}
              id={`chapter-${index + 1}`}
              className={`relative ${activeChapter === block.id ? (isDark ? 'ring-2 ring-white/10 rounded-lg p-4' : 'ring-2 ring-black/10 rounded-lg p-4') : ''}`}
              onClick={() => isEditMode && setActiveChapter(block.id)}
            >
              <div className="flex items-baseline gap-6 mb-8">
                <span className="text-7xl md:text-8xl font-serif font-bold select-none chapter-number-silver">
                  {(index + 1).toString().padStart(2, '0')}
                </span>
                {block.mood && (
                  <span className={`text-xs tracking-[0.2em] uppercase ${isDark ? 'text-white/30' : 'text-black/30'}`}>
                    {block.mood}
                  </span>
                )}
              </div>

              <StaticBlockRenderer
                block={block}
                index={index}
                isEditMode={isEditMode}
                onUpdate={handleUpdateBlock}
                isDark={isDark}
              />
            </article>
          ))}
        </section>

        {/* Ending Section */}
        <section className={`max-w-5xl mx-auto px-6 md:px-12 py-24 md:py-32 border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
          <div className="text-center space-y-8">
            <p className={`text-lg md:text-xl font-light italic ${isDark ? 'text-white/40' : 'text-black/40'}`}>
              旅行的意义，不在于抵达，而在于沿途的风景
            </p>
            <div className="pt-12">
              <Link
                href="/memories/upload"
                className={`inline-flex items-center gap-2 transition-colors group ${isDark ? 'text-white hover:text-white/60' : 'text-black hover:text-black/60'}`}
              >
                <span className="text-sm tracking-wider uppercase">创建新旅程</span>
                <ArrowLeft size={16} className="rotate-180 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        <footer className={`border-t py-12 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
            <p className={`text-xs tracking-wide ${isDark ? 'text-white/30' : 'text-black/30'}`}>
              Created with Orbit Journey · {getCurrentDate()}
            </p>
          </div>
        </footer>
      </main>

      {script.blocks.length > 3 && (
        <nav className="hidden lg:block fixed right-8 top-1/2 -translate-y-1/2 space-y-3">
          {script.blocks.map((block, index) => (
            <button
              key={block.id}
              onClick={() => document.getElementById(`chapter-${index + 1}`)?.scrollIntoView({ behavior: 'smooth' })}
              className={`block w-1 h-1 rounded-full transition-all hover:w-2 hover:h-2 ${isDark ? 'bg-white/20 hover:bg-white/60' : 'bg-black/20 hover:bg-black/60'}`}
              title={`第 ${index + 1} 章`}
            />
          ))}
        </nav>
      )}
    </div>
  );
}
