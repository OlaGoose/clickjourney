'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import InteractiveGlobe from '@/components/InteractiveGlobe';
import Carousel from '@/components/Carousel';
import InfoModal from '@/components/InfoModal';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { useOptionalAuth } from '@/lib/auth';
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

/** Demo 测试：public/audio 下的音频，切换卡片时随机播放 */
const DEMO_AUDIO_URLS = [
  '/audio/Skyline_and_dim_sum__Hong_Kong.wav',
  '/audio/Sunset_on_the_Pacific__palm_tr.wav',
];

function pickRandomDemoAudio(): string {
  return DEMO_AUDIO_URLS[Math.floor(Math.random() * DEMO_AUDIO_URLS.length)]!;
}

function isContentCard(item: CarouselItem | null): boolean {
  return !!item && item.id !== 'start-card' && item.id !== 'end-card';
}

export default function HomePage() {
  const router = useRouter();
  const auth = useOptionalAuth();
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
  /** Demo: 当前卡片对应的随机音频 URL，切换卡片时更新 */
  const [currentDemoAudioUrl, setCurrentDemoAudioUrl] = useState<string | null>(null);
  const calloutAudioRef = useRef<HTMLAudioElement | null>(null);

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

    const demoUrl = pickRandomDemoAudio();
    setCurrentDemoAudioUrl(demoUrl);

    if (isContentCard(item)) {
      const audio = new Audio(demoUrl);
      calloutAudioRef.current = audio;
      audio.play().catch(() => {});
      audio.onended = () => {
        setCalloutPlaying(false);
        calloutAudioRef.current = null;
      };
      setCalloutPlaying(true);
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
  /** Only show globe ring/label for content cards with valid coordinates */
  const hasLocationHighlight =
    isContentCard(activeItem) &&
    !!(activeItem?.coordinates && (activeItem.coordinates.lat !== 0 || activeItem.coordinates.lng !== 0));
  const avatarSeeds = (activeItem?.participants?.length ? activeItem.participants : DEFAULT_AVATAR_SEEDS) as string[];
  const calloutText = activeItem?.description ?? DEFAULT_CALLOUT_TEXT;
  const effectiveAudioUrl = activeItem?.audioUrl ?? currentDemoAudioUrl;

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
        <div className="absolute left-6 top-12 right-6 z-30 pointer-events-auto md:left-16 flex flex-col gap-3">
          <h2
            className={`text-5xl font-bold tracking-tight text-[#f5f5f7] drop-shadow-lg md:text-6xl ${
              hasLocationHighlight ? 'leading-tight' : 'truncate pr-4 min-w-0'
            }`}
          >
            {titleText}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {avatarSeeds.map((seed, i) => (
                <img
                  key={`${seed}-${i}`}
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`}
                  alt="Traveler"
                  className="h-10 w-10 rounded-full border-2 border-black bg-gray-200"
                  style={{ zIndex: 10 - i }}
                />
              ))}
            </div>
            <span className="subhead above-keyline typography-callout-above-keyline-base">
              Together.
            </span>
          </div>
          <div className="callout mt-1" data-staggered-item="">
            <div className="subsection-copy-block keyline typography-callout-keyline-base">
              <p className="callout-copy">
                {calloutText}
              </p>
              <button
                type="button"
                aria-label={calloutPlaying ? 'Pause' : 'Play'}
                onClick={handleCalloutPlayPause}
                className="callout-player-btn"
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

        <div className="fixed bottom-8 left-1/2 z-40 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-2">
          {auth?.user ? (
            <button
              type="button"
              onClick={() => router.push('/memories/upload')}
              className="flex items-center gap-2 rounded-full px-8 py-3 text-sm font-medium text-white shadow-xl transition-all hover:scale-105 hover:opacity-90 active:scale-95 md:text-base"
              style={{ backgroundColor: 'rgb(0, 113, 227)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Add Memory
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push('/auth')}
              className="flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-medium text-black shadow-xl transition-all hover:scale-105 hover:bg-white/90 active:scale-95 md:text-base"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
              Review Journey
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
    </div>
  );
}
