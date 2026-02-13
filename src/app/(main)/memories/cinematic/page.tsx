'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Calendar, Edit2, Share2, Download, Save, Check, ArrowLeft } from 'lucide-react';
import { DirectorScript, StoryBlock, type ChapterDividerStyle } from '@/types/cinematic';
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
  const getCurrentDate = () =>
    new Date().toLocaleDateString(localeTag, { year: 'numeric', month: 'long', day: 'numeric' });

  const displayDate = script.date?.trim() || getCurrentDate();
  const endingQuote = script.endingQuote?.trim() || t('cinematic.defaultEndingQuote');
  const endingCtaLabel = script.endingCtaLabel?.trim() || t('cinematic.createNewJourney');
  const endingCtaHref = script.endingCtaHref?.trim() || '/memories/upload';
  const chapterStyle: ChapterDividerStyle = script.chapterDividerStyle ?? 'number_mood';

  const isDark = useDayNightTheme() === 'dark';

  /** Roman numeral for chapter index (1-based). */
  function toRoman(n: number): string {
    const map: [number, string][] = [
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
    ];
    let s = '';
    for (const [val, sym] of map) {
      while (n >= val) {
        s += sym;
        n -= val;
      }
    }
    return s;
  }

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
        {/* Hero Title Section — fixed structure, configurable date + location */}
        <section className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="space-y-8">
            <div className={`flex flex-wrap items-center gap-6 text-sm ${isDark ? 'text-white/50' : 'text-black/50'}`}>
              <div className="flex items-center gap-2">
                <Calendar size={16} aria-hidden />
                {isEditMode ? (
                  <input
                    type="text"
                    value={script.date ?? ''}
                    onChange={(e) => setScript(s => ({ ...s, date: e.target.value }))}
                    placeholder={getCurrentDate()}
                    className={`bg-transparent border-none outline-none disabled:cursor-default w-40 ${isDark ? 'text-white placeholder:text-white/30' : ''}`}
                  />
                ) : (
                  <span>{displayDate}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} aria-hidden />
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
            {isEditMode && (
              <div className={`pt-4 flex flex-wrap items-center gap-3 text-sm ${isDark ? 'text-white/50' : 'text-black/50'}`}>
                <span>{t('cinematic.chapterStyleLabel')}</span>
                <select
                  value={script.chapterDividerStyle ?? 'number_mood'}
                  onChange={(e) => setScript(s => ({ ...s, chapterDividerStyle: e.target.value as ChapterDividerStyle }))}
                  className={`bg-transparent border rounded px-2 py-1 ${isDark ? 'border-white/20 text-white' : 'border-black/20 text-black'}`}
                >
                  <option value="number_mood">{t('cinematic.chapterStyleNumberMood')}</option>
                  <option value="minimal_line">{t('cinematic.chapterStyleMinimalLine')}</option>
                  <option value="roman_quote">{t('cinematic.chapterStyleRomanQuote')}</option>
                </select>
              </div>
            )}
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
              {/* Chapter divider: 3 templates */}
              {chapterStyle === 'number_mood' && (
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
              )}
              {chapterStyle === 'minimal_line' && (
                <div className={`chapter-divider-minimal mb-8 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                  <div className={`chapter-line ${isDark ? 'bg-white/20' : 'bg-black/20'}`} />
                  <span className="chapter-num">{(index + 1).toString().padStart(2, '0')}</span>
                </div>
              )}
              {chapterStyle === 'roman_quote' && (
                <div className={`chapter-divider-roman mb-8 ${isDark ? 'text-white/50' : 'text-black/50'}`}>
                  <span className="chapter-roman">{toRoman(index + 1)}</span>
                  <div className={`chapter-rule ${isDark ? 'bg-white/25' : 'bg-black/20'}`} />
                  {block.mood && (
                    <span className={`block mt-2 text-xs tracking-[0.2em] uppercase ${isDark ? 'text-white/30' : 'text-black/30'}`}>
                      {block.mood}
                    </span>
                  )}
                </div>
              )}

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

        {/* Ending Section — configurable quote + CTA */}
        <section className={`max-w-5xl mx-auto px-6 md:px-12 py-24 md:py-32 border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
          <div className="text-center space-y-8">
            {isEditMode ? (
              <textarea
                value={script.endingQuote ?? ''}
                onChange={(e) => setScript(s => ({ ...s, endingQuote: e.target.value }))}
                placeholder={t('cinematic.defaultEndingQuote')}
                rows={2}
                className={`w-full max-w-2xl mx-auto text-center bg-transparent border-none outline-none text-lg md:text-xl font-light italic resize-none ${isDark ? 'text-white/40 placeholder:text-white/30' : 'text-black/40 placeholder:text-black/30'}`}
              />
            ) : (
              <p className={`text-lg md:text-xl font-light italic ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                {endingQuote}
              </p>
            )}
            <div className="pt-12">
              {isEditMode ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <input
                    type="text"
                    value={script.endingCtaLabel ?? ''}
                    onChange={(e) => setScript(s => ({ ...s, endingCtaLabel: e.target.value }))}
                    placeholder={t('cinematic.createNewJourney')}
                    className={`bg-transparent border-none outline-none text-sm tracking-wider uppercase text-center ${isDark ? 'text-white placeholder:text-white/50' : 'text-black placeholder:text-black/50'}`}
                  />
                  <input
                    type="text"
                    value={script.endingCtaHref ?? ''}
                    onChange={(e) => setScript(s => ({ ...s, endingCtaHref: e.target.value }))}
                    placeholder="/memories/upload"
                    className={`bg-transparent border-none outline-none text-sm text-center max-w-xs ${isDark ? 'text-white/60 placeholder:text-white/30' : 'text-black/60 placeholder:text-black/30'}`}
                  />
                </div>
              ) : (
                <Link
                  href={endingCtaHref}
                  className={`inline-flex items-center gap-2 transition-colors group ${isDark ? 'text-white hover:text-white/60' : 'text-black hover:text-black/60'}`}
                >
                  <span className="text-sm tracking-wider uppercase">{endingCtaLabel}</span>
                  <ArrowLeft size={16} className="rotate-180 group-hover:translate-x-1 transition-transform" aria-hidden />
                </Link>
              )}
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
