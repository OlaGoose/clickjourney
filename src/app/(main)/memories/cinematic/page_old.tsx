'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, Calendar, Edit2, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import Link from 'link';
import { DirectorScript, StoryBlock } from '@/types/cinematic';
import { StaticBlockRenderer } from '@/components/cinematic/StaticBlockRenderer';

// --- Default Data (Fallback) ---

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
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: containerRef });
  
  const [script, setScript] = useState<DirectorScript>(DEFAULT_SCRIPT);
  const [showTools, setShowTools] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load script from sessionStorage (generated from upload page)
  useEffect(() => {
    const loadScript = () => {
      try {
        const storedScript = sessionStorage.getItem('cinematicScript');
        if (storedScript) {
          const parsedScript = JSON.parse(storedScript);
          console.log('[Cinematic] Loaded script from storage:', parsedScript);
          setScript(parsedScript);
          // Clear after loading to prevent stale data
          sessionStorage.removeItem('cinematicScript');
        }
      } catch (error) {
        console.error('[Cinematic] Failed to load script:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Small delay for dramatic effect
    setTimeout(loadScript, 800);
  }, []);

  const handleUpdateBlock = (id: string, updates: Partial<StoryBlock>) => {
    setScript(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  };

  const handleAddNewBlock = (image?: string, text?: string) => {
    const newBlock: StoryBlock = {
      id: Date.now().toString(),
      layout: 'side_by_side',
      image: image || "https://picsum.photos/1200/800",
      text: text || "A new chapter...",
      animation: "fade_in"
    };
    setScript(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
    setSelectedBlockId(newBlock.id);
    setShowTools(true);
    
    // Auto scroll to bottom
    setTimeout(() => {
      containerRef.current?.scrollTo({ 
        top: containerRef.current.scrollHeight, 
        behavior: 'smooth' 
      });
    }, 100);
  };

  const getSelectedBlock = () => {
    if (!selectedBlockId) return null;
    return script.blocks.find(b => b.id === selectedBlockId);
  };

  // Loading state with Apple-style fade-in
  if (isLoading) {
    return (
      <div className="bg-[#050505] min-h-screen text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 mx-auto mb-4 border-2 border-white/20 border-t-white rounded-full"
          />
          <p className="text-white/50 text-sm font-light tracking-wide">
            Preparing your memory...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="bg-[#050505] min-h-screen text-white relative"
    >
      <GlobeIndicator scrollYProgress={scrollYProgress} />

      {/* Hero Title Overlay - Editable */}
      <motion.div 
        className="fixed top-8 left-8 z-40 mix-blend-difference"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 1 }}
      >
        <input
          value={script.title}
          onChange={(e) => setScript(s => ({...s, title: e.target.value}))}
          className="font-serif text-2xl text-white/90 bg-transparent outline-none w-full placeholder-white/30"
          placeholder="Trip Title"
        />
        <div className="flex items-center gap-2 text-white/60 text-sm mt-1">
          <MapPin size={14} />
          <input
            value={script.location}
            onChange={(e) => setScript(s => ({...s, location: e.target.value}))}
            className="font-sans uppercase tracking-widest bg-transparent outline-none w-full placeholder-white/30"
            placeholder="LOCATION"
          />
        </div>
      </motion.div>

      {/* Scrollable Content */}
      <main ref={containerRef} className="relative z-10 h-screen overflow-y-auto cinematic-scroll">
        {script.blocks.map((block) => {
          return (
            <div 
              key={block.id} 
              onClick={() => { setSelectedBlockId(block.id); }}
              className={`relative transition-all duration-500 ${selectedBlockId === block.id ? 'z-20 ring-2 ring-white/20' : ''}`}
            >
              {block.layout === 'full_bleed' && <FullBleedLayout block={block} onUpdate={handleUpdateBlock} />}
              {block.layout === 'hero_split' && <HeroSplitLayout block={block} onUpdate={handleUpdateBlock} />}
              {block.layout === 'side_by_side' && <SideBySideLayout block={block} onUpdate={handleUpdateBlock} />}
              {block.layout === 'immersive_focus' && <ImmersiveFocusLayout block={block} onUpdate={handleUpdateBlock} />}
              {block.layout === 'magazine_spread' && <MagazineSpreadLayout block={block} onUpdate={handleUpdateBlock} />}
              {block.layout === 'minimal_caption' && <MinimalCaptionLayout block={block} onUpdate={handleUpdateBlock} />}
              {block.layout === 'portrait_feature' && <PortraitFeatureLayout block={block} onUpdate={handleUpdateBlock} />}
              {block.layout === 'text_overlay' && <TextOverlayLayout block={block} onUpdate={handleUpdateBlock} />}
            </div>
          );
        })}
        <ReflectionEndLayout onReplay={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} />
      </main>

      {/* Tools Toggle */}
      {!showTools && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setShowTools(true)}
          className="fixed bottom-8 right-8 z-50 bg-white/5 hover:bg-white/10 backdrop-blur-xl p-3 rounded-full border border-white/5 shadow-2xl transition-all"
        >
          <Sparkles className="text-white/80 w-5 h-5" />
        </motion.button>
      )}

      {/* AI Director Tools Panel */}
      <AIDirectorPanel
        showTools={showTools}
        onClose={() => setShowTools(false)}
        selectedBlockId={selectedBlockId}
        selectedBlock={getSelectedBlock()}
        onUpdateBlock={handleUpdateBlock}
        onAddNewBlock={handleAddNewBlock}
      />
    </motion.div>
  );
}
