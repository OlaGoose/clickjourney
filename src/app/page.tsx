'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import StarField from '@/components/StarField';
import InteractiveGlobe from '@/components/InteractiveGlobe';
import Carousel from '@/components/Carousel';
import MemoryDetail from '@/components/MemoryDetail';
import InfoModal from '@/components/InfoModal';
import { useOptionalAuth } from '@/lib/auth';
import { getCarouselItems, buildCarouselItems } from '@/lib/storage';
import type { LocationData, CarouselItem, GeminiResponse } from '@/types';
import { ViewState } from '@/types';

const INITIAL_LOCATION: LocationData = {
  lat: 40.3956,
  lng: -74.1768,
  name: 'Orbit View',
  country: 'Space',
};

const DEFAULT_AVATAR_SEEDS = ['Felix', 'Aneka', 'Mark', 'Sora'];

const DEFAULT_CALLOUT_TEXT =
  'Orbit Journey turns every place you visit into a lasting memory. Track destinations, relive moments, and share your path with fellow travelers—all in one place.';

export default function HomePage() {
  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;

  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>(() => buildCarouselItems([]));
  const [currentLocation, setCurrentLocation] = useState<LocationData>(INITIAL_LOCATION);
  /** Current memory at carousel active index; single source for header/callout/globe linkage */
  const [activeItem, setActiveItem] = useState<CarouselItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<CarouselItem | null>(null);
  const [viewState, setViewState] = useState<ViewState>(ViewState.IDLE);
  const [infoModalData, setInfoModalData] = useState<GeminiResponse | null>(null);
  const [infoModalLoading, setInfoModalLoading] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [calloutPlaying, setCalloutPlaying] = useState(false);
  const calloutAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCarouselItems(userId).then((items) => {
      if (!cancelled) setCarouselItems(items);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleItemClick = useCallback((item: CarouselItem) => {
    setSelectedItem(item);
    setViewState(ViewState.INFO);
    if (item.coordinates) {
      setCurrentLocation({
        lat: item.coordinates.lat,
        lng: item.coordinates.lng,
        name: item.coordinates.name || item.title,
        region: item.coordinates.region,
        country: item.coordinates.country,
      });
    }
  }, []);

  const handleBack = useCallback(() => {
    setSelectedItem(null);
    setViewState(ViewState.IDLE);
  }, []);

  const handleActiveIndexChange = useCallback((index: number) => {
    const item = carouselItems[index] ?? null;
    setActiveItem(item);
    if (item?.coordinates) {
      setCurrentLocation({
        lat: item.coordinates.lat,
        lng: item.coordinates.lng,
        name: item.coordinates.name || item.title,
        region: item.coordinates.region,
        country: item.coordinates.country,
      });
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
  const titleText = activeItem ? (activeItem.coordinates?.name ?? activeItem.title) : currentLocation.name;
  const avatarSeeds = (activeItem?.participants?.length ? activeItem.participants : DEFAULT_AVATAR_SEEDS) as string[];
  const calloutText = activeItem?.description ?? DEFAULT_CALLOUT_TEXT;

  const handleCalloutPlayPause = useCallback(() => {
    if (activeItem?.audioUrl) {
      if (calloutPlaying) {
        calloutAudioRef.current?.pause();
        calloutAudioRef.current = null;
        setCalloutPlaying(false);
      } else {
        if (calloutAudioRef.current) calloutAudioRef.current.pause();
        const audio = new Audio(activeItem.audioUrl);
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
  }, [activeItem?.audioUrl, calloutPlaying]);

  return (
    <div className="relative h-screen w-full select-none overflow-hidden bg-black font-sans">
      <StarField />

      <div
        className={`transition-opacity duration-500 ${
          viewState === ViewState.INFO ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <InteractiveGlobe center={currentLocation} />
      </div>

      {viewState === ViewState.INFO && selectedItem && (
        <MemoryDetail item={selectedItem} onBack={handleBack} />
      )}

      <div
        className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-300 ${
          viewState === ViewState.INFO ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="absolute left-6 top-12 right-6 z-30 pointer-events-auto md:left-16">
          <h2 className="mb-3 text-5xl font-bold leading-tight tracking-tight text-[#f5f5f7] drop-shadow-lg md:text-6xl">
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
          <div className="callout mt-4" data-staggered-item="">
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
          <button
            type="button"
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
