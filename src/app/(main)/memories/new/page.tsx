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
  const [content, setContent] = useState('<h1>Untitled</h1><p></p>');
  const [images, setImages] = useState<string[]>([]);
  const [audios, setAudios] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  /** When true, bottom button shows "Add map" and map picker sheet is open. Default false so init shows Publish. */
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
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

      {/* Notion-style topbar: no left menu icon; title center; Share + More on right */}
      <header
        role="banner"
        className="notion-topbar-mobile fixed top-0 left-0 right-0 z-30 flex h-[44px] w-full max-w-[100vw] shrink-0 items-center justify-between bg-black"
        style={{
          boxShadow: '0 0.3333333333333333px 0 rgba(255,255,255,0.08)',
          paddingInline: 0,
        }}
      >
        <div className="flex min-w-0 flex-1 flex-shrink items-center overflow-hidden" style={{ height: '100%' }}>
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-full w-9 flex-shrink-0 items-center justify-center text-[#f5f5f7] transition-[background] duration-[20ms] ease-in hover:bg-white/[0.08] active:bg-white/[0.12]"
            style={{ marginInlineStart: 4 }}
            aria-label="Back"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M12.79 3.22a.75.75 0 0 1 0 1.06L7.56 9.5l5.23 5.22a.75.75 0 1 1-1.06 1.06l-5.75-5.75a.75.75 0 0 1 0-1.06l5.75-5.75a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
          </button>
          <div
            className="flex flex-1 items-center overflow-hidden whitespace-nowrap text-ellipsis text-base leading-tight text-[#f5f5f7]"
            style={{ marginInline: '0 8px', minWidth: 0, maxWidth: '100%', height: '100%' }}
          >
            <span className="block truncate">New page</span>
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-grow-0 items-center" style={{ height: '100%', paddingInline: '4px 8px' }}>
          <button
            type="button"
            className="flex p-1 flex-shrink-0 items-center justify-center rounded-md text-white/70 transition-[background] duration-[20ms] ease-in hover:bg-white/[0.08] active:bg-white/[0.12]"
            style={{ marginInlineEnd: 14 }}
            aria-label="Share"
          >
            <svg viewBox="0 0 20 20" className="h-[26px] w-[26px] shrink-0" fill="currentColor" aria-hidden>
              <path d="M9.533.62a.625.625 0 0 1 .884 0l2.5 2.5a.625.625 0 1 1-.884.884l-1.408-1.408V11a.625.625 0 1 1-1.25 0V2.546L7.917 4.004a.625.625 0 1 1-.884-.883z" />
              <path d="M8.125 5.125H5.5A2.125 2.125 0 0 0 3.375 7.25v7.5c0 1.174.951 2.125 2.125 2.125h9a2.125 2.125 0 0 0 2.125-2.125v-7.5A2.125 2.125 0 0 0 14.5 5.125h-2.625v1.25H14.5c.483 0 .875.392.875.875v7.5a.875.875 0 0 1-.875.875h-9a.875.875 0 0 1-.875-.875v-7.5c0-.483.392-.875.875-.875h2.625z" />
            </svg>
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreMenuOpen((o) => !o)}
              className="flex p-1 flex-shrink-0 items-center justify-center rounded-md text-white/70 transition-[background] duration-[20ms] ease-in hover:bg-white/[0.08] active:bg-white/[0.12]"
              style={{ marginInlineEnd: 14 }}
              aria-label="Actions"
              aria-expanded={moreMenuOpen}
              aria-haspopup="dialog"
            >
              <svg viewBox="0 0 20 20" className="h-[26px] w-[26px] shrink-0" fill="currentColor" aria-hidden>
                <path d="M4 11.375a1.375 1.375 0 1 0 0-2.75 1.375 1.375 0 0 0 0 2.75m6 0a1.375 1.375 0 1 0 0-2.75 1.375 1.375 0 0 0 0 2.75m6 0a1.375 1.375 0 1 0 0-2.75 1.375 1.375 0 0 0 0 2.75" />
              </svg>
            </button>
            {moreMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden
                  onClick={() => setMoreMenuOpen(false)}
                />
                <div
                  role="dialog"
                  className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-white/10 bg-[#1c1c1e] py-1 shadow-xl"
                >
                  <button
                    type="button"
                    onClick={() => { setMapDialogOpen(true); setMoreMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#f5f5f7] hover:bg-white/[0.08]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    添加位置
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleSave(); setMoreMenuOpen(false); }}
                    disabled={isSaving}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#f5f5f7] hover:bg-white/[0.08] disabled:opacity-50"
                  >
                    {isSaving ? (
                      <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M22 2L11 13" />
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                      </svg>
                    )}
                    发布
                  </button>
                </div>
              </>
            )}
          </div>
          <div style={{ width: 4 }} />
        </div>
      </header>

      <main className="relative z-10 flex h-screen flex-col pt-11 pb-20 overflow-hidden">
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

    </div>
  );
}
