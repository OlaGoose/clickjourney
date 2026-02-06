'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import UltimateEditor from '@/components/editor/UltimateEditor';
import LocationPicker from '@/components/editor/LocationPicker';
import { useAuth } from '@/lib/auth';
import { saveMemory } from '@/lib/storage';
import type { LocationData } from '@/types';

const MEMORY_COLORS = [
  'rgb(44, 62, 80)',
  'rgb(41, 128, 185)',
  'rgb(142, 68, 173)',
  'rgb(192, 57, 43)',
  'rgb(39, 174, 96)',
  'rgb(230, 126, 34)',
] as const;

/** Extract title from editor HTML: first H1 text (title lives inside editor as H1). */
function getTitleFromContent(html: string): string {
  if (!html.trim()) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  const h1 = div.querySelector('h1');
  return (h1?.textContent ?? '').trim();
}

export default function NewMemoryPage() {
  const router = useRouter();
  const auth = useAuth();
  const [content, setContent] = useState('<h1></h1><p></p>');
  const [images, setImages] = useState<string[]>([]);
  const [audios, setAudios] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  /** When true, bottom button shows "Add map" and map picker sheet is open. Default false so init shows Publish. */
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  /** Sheet slide-up: false = off-screen, true = visible (for open animation). */
  const [sheetUp, setSheetUp] = useState(false);
  /** When true, sheet is animating out; after 300ms we close. */
  const [sheetClosing, setSheetClosing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Open: after mount, one frame so panel starts at translate-y-full then animates up
  useEffect(() => {
    if (!mapDialogOpen) {
      setSheetUp(false);
      return;
    }
    const frame = requestAnimationFrame(() => setSheetUp(true));
    return () => cancelAnimationFrame(frame);
  }, [mapDialogOpen]);

  // Close: animate down then unmount
  useEffect(() => {
    if (!sheetClosing) return;
    const t = setTimeout(() => {
      setMapDialogOpen(false);
      setSheetClosing(false);
    }, 320);
    return () => clearTimeout(t);
  }, [sheetClosing]);

  // Lock body scroll while sheet is open (native app feel)
  useEffect(() => {
    if (!mapDialogOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mapDialogOpen]);

  const closeMapSheet = () => setSheetClosing(true);
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});

  const handleMediaChange = (newImages: string[], newAudios: string[], newVideos: string[]) => {
    setImages(newImages);
    setAudios(newAudios);
    setVideos(newVideos);
  };

  const handleSave = async () => {
    if (!auth?.user?.id) {
      alert('Please login to save memories');
      return;
    }

    const title = getTitleFromContent(content);
    const newErrors: { title?: string; content?: string } = {};
    if (!title) newErrors.title = 'Title is required';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const plainOnly = (tempDiv.textContent || tempDiv.innerText || '').trim();
    if (!plainOnly) newErrors.content = 'Story is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      const color = MEMORY_COLORS[Math.floor(Math.random() * MEMORY_COLORS.length)];
      const coverImage = images[0] || `https://picsum.photos/id/${1000 + Math.floor(Math.random() * 100)}/600/400`;
      const plainText = plainOnly;

      const memory = {
        title: title || 'Untitled',
        subtitle: 'Memory',
        image: coverImage,
        color: color!,
        chord: [220, 261.63, 329.63],
        description: plainText.substring(0, 200),
        richContent: content,
        gallery: images.slice(1), // Rest of images go to gallery
        audioUrls: audios,
        videoUrls: videos,
        ...(location && { coordinates: location }),
      };

      const result = await saveMemory(auth.user.id, memory);

      if (result.error) {
        alert('Failed to save memory: ' + result.error);
        setIsSaving(false);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save memory');
      setIsSaving(false);
    }
  };

  const hasContent = content !== '<h1></h1><p></p>' && content.replace(/<[^>]+>/g, '').trim().length > 0;
  const handleCancel = () => {
    if (hasContent || images.length > 0 || audios.length > 0 || videos.length > 0) {
      if (confirm('Discard changes?')) {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-black font-sans">
      <StarField />

      {/* Topbar: Apple back + title */}
      <header
        role="banner"
        className="fixed top-0 left-0 right-0 z-30 flex h-11 min-h-[44px] w-full max-w-[100vw] shrink-0 items-center border-b border-white/[0.08] bg-black/70 shadow-[0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md"
      >
        <div className="flex min-w-0 flex-1 items-center">
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]"
            aria-label="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M12.79 3.22a.75.75 0 0 1 0 1.06L7.56 9.5l5.23 5.22a.75.75 0 1 1-1.06 1.06l-5.75-5.75a.75.75 0 0 1 0-1.06l5.75-5.75a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold tracking-tight text-[#f5f5f7]">
            Create Memory
          </h1>
          <button
            type="button"
            onClick={() => setMapDialogOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]"
            aria-label="Add location"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </button>
        </div>
      </header>

      <main className="relative z-10 flex h-screen flex-col pt-11 pb-24 overflow-hidden">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col min-h-0 py-6 md:px-6 md:py-8 overflow-hidden">
          <div className="flex flex-1 flex-col min-h-0 gap-6">
            {/* Location line (Apple-style, above title) — only when user has selected a place */}
            {location && (
              <div className="shrink-0 flex items-center gap-2 text-[13px] text-gray-400 tracking-tight">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0" aria-hidden>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="truncate">
                  {[location.name, location.region, location.country].filter(Boolean).join(' · ') || location.name}
                </span>
              </div>
            )}
            {/* Editor: title is first line (H1) inside editor */}
            <div className={`min-h-0 flex-1 flex flex-col ${errors.content || errors.title ? 'ring-2 ring-red-500/50 rounded-xl md:rounded-2xl' : ''}`}>
              <UltimateEditor
                content={content}
                onChange={(newContent) => {
                  setContent(newContent);
                  setErrors((prev) => ({ ...prev, content: undefined, title: undefined }));
                }}
                onMediaChange={handleMediaChange}
                placeholder="Untitled"
                toolbarFixed
              />
              {errors.title && <p className="mt-2 px-4 text-sm text-red-400">{errors.title}</p>}
              {errors.content && <p className="mt-2 px-4 text-sm text-red-400">{errors.content}</p>}
            </div>

            {/* Media Stats */}
            {(images.length > 0 || audios.length > 0 || videos.length > 0) && (
              <div className="flex flex-wrap items-center gap-4 shrink-0 px-4 py-3 bg-black/40 rounded-xl">
                <span className="text-sm text-gray-400">Media:</span>
                {images.length > 0 && (
                  <span className="flex items-center gap-2 text-sm text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    {images.length} {images.length === 1 ? 'photo' : 'photos'}
                  </span>
                )}
                {audios.length > 0 && (
                  <span className="flex items-center gap-2 text-sm text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18V5l12-2v13"/>
                      <circle cx="6" cy="18" r="3"/>
                      <circle cx="18" cy="16" r="3"/>
                    </svg>
                    {audios.length} {audios.length === 1 ? 'audio' : 'audios'}
                  </span>
                )}
                {videos.length > 0 && (
                  <span className="flex items-center gap-2 text-sm text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                    {videos.length} {videos.length === 1 ? 'video' : 'videos'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Map picker — native-style bottom sheet: slides up from bottom */}
      {mapDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="map-sheet-title"
        >
          {/* Backdrop: tap to close, fades with sheet */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out"
            style={{ opacity: sheetUp && !sheetClosing ? 1 : 0 }}
            aria-hidden
            onClick={closeMapSheet}
          />
          {/* Sheet panel: slides up from bottom with rounded top, safe area for home indicator */}
          <div
            className="relative w-full max-w-lg max-h-[88vh] flex flex-col rounded-t-2xl bg-[#1c1c1e] border border-b-0 border-white/10 shadow-2xl transform transition-[transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform pb-[env(safe-area-inset-bottom)]"
            style={{
              transform: sheetUp && !sheetClosing ? 'translateY(0)' : 'translateY(100%)',
            }}
          >
            {/* Drag handle — native app feel */}
            <div className="flex shrink-0 justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-white/25" aria-hidden />
            </div>
            <div className="flex items-center justify-between shrink-0 px-4 pb-3 pt-0">
              <h2 id="map-sheet-title" className="text-[17px] font-semibold text-[#f5f5f7]">
                Add location
              </h2>
              <button
                type="button"
                onClick={closeMapSheet}
                className="p-2 -mr-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white active:bg-white/15 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0">
              <LocationPicker
                value={location}
                onChange={(loc) => {
                  setLocation(loc);
                  closeMapSheet();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Fixed bottom button: two states — Publish (default) or Add map (when dialog open) */}
      <div className="fixed bottom-8 left-1/2 z-30 -translate-x-1/2 pointer-events-none w-full max-w-[min(100vw,28rem)] px-4">
        <div className="pointer-events-auto flex flex-col items-center">
          <button
            type="button"
            onClick={mapDialogOpen ? undefined : handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-full px-8 py-3 text-sm font-medium text-white shadow-xl transition-all hover:scale-105 hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 md:text-base"
            style={{ backgroundColor: 'rgb(0, 113, 227)' }}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Publishing…
              </>
            ) : mapDialogOpen ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Add map
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
                Publish
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
