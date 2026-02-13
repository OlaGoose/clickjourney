'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { MapPin, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { CarouselItem, MemoryVisibility } from '@/types/memory';
import type { DirectorScript, StoryBlock } from '@/types/cinematic';
import { StaticBlockRenderer } from '@/components/cinematic/StaticBlockRenderer';
import '@/app/(main)/memories/cinematic/cinematic.css';
import { MemoryDetailHeader } from '@/components/memory-detail/MemoryDetailHeader';
import { useDayNightTheme } from '@/hooks/useDayNightTheme';
import { useOptionalAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { saveMemory, updateMemory } from '@/lib/storage';
import { directorScriptToCarouselItem } from '@/lib/upload-to-memory';
import { saveCinematicScript, saveLocalCinematic } from '@/lib/cinematic-storage';
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
      if (userId) {
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
  }, [script, userId]);

  const getCurrentDate = () => {
    const localeTag = locale === 'zh-Hans' ? 'zh-Hans' : locale === 'ja' ? 'ja' : locale === 'es' ? 'es' : 'en';
    return new Date().toLocaleDateString(localeTag, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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

      {/* Meta Info */}
      <div className="pt-4 px-4 pb-4 flex-shrink-0">
        {isEditMode ? (
          <div className="space-y-2">
            <input
              type="text"
              value={script.location}
              onChange={(e) => setScript(s => ({ ...s, location: e.target.value }))}
              className={`w-full bg-transparent text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} border-b ${isDark ? 'border-white/10' : 'border-black/10'} focus:outline-none focus:border-current pb-1`}
              placeholder={t('cinematic.location')}
            />
            <input
              type="text"
              value={script.title}
              onChange={(e) => setScript(s => ({ ...s, title: e.target.value }))}
              className={`w-full bg-transparent text-2xl font-bold border-b ${isDark ? 'border-white/10' : 'border-black/10'} focus:outline-none focus:border-current pb-2`}
              placeholder={t('common.title')}
            />
          </div>
        ) : (
          <>
            <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {script.location}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {getCurrentDate()}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold">{script.title}</h1>
          </>
        )}
      </div>

      {/* Story Blocks */}
      <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto">
        {script.blocks.map((block, index) => (
          <StaticBlockRenderer
            key={block.id}
            block={block}
            index={index}
            isEditMode={isEditMode}
            onUpdate={handleUpdateBlock}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  );
}
