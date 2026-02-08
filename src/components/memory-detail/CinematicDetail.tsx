'use client';

import { useState, useCallback } from 'react';
import { MapPin, Calendar, Edit2, ArrowLeft, Share2, Download, Save, Check } from 'lucide-react';
import type { CarouselItem } from '@/types/memory';
import type { DirectorScript, StoryBlock } from '@/types/cinematic';
import { StaticBlockRenderer } from '@/components/cinematic/StaticBlockRenderer';
import { useDayNightTheme } from '@/hooks/useDayNightTheme';
import { useOptionalAuth } from '@/lib/auth';
import { saveMemory } from '@/lib/storage';
import { directorScriptToCarouselItem } from '@/lib/upload-to-memory';
import { saveCinematicScript, saveLocalCinematic } from '@/lib/cinematic-storage';

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
  const [script, setScript] = useState<DirectorScript>(initialScript || DEFAULT_SCRIPT);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;
  const isDark = useDayNightTheme() === 'dark';

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

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden font-sans transition-colors duration-300 ${
      isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'
    }`}>
      {/* Header */}
      <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 transition-colors ${
        isDark ? 'bg-black/80 backdrop-blur-xl' : 'bg-white/80 backdrop-blur-xl border-b border-gray-100'
      }`}>
        <button
          type="button"
          onClick={onBack}
          className={`flex items-center gap-2 rounded-full px-3 py-2 transition-colors ${
            isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
          }`}
          aria-label="返回"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">返回</span>
        </button>

        <div className="flex items-center gap-2">
          {!isEditMode && (
            <button
              type="button"
              onClick={() => setIsEditMode(true)}
              className={`flex items-center gap-1 rounded-full px-3 py-2 text-sm transition-colors ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
              }`}
              aria-label="编辑"
            >
              <Edit2 size={16} />
              <span>编辑</span>
            </button>
          )}
          {isEditMode && (
            <button
              type="button"
              onClick={handleSaveToMemory}
              disabled={saveStatus === 'saving'}
              className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                saveStatus === 'saved'
                  ? 'bg-green-500 text-white'
                  : isDark
                    ? 'bg-white text-black hover:bg-gray-200'
                    : 'bg-black text-white hover:bg-gray-800'
              }`}
              aria-label="保存到回忆"
            >
              {saveStatus === 'saving' && <Save size={16} className="animate-pulse" />}
              {saveStatus === 'saved' && <Check size={16} />}
              {saveStatus === 'idle' && <Save size={16} />}
              <span>{saveStatus === 'saved' ? '已保存' : '保存'}</span>
            </button>
          )}
          <button className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`} aria-label="分享">
            <Share2 size={18} />
          </button>
          <button className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`} aria-label="下载">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Meta Info */}
      <div className="pt-16 px-4 pb-4">
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
      <div className="no-scrollbar h-[calc(100vh-140px)] overflow-y-auto">
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
