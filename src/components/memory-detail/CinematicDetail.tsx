'use client';

import { useState, useCallback } from 'react';
import { MapPin, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { CarouselItem } from '@/types/memory';
import type { DirectorScript, StoryBlock } from '@/types/cinematic';
import { StaticBlockRenderer } from '@/components/cinematic/StaticBlockRenderer';
import { MemoryDetailHeader } from '@/components/memory-detail/MemoryDetailHeader';
import { useDayNightTheme } from '@/hooks/useDayNightTheme';
import { useOptionalAuth } from '@/lib/auth';
import { saveMemory } from '@/lib/storage';
import { directorScriptToCarouselItem } from '@/lib/upload-to-memory';
import { saveCinematicScript, saveLocalCinematic } from '@/lib/cinematic-storage';
import { MemoryService } from '@/lib/db/services/memory-service';

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

interface CinematicDetailProps {
  memory: CarouselItem;
  script: DirectorScript | null;
  onBack: () => void;
}

export function CinematicDetail({ memory, script: initialScript, onBack }: CinematicDetailProps) {
  const router = useRouter();
  const [script, setScript] = useState<DirectorScript>(initialScript || DEFAULT_SCRIPT);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isDeleting, setIsDeleting] = useState(false);

  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;
  const isDark = useDayNightTheme() === 'dark';

  const getShareUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/memories/${memory.id}?share=1`;
  }, [memory.id]);

  const handleShare = useCallback(async () => {
    const shareUrl = getShareUrl();
    const shareTitle = script.title || '回忆';
    const shareData = { title: shareTitle, url: shareUrl };
    if (typeof navigator !== 'undefined' && navigator.share) {
      const canShare = typeof navigator.canShare === 'function' ? navigator.canShare(shareData) : true;
      if (canShare) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      if (typeof window !== 'undefined' && window.open) window.open(shareUrl, '_blank', 'noopener');
    }
  }, [getShareUrl, script.title]);

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
        if (data?.id) saveCinematicScript(data.id, script);
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
    return new Date().toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleDelete = async () => {
    const confirmed = confirm('确定要删除这个回忆吗？此操作无法撤销。');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const { error } = await MemoryService.deleteMemory(memory.id);
      if (error) {
        alert(`删除失败：${error}`);
        setIsDeleting(false);
        return;
      }
      
      router.push('/');
    } catch (e) {
      console.error('Failed to delete memory:', e);
      alert('删除失败，请重试');
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
        onBack={onBack}
        onShare={handleShare}
        moreMenu={
          <>
            <button type="button" onClick={() => setIsEditMode(true)} className={moreMenuClass} role="menuitem">编辑</button>
            <button
              type="button"
              onClick={handleSaveToMemory}
              disabled={saveStatus === 'saving'}
              className={moreMenuClass}
              role="menuitem"
            >
              {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存' : '保存'}
            </button>
            <button type="button" className={moreMenuClass} role="menuitem">下载</button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className={moreMenuClassDanger}
              role="menuitem"
            >
              {isDeleting ? '删除中...' : '删除'}
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
              placeholder="地点"
            />
            <input
              type="text"
              value={script.title}
              onChange={(e) => setScript(s => ({ ...s, title: e.target.value }))}
              className={`w-full bg-transparent text-2xl font-bold border-b ${isDark ? 'border-white/10' : 'border-black/10'} focus:outline-none focus:border-current pb-2`}
              placeholder="标题"
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
