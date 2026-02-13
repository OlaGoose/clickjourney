'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { MapPin, Calendar } from 'lucide-react';
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
    <div className={`fixed inset-0 z-50 overflow-hidden font-sans transition-colors duration-300 flex flex-col ${
      isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'
    }`}>
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

      {/* Hero: date, location, title — match generate view */}
      <div className="pt-4 px-4 pb-4 flex-shrink-0 max-w-5xl mx-auto w-full">
        {isEditMode ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-4">
              <span className={`flex items-center gap-1 text-sm ${isDark ? 'text-white/50' : 'text-black/50'}`}>
                <Calendar size={14} />
                <input
                  type="text"
                  value={script.date ?? ''}
                  onChange={(e) => setScript(s => ({ ...s, date: e.target.value }))}
                  placeholder={getCurrentDate()}
                  className={`bg-transparent border-none outline-none w-40 ${isDark ? 'text-white placeholder:text-white/30' : ''}`}
                />
              </span>
              <span className={`flex items-center gap-1 text-sm ${isDark ? 'text-white/50' : 'text-black/50'}`}>
                <MapPin size={14} />
                <input
                  type="text"
                  value={script.location}
                  onChange={(e) => setScript(s => ({ ...s, location: e.target.value }))}
                  placeholder={t('cinematic.location')}
                  className={`bg-transparent border-none outline-none uppercase tracking-wider ${isDark ? 'text-white placeholder:text-white/30' : ''}`}
                />
              </span>
            </div>
            <input
              type="text"
              value={script.title}
              onChange={(e) => setScript(s => ({ ...s, title: e.target.value }))}
              className={`w-full bg-transparent text-2xl font-bold border-b ${isDark ? 'border-white/10' : 'border-black/10'} focus:outline-none focus:border-current pb-2`}
              placeholder={t('common.title')}
            />
            <div className={`flex flex-wrap items-center gap-3 text-sm ${isDark ? 'text-white/50' : 'text-black/50'}`}>
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
          </div>
        ) : (
          <>
            <div className={`flex flex-wrap items-center gap-4 text-sm ${isDark ? 'text-white/50' : 'text-black/50'}`}>
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {displayDate}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {script.location}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold">{script.title}</h1>
            <p className={`mt-1 text-sm ${isDark ? 'text-white/60' : 'text-black/60'}`}>
              {script.blocks.length} {t('cinematic.moments')}, {t('cinematic.oneStory')}
            </p>
            <div className={`w-24 h-px mt-2 ${isDark ? 'bg-white/20' : 'bg-black/20'}`} />
          </>
        )}
      </div>

      {/* Story Blocks with chapter dividers — same as generate view */}
      <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto px-4 pb-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {script.blocks.map((block, index) => (
            <article key={block.id} className="relative">
              {/* Chapter divider: 3 templates */}
              {chapterStyle === 'number_mood' && (
                <div className="flex items-baseline gap-4 mb-6">
                  <span className={`text-5xl md:text-6xl font-serif font-bold select-none ${isDark ? 'chapter-number-silver' : 'text-black/20'}`}>
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
                <div className={`chapter-divider-minimal mb-6 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                  <div className={`chapter-line ${isDark ? 'bg-white/20' : 'bg-black/20'}`} />
                  <span className="chapter-num">{(index + 1).toString().padStart(2, '0')}</span>
                </div>
              )}
              {chapterStyle === 'roman_quote' && (
                <div className={`chapter-divider-roman mb-6 ${isDark ? 'text-white/50' : 'text-black/50'}`}>
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
        </div>

        {/* Ending section — match generate view */}
        <section className={`max-w-2xl mx-auto pt-16 pb-8 border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
          <div className="text-center space-y-6">
            {isEditMode ? (
              <>
                <textarea
                  value={script.endingQuote ?? ''}
                  onChange={(e) => setScript(s => ({ ...s, endingQuote: e.target.value }))}
                  placeholder={t('cinematic.defaultEndingQuote')}
                  rows={2}
                  className={`w-full mx-auto text-center bg-transparent border-none outline-none text-base font-light italic resize-none ${isDark ? 'text-white/40 placeholder:text-white/30' : 'text-black/40 placeholder:text-black/30'}`}
                />
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
              </>
            ) : (
              <>
                <p className={`text-base font-light italic ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                  {endingQuote}
                </p>
                <Link
                  href={endingCtaHref}
                  className={`inline-flex items-center gap-2 transition-colors group ${isDark ? 'text-white hover:text-white/60' : 'text-black hover:text-black/60'}`}
                >
                  <span className="text-sm tracking-wider uppercase">{endingCtaLabel}</span>
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
