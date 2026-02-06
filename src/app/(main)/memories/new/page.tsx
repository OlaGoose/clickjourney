'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import UltimateEditor from '@/components/editor/UltimateEditor';
import LocationPicker from '@/components/editor/LocationPicker';
import { useAuth } from '@/lib/auth';
import { saveMemory } from '@/lib/storage';
import type { LocationData } from '@/types';

export default function NewMemoryPage() {
  const router = useRouter();
  const auth = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [audios, setAudios] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; content?: string; location?: string }>({});

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

    // Validate fields
    const newErrors: { title?: string; content?: string; location?: string } = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!content.trim() || content === '<p></p>') newErrors.content = 'Story is required';
    if (!location) newErrors.location = 'Location is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      // Generate a random color and cover image
      const colors = [
        'rgb(44, 62, 80)',
        'rgb(41, 128, 185)',
        'rgb(142, 68, 173)',
        'rgb(192, 57, 43)',
        'rgb(39, 174, 96)',
        'rgb(230, 126, 34)',
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // Use first uploaded image as cover, or generate one
      const coverImage = images[0] || `https://picsum.photos/id/${1000 + Math.floor(Math.random() * 100)}/600/400`;
      
      // Extract plain text from HTML for description
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      
      // Create the memory item
      const memory = {
        title,
        subtitle: 'Memory',
        image: coverImage,
        color: color!,
        chord: [220, 261.63, 329.63],
        description: plainText.substring(0, 200),
        richContent: content,
        gallery: images.slice(1), // Rest of images go to gallery
        audioUrls: audios,
        videoUrls: videos,
        coordinates: location,
      };

      const result = await saveMemory(auth.user.id, memory);

      if (result.error) {
        alert('Failed to save memory: ' + result.error);
        setIsSaving(false);
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save memory');
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (title || content || images.length > 0 || audios.length > 0 || videos.length > 0) {
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

      {/* Fixed close: top-right, no layout space */}
      <button
        type="button"
        onClick={handleCancel}
        className="fixed top-4 right-4 z-30 p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
        aria-label="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>

      <div className="relative z-10 pb-24">
        <div className="mx-auto max-w-5xl px-4 md:px-6 py-8 md:py-12">
          {/* Header */}
          <div className="mb-8 md:mb-12 pr-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#f5f5f7] tracking-tight mb-2">
              Create Memory
            </h1>
            <p className="text-gray-400 text-sm md:text-base">
              Capture your journey with text, photos, audio, and video
            </p>
          </div>

          {/* Form */}
          <div className="space-y-8">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-3">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors({ ...errors, title: undefined });
                }}
                placeholder="A memorable journey..."
                className={`w-full px-4 md:px-6 py-3 md:py-4 bg-black/40 backdrop-blur-sm border rounded-xl md:rounded-2xl text-white placeholder-gray-500 focus:outline-none transition-colors text-base md:text-lg ${
                  errors.title ? 'border-red-500/50' : 'border-white/10 focus:border-white/30'
                }`}
              />
              {errors.title && <p className="mt-2 text-sm text-red-400">{errors.title}</p>}
            </div>

            {/* Ultimate Story Editor with All Media Types */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3">
                Your Story
                <span className="ml-2 text-xs text-gray-500">
                  (Use toolbar to add images, audio, and video)
                </span>
              </label>
              <div className={errors.content ? 'ring-2 ring-red-500/50 rounded-xl md:rounded-2xl' : ''}>
                <UltimateEditor
                  content={content}
                  onChange={(newContent) => {
                    setContent(newContent);
                    if (errors.content) setErrors({ ...errors, content: undefined });
                  }}
                  onMediaChange={handleMediaChange}
                  placeholder="Start writing your story... Use the toolbar to add images, audio, and videos directly into your story."
                />
              </div>
              {errors.content && <p className="mt-2 text-sm text-red-400">{errors.content}</p>}
            </div>

            {/* Media Stats */}
            {(images.length > 0 || audios.length > 0 || videos.length > 0) && (
              <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-black/40 rounded-xl border border-white/10">
                <span className="text-sm text-gray-400">Media attached:</span>
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

            {/* Location Picker */}
            <div className={errors.location ? 'ring-2 ring-red-500/50 rounded-xl md:rounded-2xl p-4' : ''}>
              <LocationPicker
                value={location}
                onChange={(newLocation) => {
                  setLocation(newLocation);
                  if (errors.location) setErrors({ ...errors, location: undefined });
                }}
              />
              {errors.location && <p className="mt-2 text-sm text-red-400">{errors.location}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed publish button at bottom — 1:1 with homepage Add Memory */}
      <div className="fixed bottom-8 left-1/2 z-30 -translate-x-1/2 pointer-events-none w-full max-w-[min(100vw,28rem)] px-4">
        <div className="pointer-events-auto flex flex-col items-center">
          <button
            type="button"
            onClick={handleSave}
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
