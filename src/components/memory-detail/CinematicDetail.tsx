'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { MapPin, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CarouselItem, MemoryVisibility } from '@/types/memory';
import type { DirectorScript, StoryBlock, ChapterDividerStyle } from '@/types/cinematic';
import { StaticBlockRenderer } from '@/components/cinematic/StaticBlockRenderer';
import '@/app/(main)/memories/cinematic/cinematic.css';
import { MemoryDetailHeader } from '@/components/memory-detail/MemoryDetailHeader';
import { useDayNightTheme } from '@/hooks/useDayNightTheme';
import { useOptionalAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { saveMemory, updateMemory } from '@/lib/storage';
import { directorScriptToCarouselItem } from '@/lib/upload-to-memory';
import { saveCinematicScript, saveLocalCinematic, updateLocalCinematic } from '@/lib/cinematic-storage';
import { MemoryService } from '@/lib/db/services/memory-service';

interface CinematicDetailProps {
  memory: CarouselItem;
  script: DirectorScript | null;
  onBack: () => void;
  isOwner?: boolean;
}

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

export function CinematicDetail({ memory, script: initialScript, onBack, isOwner = false }: CinematicDetailProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const defaultScript = useMemo(() => buildDefaultScript(t), [t]);
  const [script, setScript] = useState<DirectorScript>(initialScript || defaultScript);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isDeleting, setIsDeleting] = useState(false);
  const [visibility, setVisibility] = useState<MemoryVisibility>(memory.visibility ?? 'private');

  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;
  const isDark = useDayNightTheme() === 'dark';

  // Keep script in sync with props so second visit / async load shows correct content (fix "second click loses details")
  const prevMemoryIdRef = useRef(memory.id);
  const hasSyncedScriptRef = useRef(false);
  useEffect(() => {
    if (memory.id !== prevMemoryIdRef.current) {
      prevMemoryIdRef.current = memory.id;
      hasSyncedScriptRef.current = false;
    }
    if (initialScript != null && initialScript.blocks?.length && !hasSyncedScriptRef.current) {
      setScript(initialScript);
      hasSyncedScriptRef.current = true;
    }
  }, [memory.id, initialScript]);

  useEffect(() => {
    setVisibility(memory.visibility ?? 'private');
  }, [memory.visibility]);

  const handleVisibilityChange = useCallback(
    async (v: MemoryVisibility) => {
      setVisibility(v);
      if (!userId) return;
      await updateMemory(userId, memory.id, { visibility: v });
    },
    [userId, memory.id]
  );

  const handleUpdateBlock = (id: string, updates: Partial<StoryBlock>) => {
    setScript(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  };

  const handleSaveToMemory = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const carouselInput = directorScriptToCarouselItem(script);
      // Update existing memory (detail view) so we don't create duplicates
      if (memory.id) {
        if (userId) {
          const { error } = await updateMemory(userId, memory.id, {
            ...carouselInput,
            cinematicScriptJson: JSON.stringify(script),
          });
          if (error) {
            setSaveStatus('error');
            return;
          }
          saveCinematicScript(memory.id, script);
        } else {
          updateLocalCinematic(memory.id, { ...carouselInput, id: memory.id }, script);
        }
      } else if (userId) {
        const { data, error } = await saveMemory(userId, carouselInput);
        if (error) {
          setSaveStatus('error');
          return;
        }
        if (data?.id) {
          saveCinematicScript(data.id, script);
          await updateMemory(userId, data.id, { cinematicScriptJson: JSON.stringify(script) });
        }
      } else {
        const tempId = `cinematic-${Date.now()}`;
        saveLocalCinematic({ ...carouselInput, id: tempId }, script);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [script, userId, memory.id]);

  const localeTag = locale === 'zh-Hans' ? 'zh-Hans' : locale === 'ja' ? 'ja' : locale === 'es' ? 'es' : 'en';
  const getCurrentDate = () =>
    new Date().toLocaleDateString(localeTag, { year: 'numeric', month: 'long', day: 'numeric' });
  const displayDate = script.date?.trim() || getCurrentDate();
  const endingQuote = script.endingQuote?.trim() || t('cinematic.defaultEndingQuote');
  const endingCtaLabel = script.endingCtaLabel?.trim() || t('cinematic.createNewJourney');
  const endingCtaHref = script.endingCtaHref?.trim() || '/memories/upload';
  const chapterStyle: ChapterDividerStyle = script.chapterDividerStyle ?? 'number_mood';

  const handleDelete = async () => {
    const confirmed = confirm(t('memory.deleteConfirm'));
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const { error } = await MemoryService.deleteMemory(memory.id);
      if (error) {
        alert(`${t('memory.deleteFailed')} ${error}`);
        setIsDeleting(false);
        return;
      }
      
      router.push('/');
    } catch (e) {
      console.error('Failed to delete memory:', e);
      alert(t('memory.deleteFailed'));
      setIsDeleting(false);
    }
  };

  const moreMenuClass = 'w-full px-4 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-gray-100';
  const moreMenuClassDanger = 'w-full px-4 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden font-sans transition-colors duration-300 flex flex-col ${isDark ? 'dark bg-[#050505] text-white' : 'bg-white text-black'}`}>
      <MemoryDetailHeader
        title={memory.title || script.title || undefined}
        onBack={onBack}
        visibility={visibility}
        onVisibilityChange={isOwner ? handleVisibilityChange : undefined}
        moreMenu={
          <>
            <button type="button" onClick={() => setIsEditMode(true)} className={moreMenuClass} role="menuitem">{t('common.edit')}</button>
            <button
              type="button"
              onClick={handleSaveToMemory}
              disabled={saveStatus === 'saving'}
              className={moreMenuClass}
              role="menuitem"
            >
              {saveStatus === 'saving' ? t('cinematic.saving') : saveStatus === 'saved' ? t('cinematic.saved') : t('common.save')}
            </button>
            <button type="button" className={moreMenuClass} role="menuitem">{t('common.download')}</button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className={moreMenuClassDanger}
              role="menuitem"
            >
              {isDeleting ? t('memory.deleting') : t('memory.delete')}
            </button>
          </>
        }
      />

      {/* Main Content — 1:1 structure with AI generate page (single scroll like generate) */}
      <main className="pt-[44px] flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {/* Hero Title Section — same as generate: max-w-5xl, py-16 md:py-24, space-y-8 */}
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

        {/* Story Blocks — same as generate: max-w-7xl, space-y-24 md:space-y-32, pb-32 */}
        <section className="max-w-7xl mx-auto px-6 md:px-12 space-y-24 md:space-y-32 pb-32">
          {script.blocks.map((block, index) => (
            <article
              key={block.id}
              id={`chapter-${index + 1}`}
              className={`relative ${activeChapter === block.id ? (isDark ? 'ring-2 ring-white/10 rounded-lg p-4' : 'ring-2 ring-black/10 rounded-lg p-4') : ''}`}
              onClick={() => isEditMode && setActiveChapter(block.id)}
            >
              {/* Chapter divider: 3 templates — same classes as generate (gap-6 mb-8, text-7xl md:text-8xl) */}
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

        {/* Ending Section — same as generate: max-w-5xl, py-24 md:py-32, space-y-8, text-lg md:text-xl, pt-12, ArrowLeft */}
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

        {/* Footer — same as generate */}
        <footer className={`border-t py-12 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
            <p className={`text-xs tracking-wide ${isDark ? 'text-white/30' : 'text-black/30'}`}>
              Created with Orbit Journey · {getCurrentDate()}
            </p>
          </div>
        </footer>
      </main>

      {/* Chapter nav dots — same as generate when blocks > 3 */}
      {script.blocks.length > 3 && (
        <nav className="no-print hidden lg:block fixed right-8 top-1/2 -translate-y-1/2 space-y-3 z-10">
          {script.blocks.map((block, index) => (
            <button
              key={block.id}
              type="button"
              onClick={() => document.getElementById(`chapter-${index + 1}`)?.scrollIntoView({ behavior: 'smooth' })}
              className={`block w-1 h-1 rounded-full transition-all hover:w-2 hover:h-2 ${isDark ? 'bg-white/20 hover:bg-white/60' : 'bg-black/20 hover:bg-black/60'}`}
              title={`${t('cinematic.moments')} ${index + 1}`}
            />
          ))}
        </nav>
      )}
    </div>
  );
}
