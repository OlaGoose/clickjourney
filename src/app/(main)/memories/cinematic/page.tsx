'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Calendar, Edit2, Share2, Download, Save, Check, ArrowLeft } from 'lucide-react';
import { DirectorScript, StoryBlock } from '@/types/cinematic';
import { StaticBlockRenderer } from '@/components/cinematic/StaticBlockRenderer';
import { NotionTopbar, NotionTopbarButton } from '@/components/NotionTopbar';
import { useDayNightTheme } from '@/hooks/useDayNightTheme';
import { useOptionalAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { saveMemory } from '@/lib/storage';
import { directorScriptToCarouselItem } from '@/lib/upload-to-memory';
import { saveCinematicScript, saveLocalCinematic } from '@/lib/cinematic-storage';
import './cinematic.css';

function buildDefaultScript(t: (key: import('@/lib/i18n/types').MessageKey) => string): DirectorScript {
  return {
    title: t('cinematic.untitledJourney'),
    location: t('cinematic.unknownDestination'),
    blocks: [
      {
        id: '1',
        layout: 'full_bleed',
        image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&h=1200&fit=crop',
        text: t('cinematic.defaultOpeningLine'),
        animation: 'fade_in',
        textPosition: 'center',
        textSize: 'large',
        imageFilter: 'none',
        mood: 'contemplative',
      },
    ],
  };
}

export default function CinematicMemoryPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const defaultScript = useMemo(() => buildDefaultScript(t), [t]);
  const [script, setScript] = useState<DirectorScript>(defaultScript);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

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

  const localeTag = locale === 'zh-Hans' ? 'zh-Hans' : locale === 'ja' ? 'ja' : locale === 'es' ? 'es' : 'en';
  const getCurrentDate = () => {
    return new Date().toLocaleDateString(localeTag, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isDark = useDayNightTheme() === 'dark';

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDark ? 'bg-[#050505]' : 'bg-white'}`}>
        <div className="text-center space-y-4">
          <div className={`w-12 h-12 border-2 rounded-full animate-spin mx-auto ${isDark ? 'border-white/20 border-t-white' : 'border-black/20 border-t-black'}`} />
          <p className={`text-sm tracking-wide ${isDark ? 'text-white/40' : 'text-black/40'}`}>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'dark bg-[#050505]' : 'bg-white'}`}>
      {/* Notion-style fixed header */}
      <NotionTopbar
        onBack={() => router.push('/memories/upload')}
        title={script.title || t('cinematic.untitledJourney')}
        rightActions={
          <>
            <NotionTopbarButton onClick={() => {}} aria-label={t('cinematic.share')}>
              <Share2 className="h-[26px] w-[26px] shrink-0" />
            </NotionTopbarButton>
            <div className="relative" ref={actionsRef}>
              <NotionTopbarButton
                onClick={() => setActionsOpen((o) => !o)}
                aria-label={t('cinematic.actions')}
                aria-expanded={actionsOpen}
                aria-haspopup="dialog"
              >
                <svg viewBox="0 0 20 20" className="h-[26px] w-[26px] shrink-0" fill="currentColor" aria-hidden>
                  <path d="M4 11.375a1.375 1.375 0 1 0 0-2.75 1.375 1.375 0 0 0 0 2.75m6 0a1.375 1.375 0 1 0 0-2.75 1.375 1.375 0 0 0 0 2.75m6 0a1.375 1.375 0 1 0 0-2.75 1.375 1.375 0 0 0 0 2.75" />
                </svg>
              </NotionTopbarButton>
              {actionsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden
                    onClick={() => setActionsOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg bg-[#2d2d30] py-1 shadow-xl"
                    role="dialog"
                    aria-label={t('cinematic.actionsMenu')}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActionsOpen(false);
                        handleSaveToMemory();
                      }}
                      disabled={saveStatus === 'saving'}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/90 hover:bg-white/[0.08] disabled:opacity-50"
                    >
                      {saveStatus === 'saving' ? (
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      ) : saveStatus === 'saved' ? (
                        <Check size={16} />
                      ) : (
                        <Save size={16} />
                      )}
                      {saveStatus === 'saved' ? t('cinematic.saved') : saveStatus === 'saving' ? t('cinematic.saving') : t('cinematic.saveToMemory')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionsOpen(false);
                        setIsEditMode((e) => !e);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/90 hover:bg-white/[0.08]"
                    >
                      <Edit2 size={16} />
                      {isEditMode ? t('cinematic.doneEdit') : t('cinematic.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionsOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/90 hover:bg-white/[0.08]"
                    >
                      <Download size={16} />
                      {t('common.download')}
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="w-1" />
          </>
        }
      />

      {/* Main Content */}
      <main className="pt-[44px]">
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
                  placeholder={t('cinematic.addPlaceholder')}
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
                placeholder={t('cinematic.nameYourJourney')}
              />
            </div>

            <p className={`text-xl md:text-2xl leading-[1.47] max-w-3xl font-normal ${isDark ? 'text-white/60' : 'text-black/60'}`}>
              {script.blocks.length} {t('cinematic.moments')}, {t('cinematic.oneStory')}
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
