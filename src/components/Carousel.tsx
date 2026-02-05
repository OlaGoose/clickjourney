'use client';

import { useRef, useState, useEffect } from 'react';
import type { CarouselItem } from '@/types';

interface CarouselProps {
  items: CarouselItem[];
  onItemClick?: (item: CarouselItem) => void;
}

function getStartIndex(length: number) {
  return length > 0 ? Math.floor(length / 2) : 0;
}

export default function Carousel({ items, onItemClick }: CarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(() => getStartIndex(items.length));
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioContextRef.current) {
      const Ctx = typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext);
      if (Ctx) audioContextRef.current = new Ctx();
    }
    if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
  };

  const playChord = (chord: number[]) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 1.5;
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05 / (i + 1), now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    });
  };

  useEffect(() => {
    if (!scrollContainerRef.current || items.length === 0) return;
    const container = scrollContainerRef.current;
    const cardWidth = 280;
    const gap = 16;
    const startIndex = getStartIndex(items.length);
    container.scrollTo({ left: startIndex * (cardWidth + gap), behavior: 'instant' as ScrollBehavior });
    setActiveIndex(startIndex);
  }, [items.length]);

  useEffect(() => {
    if (activeIndex >= 0 && activeIndex < items.length) {
      if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
      const item = items[activeIndex];
      if (item?.chord?.length) playChord(item.chord);
    }
  }, [activeIndex, items]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const options = { root: container, rootMargin: '0px', threshold: 0.5 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = Number((entry.target as HTMLElement).getAttribute('data-index'));
          setActiveIndex(index);
        }
      });
    }, options);
    const cards = container.querySelectorAll('.carousel-item');
    cards.forEach((c) => observer.observe(c));
    return () => {
      cards.forEach((c) => observer.unobserve(c));
      observer.disconnect();
    };
  }, [items]);

  return (
    <div className="w-full" onClick={initAudio} onTouchStart={initAudio}>
      <div
        ref={scrollContainerRef}
        className="no-scrollbar flex gap-4 overflow-x-auto pb-8 pt-4 snap-x snap-mandatory"
        style={{
          scrollBehavior: 'smooth',
          maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
          paddingLeft: 'calc(50vw - 140px)',
          paddingRight: 'calc(50vw - 140px)',
        }}
      >
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          const key = `${item.id}-${index}`;
          const isCinematic = item.id === 'start-card' || item.id === 'end-card';

          return (
            <div
              key={key}
              data-index={index}
              onClick={() => onItemClick?.(item)}
              className={`
                carousel-item snap-center shrink-0 relative w-[280px] h-[158px] rounded-2xl overflow-hidden cursor-pointer
                transition-all duration-500 ease-out origin-center
                ${isActive ? 'scale-110 opacity-100 z-10 shadow-2xl' : 'scale-95 opacity-80 hover:opacity-100'}
                ${isCinematic ? '' : 'shadow-lg'}
              `}
              style={{ backgroundColor: isCinematic ? 'transparent' : item.color }}
            >
              {isCinematic ? (
                <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden font-sans">
                  <div className="absolute inset-0 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl" />
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-black/20" />
                  <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center">
                    {item.description && (
                      <div className="mb-3 flex items-center gap-2 opacity-90">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yellow-500" />
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-400">
                          {item.description}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-row items-center justify-center gap-6 pl-1">
                      <span className="translate-y-[-2px] text-[72px] font-thin leading-none tracking-tighter text-white drop-shadow-2xl">
                        {item.title}
                      </span>
                      <div className="h-10 w-[1px] rounded-full bg-white/20" />
                      <div className="flex flex-col items-start justify-center pt-1">
                        <span className="mb-1 text-[14px] font-bold uppercase leading-none tracking-[0.25em] text-[#FFD60A] drop-shadow-sm">
                          {item.subtitle}
                        </span>
                        <span className="text-[11px] font-medium uppercase leading-none tracking-[0.25em] text-zinc-600">
                          {item.detailTitle}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover opacity-80 transition-opacity duration-300 hover:opacity-100"
                  />
                  <div className="pointer-events-none absolute bottom-4 left-4 right-4">
                    <p className="text-xs font-bold text-white opacity-90 drop-shadow-md">{item.subtitle}</p>
                    <p className="truncate text-sm font-bold text-white drop-shadow-md">{item.title}</p>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
