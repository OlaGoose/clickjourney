'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import InteractiveGlobe from '@/components/InteractiveGlobe';
import Carousel from '@/components/Carousel';
import InfoModal from '@/components/InfoModal';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { useOptionalAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { getCarouselItems, buildCarouselItems } from '@/lib/storage';
import type { LocationData, CarouselItem, GeminiResponse } from '@/types';

const INITIAL_LOCATION: LocationData = {
  lat: 40.3956,
  lng: -74.1768,
  name: 'Orbit View',
  country: 'Space',
};

const DEFAULT_AVATAR_SEEDS = ['Felix', 'Aneka', 'Mark', 'Sora'];

const DEFAULT_CALLOUT_TEXT =
  'Orbit Journey turns every place you visit into a lasting memory. Track destinations, relive moments, and share your path with fellow travelers—all in one place.';

function isContentCard(item: CarouselItem | null): boolean {
  return !!item && item.id !== 'start-card' && item.id !== 'end-card';
}

export default function HomePage() {
  const router = useRouter();
  const auth = useOptionalAuth();
  const { t } = useLocale();
  const userId = auth?.user?.id ?? null;

  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>(() => buildCarouselItems([]));
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<LocationData>(INITIAL_LOCATION);
  /** Current memory at carousel active index; single source for header/callout/globe linkage */
  const [activeItem, setActiveItem] = useState<CarouselItem | null>(null);
  const [infoModalData, setInfoModalData] = useState<GeminiResponse | null>(null);
  const [infoModalLoading, setInfoModalLoading] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [calloutPlaying, setCalloutPlaying] = useState(false);
  const calloutAudioRef = useRef<HTMLAudioElement | null>(null);
  const [showMemoryOptions, setShowMemoryOptions] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingItems(true);
    getCarouselItems(userId).then((items) => {
      if (!cancelled) {
        setCarouselItems(items);
        setIsLoadingItems(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleItemClick = useCallback(
    (item: CarouselItem) => {
      // Special handling for journey start/end cards
      if (item.id === 'start-card' || item.id === 'end-card') {
        return;
      }
      // Navigate to memory detail page with proper routing
      router.push(`/memories/${item.id}`);
    },
    [router]
  );


  const handleActiveIndexChange = useCallback((index: number) => {
    const item = carouselItems[index] ?? null;
    setActiveItem(item);
    if (item?.coordinates) {
      const name =
        (item.coordinates.name && item.coordinates.name.trim()) ||
        item.title ||
        item.subtitle ||
        INITIAL_LOCATION.name;
      const { lat, lng } = item.coordinates;
      const hasValidCoords = lat !== 0 || lng !== 0;
      if (hasValidCoords) {
        setCurrentLocation({
          lat,
          lng,
          name,
          region: item.coordinates.region,
          country: item.coordinates.country,
        });
      } else {
        setCurrentLocation((prev) => ({ ...prev, name }));
      }
    } else if (item) {
      setCurrentLocation((prev) => ({
        ...prev,
        name: item.subtitle || item.title || prev.name,
      }));
    }
    setCalloutPlaying(false);
    if (calloutAudioRef.current) {
      calloutAudioRef.current.pause();
      calloutAudioRef.current = null;
    }
  }, [carouselItems]);

  const fetchLocationInfo = useCallback(async () => {
    setShowInfoModal(true);
    setInfoModalLoading(true);
    setInfoModalData(null);
    try {
      const params = new URLSearchParams({
        name: currentLocation.name,
        lat: String(currentLocation.lat),
        lng: String(currentLocation.lng),
      });
      const res = await fetch(`/api/location-info?${params}`);
      const data = await res.json();
      setInfoModalData({ text: data.text, groundingChunks: data.groundingChunks });
    } catch {
      setInfoModalData({ text: "Sorry, I couldn't connect to the travel guide at the moment." });
    } finally {
      setInfoModalLoading(false);
    }
  }, [currentLocation]);

  const displayItems = carouselItems;
  /** Header: location name from active card (coordinates or subtitle/title) so title and globe stay in sync */
  const titleText =
    (activeItem?.coordinates?.name?.trim()) ||
    activeItem?.subtitle ||
    activeItem?.title ||
    currentLocation.name;
  /** Only show globe ring/label for content cards with valid coordinates AND location name */
  const hasLocationHighlight =
    isContentCard(activeItem) &&
    !!(
      activeItem?.coordinates &&
      (activeItem.coordinates.lat !== 0 || activeItem.coordinates.lng !== 0) &&
      activeItem.coordinates.name &&
      activeItem.coordinates.name.trim() !== ''
    );
  const avatarSeeds = (activeItem?.participants?.length ? activeItem.participants : DEFAULT_AVATAR_SEEDS) as string[];
  const calloutText = activeItem?.description ?? DEFAULT_CALLOUT_TEXT;
  const effectiveAudioUrl = activeItem?.audioUrl ?? null;

  const handleCalloutPlayPause = useCallback(() => {
    if (effectiveAudioUrl) {
      if (calloutPlaying) {
        calloutAudioRef.current?.pause();
        calloutAudioRef.current = null;
        setCalloutPlaying(false);
      } else {
        if (calloutAudioRef.current) calloutAudioRef.current.pause();
        const audio = new Audio(effectiveAudioUrl);
        calloutAudioRef.current = audio;
        audio.play().catch(() => {});
        audio.onended = () => {
          setCalloutPlaying(false);
          calloutAudioRef.current = null;
        };
        setCalloutPlaying(true);
      }
    } else {
      setCalloutPlaying((p) => !p);
    }
  }, [effectiveAudioUrl, calloutPlaying]);

  return (
    <div className="relative h-screen w-full select-none overflow-hidden bg-black font-sans">
      <StarField />

      <InteractiveGlobe center={currentLocation} showHighlight={hasLocationHighlight} />

      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className="fixed right-5 top-5 z-30 pointer-events-auto">
          <UserAvatar size="sm" showDropdown className="rounded-full" />
        </div>
        <div className="absolute left-6 top-12 right-6 z-30 pointer-events-auto md:left-16 flex flex-col gap-4">
          {/* Location indicator */}
          {hasLocationHighlight && (
            <div className="mb-1 flex items-center gap-2 opacity-90">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500"></span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-400">
                CURRENT LOCATION
              </span>
            </div>
          )}
          
          <h2
            className={`font-thin leading-none tracking-tighter text-white drop-shadow-2xl ${
              hasLocationHighlight ? 'text-[56px] md:text-[72px]' : 'text-[48px] md:text-[64px] truncate pr-4 min-w-0 max-w-[calc(100%-4rem)]'
            }`}
          >
            {titleText}
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {avatarSeeds.map((seed, i) => (
                <img
                  key={`${seed}-${i}`}
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`}
                  alt="Traveler"
                  className="h-11 w-11 rounded-full border-[2.5px] border-black/60 bg-gray-200 shadow-lg"
                  style={{ zIndex: 10 - i }}
                />
              ))}
            </div>
            <div className="h-8 w-[1px] rounded-full bg-white/20"></div>
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">
              {t('home.together')}
            </span>
          </div>
          
          <div className="callout mt-2 max-w-2xl" data-staggered-item="">
            <div className="relative">
              <p className="pr-10 text-[14px] font-normal leading-relaxed text-[#f5f5f7]/90 md:text-[15px]">
                {calloutText}
              </p>
              <button
                type="button"
                aria-label={calloutPlaying ? t('home.pause') : t('home.play')}
                onClick={handleCalloutPlayPause}
                className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-white/30 hover:bg-white/15 hover:text-white active:scale-95"
              >
                {calloutPlaying ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
                    <rect x="1" y="0" width="2.5" height="10" rx="0.5" />
                    <rect x="6.5" y="0" width="2.5" height="10" rx="0.5" />
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
                    <path d="M2 1.5v7L8.5 5L2 1.5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="fixed bottom-24 z-30 w-full pointer-events-auto">
          <Carousel
          items={displayItems}
          onItemClick={handleItemClick}
          onActiveIndexChange={handleActiveIndexChange}
        />
        </div>

        <div className="fixed bottom-8 left-1/2 z-40 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-3">
          {auth?.user ? (
            <button
              type="button"
              onClick={() => setShowMemoryOptions(true)}
              className="group relative overflow-hidden rounded-full shadow-2xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #0A84FF 0%, #0056D6 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* Glow effect */}
              <div
                className="absolute inset-0 -z-10 opacity-50 blur-2xl transition-opacity duration-300 group-hover:opacity-70"
                style={{
                  background: 'linear-gradient(135deg, #0A84FF 0%, #0056D6 100%)',
                }}
              ></div>
              
              <div className="relative flex items-center gap-3 px-8 py-3.5 md:px-10 md:py-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white drop-shadow-md transition-transform duration-300 group-hover:rotate-90"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                <span className="text-[15px] font-medium tracking-wide text-white drop-shadow-sm md:text-[16px]">
                  {t('home.addMemory')}
                </span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push('/auth')}
              className="group relative overflow-hidden rounded-full shadow-2xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              {/* Glow effect */}
              <div
                className="absolute inset-0 -z-10 opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-60"
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                }}
              ></div>
              
              <div className="relative flex items-center gap-3 px-8 py-3.5 md:px-10 md:py-4">
                <span className="text-[15px] font-medium tracking-wide text-black drop-shadow-sm md:text-[16px]">
                  {t('home.reviewJourney')}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-black drop-shadow-sm transition-transform duration-300 group-hover:translate-x-1"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          )}
        </div>
      </div>

      {showInfoModal && (
        <InfoModal
          data={infoModalData}
          isLoading={infoModalLoading}
          onClose={() => setShowInfoModal(false)}
        />
      )}

      {showMemoryOptions && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto sm:items-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
          onClick={() => setShowMemoryOptions(false)}
        >
          <div
            className="relative w-full max-w-[440px] transform overflow-hidden transition-all"
            style={{
              background: 'rgba(18, 18, 18, 0.92)',
              backdropFilter: 'blur(60px)',
              WebkitBackdropFilter: 'blur(60px)',
              animation: 'slideUp 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '28px',
              marginBottom: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >

            {/* Divider */}
            <div className="mx-6 rounded-full bg-white/10"></div>

            {/* Options */}
            <div className="px-6 py-6">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowMemoryOptions(false);
                    router.push('/memories/upload');
                  }}
                  className="group relative w-full overflow-hidden rounded-[20px] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div className="flex items-center gap-5 p-6">
                    {/* Icon */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-[16px] shadow-lg transition-transform duration-300 group-hover:scale-105"
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="26"
                          height="26"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-white drop-shadow-md"
                        >
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      {/* Glow effect */}
                      <div
                        className="absolute inset-0 -z-10 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40"
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }}
                      ></div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col items-start justify-center">
                      <div className="mb-1.5 flex items-center gap-2">
                        <h4 className="text-[22px] font-light leading-none tracking-tight text-white">
                          日记
                        </h4>
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-purple-400 opacity-80">
                          DIARY
                        </span>
                      </div>
                      <p className="text-[11px] font-medium leading-relaxed tracking-wide text-zinc-500">
                        用文字和图片记录旅程
                      </p>
                    </div>

                    {/* Arrow */}
                    <div className="flex-shrink-0 opacity-40 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-70">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMemoryOptions(false);
                    router.push('/memories/vlog');
                  }}
                  className="group relative w-full overflow-hidden rounded-[20px] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div className="flex items-center gap-5 p-6">
                    {/* Icon */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-[16px] shadow-lg transition-transform duration-300 group-hover:scale-105"
                        style={{
                          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="26"
                          height="26"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-white drop-shadow-md"
                        >
                          <polygon points="23 7 16 12 23 17 23 7" />
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                      </div>
                      {/* Glow effect */}
                      <div
                        className="absolute inset-0 -z-10 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40"
                        style={{
                          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        }}
                      ></div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col items-start justify-center">
                      <div className="mb-1.5 flex items-center gap-2">
                        <h4 className="text-[22px] font-light leading-none tracking-tight text-white">
                          Vlog
                        </h4>
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-pink-400 opacity-80">
                          VIDEO
                        </span>
                      </div>
                      <p className="text-[11px] font-medium leading-relaxed tracking-wide text-zinc-500">
                        制作精美的视频回忆
                      </p>
                    </div>

                    {/* Arrow */}
                    <div className="flex-shrink-0 opacity-40 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-70">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-6 h-[1px] rounded-full bg-white/10"></div>

            {/* Cancel Button */}
            <div className="px-6 py-4">
              <button
                type="button"
                onClick={() => setShowMemoryOptions(false)}
                className="group w-full rounded-[16px] py-3.5 text-[13px] font-medium tracking-wide transition-all duration-200 hover:bg-white/5 active:scale-[0.98]"
                style={{
                  color: '#0A84FF',
                }}
              >
                <span className="opacity-90 group-hover:opacity-100">取消</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
