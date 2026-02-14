'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ImagePlus,
  Play,
  Pause,
  ChevronRight,
  Pencil,
  Mic,
  Square,
  Trash2,
  Loader2,
  Music,
  Check,
} from 'lucide-react';
import { GalleryDisplay } from '@/components/upload/GalleryDisplay';
import { StoryStepBar } from '@/components/upload/StoryStepBar';
import { CinematicGenerationLoader } from '@/components/upload/CinematicGenerationLoader';
import { ErrorDisplay } from '@/components/upload/ErrorDisplay';
import { useDayNightTheme } from '@/hooks/useDayNightTheme';
import { useLocale } from '@/lib/i18n';
import { useOptionalAuth } from '@/lib/auth';
import { DEFAULT_UPLOAD_IMAGES } from '@/lib/upload/constants';
import { compressImageToBase64 } from '@/lib/utils/imageUtils';
import { blobToBase64 } from '@/lib/utils/imageUtils';
import { saveMemory, updateMemory } from '@/lib/storage';
import { blobUrlToPersistentUrl, uploadToSupabaseStorage } from '@/lib/upload-media';
import { vlogToCarouselItem } from '@/lib/vlog-to-memory';
import {
  VLOG_SESSION_KEY,
  VLOG_STEP_COUNT,
  FILTER_PRESETS,
  type VlogData,
} from '@/types/vlog';
import type { UploadedImage } from '@/types/upload';
import {
  getPendingUploads,
  saveUploadCacheItem,
  updateUploadCacheItem,
  clearUploadCache,
  cleanupOldCache,
  type UploadCacheItem,
} from '@/lib/vlog-upload-cache';

const MAX_PHOTOS = 9;

/** Default soundtrack when user does not upload audio. */
const DEFAULT_VLOG_AUDIO_URL =
  'https://cbgwjnevmdekrqfadrmi.supabase.co/storage/v1/object/public/memories/you_dont_talk_anymore.mp3';

function revokeBlobUrlIfNeeded(url: string): void {
  if (typeof url === 'string' && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getYoutubeIds(text: string): string[] {
  const ytRegex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/gi;
  const ids: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = ytRegex.exec(text)) !== null) {
    ids.push(match[1]!);
  }
  return [...new Set(ids)];
}

export default function VlogPage() {
  const router = useRouter();
  const { t } = useLocale();
  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;
  const [currentStep, setCurrentStep] = useState(0);

  /** Step 0 */
  const [memoryLocation, setMemoryLocation] = useState('');

  /** Step 1 */
  const [images, setImages] = useState<UploadedImage[]>(DEFAULT_UPLOAD_IMAGES);
  const [isDefault, setIsDefault] = useState(true);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  /** Step 2: script + voice + LUT */
  const [subtitleText, setSubtitleText] = useState('');
  const [videoText, setVideoText] = useState('');
  const [selectedFilterPreset, setSelectedFilterPreset] = useState(FILTER_PRESETS[0]!.name);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  /** AI generation */
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);

  /** Upload cache: resume interrupted uploads */
  const [pendingCache, setPendingCache] = useState<UploadCacheItem[] | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  const youtubeIds = getYoutubeIds(videoText);
  const hasVisualContent = images.length > 0 || youtubeIds.length > 0;
  
  // Track upload status: count items still being uploaded (blob URLs not yet replaced with http)
  const { isUploading, uploadingCount, totalMediaCount } = useMemo(() => {
    const blobImages = images.filter((i) => i.url.startsWith('blob:'));
    const hasAudioBlob = audioUrl?.startsWith('blob:') ?? false;
    const hasRecordedBlob = recordedAudioUrl?.startsWith('blob:') ?? false;
    const uploading = blobImages.length + (hasAudioBlob ? 1 : 0) + (hasRecordedBlob ? 1 : 0);
    const total = images.length + (audioUrl ? 1 : 0) + (recordedAudioUrl ? 1 : 0);
    return {
      isUploading: uploading > 0,
      uploadingCount: uploading,
      totalMediaCount: total,
    };
  }, [images, audioUrl, recordedAudioUrl]);
  
  const canStart =
    hasVisualContent && subtitleText.trim().length > 0 && !isUploading;

  const TRANSCRIBE_TIMEOUT_MS = 60_000;

  const transcribeRecordedAudio = useCallback(async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setSubtitleText('');
    const ac = new AbortController();
    const timeoutId = setTimeout(() => ac.abort(), TRANSCRIBE_TIMEOUT_MS);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');
      formData.append('mimeType', 'audio/webm');
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        signal: ac.signal,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setSubtitleText(data?.error ?? t('upload.transcriptUnavailable'));
        return;
      }
      setSubtitleText(data.text ?? '');
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      setSubtitleText(isAbort ? t('upload.transcriptTimeout') ?? '转写超时，请重试' : (t('upload.transcriptUnavailable')));
    } finally {
      clearTimeout(timeoutId);
      setIsTranscribing(false);
    }
  }, [t]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach((tr) => tr.stop());
        transcribeRecordedAudio(blob);
        const file = new File([blob], 'vlog-voice.webm', { type: 'audio/webm' });
        const recordedId = `recorded-${Date.now()}`;
        // Save to cache
        saveUploadCacheItem(recordedId, file, 'recorded').catch(console.warn);
        uploadToSupabaseStorage(file, { userId: userId ?? undefined }).then((persistentUrl) => {
          if (persistentUrl) {
            setRecordedAudioUrl(persistentUrl);
            updateUploadCacheItem(recordedId, { status: 'completed', url: persistentUrl }).catch(console.warn);
            revokeBlobUrlIfNeeded(url);
          }
        });
      };
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setSubtitleText('');
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      alert(t('upload.micPermissionDenied'));
    }
  }, [transcribeRecordedAudio, t, userId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [isRecording]);

  const deleteRecordedAudio = useCallback(() => {
    if (recordedAudioUrl) revokeBlobUrlIfNeeded(recordedAudioUrl);
    setRecordedAudioUrl(null);
    setIsPlayingRecorded(false);
    setSubtitleText('');
  }, []);

  const toggleRecordedPlayback = useCallback(() => {
    if (!recordedAudioPlayerRef.current) return;
    if (isPlayingRecorded) {
      recordedAudioPlayerRef.current.pause();
    } else {
      recordedAudioPlayerRef.current.play();
    }
    setIsPlayingRecorded(!isPlayingRecorded);
  }, [isPlayingRecorded]);

  const handleTranscribeRecordedClick = useCallback(async () => {
    if (!recordedAudioUrl) return;
    setIsTranscribing(true);
    const ac = new AbortController();
    const timeoutId = setTimeout(() => ac.abort(), TRANSCRIBE_TIMEOUT_MS);
    try {
      const res = await fetch(recordedAudioUrl);
      const blob = await res.blob();
      const formData = new FormData();
      formData.append('audio', blob, 'voice.webm');
      formData.append('mimeType', 'audio/webm');
      const apiRes = await fetch('/api/transcribe', {
        method: 'POST',
        signal: ac.signal,
        body: formData,
      });
      const data = await apiRes.json();
      if (apiRes.ok) {
        setSubtitleText(data.text ?? '');
      } else {
        setSubtitleText(data?.error ?? t('upload.transcriptUnavailable'));
      }
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      setSubtitleText(isAbort ? t('upload.transcriptTimeout') ?? '转写超时，请重试' : (t('upload.transcriptUnavailable')));
    } finally {
      clearTimeout(timeoutId);
      setIsTranscribing(false);
    }
  }, [recordedAudioUrl, t]);

  useEffect(() => {
    const audio = recordedAudioPlayerRef.current;
    if (!audio) return;
    const onEnded = () => setIsPlayingRecorded(false);
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [recordedAudioUrl]);

  // Check for pending uploads on mount and cleanup old cache
  useEffect(() => {
    let cancelled = false;
    async function checkPendingUploads() {
      try {
        await cleanupOldCache(); // Remove uploads older than 24h
        const pending = await getPendingUploads();
        if (!cancelled && pending.length > 0) {
          setPendingCache(pending);
          setShowResumeDialog(true);
        }
      } catch (err) {
        console.warn('[vlog] Failed to check pending uploads:', err);
      }
    }
    checkPendingUploads();
    return () => {
      cancelled = true;
    };
  }, []);

  // Resume uploads from cache
  const handleResumeUploads = useCallback(async () => {
    if (!pendingCache || pendingCache.length === 0) return;
    setShowResumeDialog(false);
    const uploadOpts = { userId: userId ?? undefined };

    // Group by type
    const cachedImages = pendingCache.filter((item) => item.type === 'image' || item.type === 'video');
    const cachedAudio = pendingCache.find((item) => item.type === 'audio');
    const cachedRecorded = pendingCache.find((item) => item.type === 'recorded');

    // Restore images/videos to state
    if (cachedImages.length > 0) {
      const restoredImages: UploadedImage[] = cachedImages.map((item) => ({
        id: item.id,
        url: item.url || URL.createObjectURL(item.file), // Use cached URL if available, else blob
        type: item.type === 'video' ? 'video' : 'image',
      }));
      setImages(restoredImages);
      setIsDefault(false);

      // Resume upload for pending items
      for (const item of cachedImages) {
        if (item.status === 'completed' && item.url) continue; // Already uploaded
        const blobUrl = URL.createObjectURL(item.file);
        uploadToSupabaseStorage(item.file, uploadOpts).then((persistentUrl) => {
          if (!persistentUrl) return;
          setImages((prev) =>
            prev.map((img) => (img.id === item.id ? { ...img, url: persistentUrl } : img))
          );
          updateUploadCacheItem(item.id, { status: 'completed', url: persistentUrl });
          revokeBlobUrlIfNeeded(blobUrl);
        });
      }
    }

    // Restore audio
    if (cachedAudio) {
      const audioBlob = cachedAudio.url || URL.createObjectURL(cachedAudio.file);
      setAudioUrl(audioBlob);
      if (cachedAudio.status !== 'completed' || !cachedAudio.url) {
        uploadToSupabaseStorage(cachedAudio.file, uploadOpts).then((persistentUrl) => {
          if (!persistentUrl) return;
          setAudioUrl(persistentUrl);
          updateUploadCacheItem(cachedAudio.id, { status: 'completed', url: persistentUrl });
          revokeBlobUrlIfNeeded(audioBlob);
        });
      }
    }

    // Restore recorded audio
    if (cachedRecorded) {
      const recordedBlob = cachedRecorded.url || URL.createObjectURL(cachedRecorded.file);
      setRecordedAudioUrl(recordedBlob);
      if (cachedRecorded.status !== 'completed' || !cachedRecorded.url) {
        uploadToSupabaseStorage(cachedRecorded.file, uploadOpts).then((persistentUrl) => {
          if (!persistentUrl) return;
          setRecordedAudioUrl(persistentUrl);
          updateUploadCacheItem(cachedRecorded.id, { status: 'completed', url: persistentUrl });
          revokeBlobUrlIfNeeded(recordedBlob);
        });
      }
    }

    setPendingCache(null);
  }, [pendingCache, userId]);

  const handleDiscardCache = useCallback(async () => {
    setShowResumeDialog(false);
    setPendingCache(null);
    await clearUploadCache();
  }, []);

  const handleStartClick = useCallback(() => {
    setReplaceTargetId(null);
    fileInputRef.current?.click();
  }, []);

  const handleTriggerReplace = useCallback((id: string) => {
    setReplaceTargetId(id);
    fileInputRef.current?.click();
  }, []);

  const handleDeleteImage = useCallback((id: string) => {
    setImages((prev) => {
      const removed = prev.find((img) => img.id === id);
      if (removed?.url) revokeBlobUrlIfNeeded(removed.url);
      const next = prev.filter((img) => img.id !== id);
      if (next.length === 0) {
        setIsDefault(true);
        return DEFAULT_UPLOAD_IMAGES;
      }
      return next;
    });
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      const uploadOpts = { userId: userId ?? undefined };
      if (replaceTargetId) {
        const file = files[0];
        if (!file) return;
        const newBlobUrl = URL.createObjectURL(file);
        const isVideo = file.type.startsWith('video/');
        setImages((prev) => {
          const prevImg = prev.find((img) => img.id === replaceTargetId);
          if (prevImg?.url) revokeBlobUrlIfNeeded(prevImg.url);
          return prev.map((img) =>
            img.id === replaceTargetId
              ? { ...img, url: newBlobUrl, type: (isVideo ? 'video' : 'image') as 'image' | 'video' }
              : img
          );
        });
        if (isDefault) setIsDefault(false);
        const targetId = replaceTargetId;
        setReplaceTargetId(null);
        // Save to cache
        saveUploadCacheItem(targetId, file, isVideo ? 'video' : 'image').catch(console.warn);
        uploadToSupabaseStorage(file, uploadOpts).then((persistentUrl) => {
          if (!persistentUrl) return;
          setImages((prev) =>
            prev.map((img) => (img.id === targetId ? { ...img, url: persistentUrl } : img))
          );
          updateUploadCacheItem(targetId, { status: 'completed', url: persistentUrl }).catch(console.warn);
          revokeBlobUrlIfNeeded(newBlobUrl);
        });
      } else {
        const currentImages = isDefault ? [] : images;
        const remaining = MAX_PHOTOS - currentImages.length;
        if (remaining <= 0) {
          e.target.value = '';
          return;
        }
        const toAdd = Array.from(files).slice(0, remaining);
        const newImages: UploadedImage[] = toAdd.map((file) => ({
          id: Math.random().toString(36).slice(2, 11),
          url: URL.createObjectURL(file),
          type: file.type.startsWith('video/') ? 'video' : 'image',
        }));
        setImages([...currentImages, ...newImages]);
        setIsDefault(false);
        toAdd.forEach((file, index) => {
          const id = newImages[index]!.id;
          const blobUrl = newImages[index]!.url;
          const type = newImages[index]!.type || 'image';
          // Save to cache
          saveUploadCacheItem(id, file, type as 'image' | 'video').catch(console.warn);
          uploadToSupabaseStorage(file, uploadOpts).then((persistentUrl) => {
            if (!persistentUrl) return;
            setImages((prev) =>
              prev.map((img) => (img.id === id ? { ...img, url: persistentUrl } : img))
            );
            updateUploadCacheItem(id, { status: 'completed', url: persistentUrl }).catch(console.warn);
            revokeBlobUrlIfNeeded(blobUrl);
          });
        });
      }
      e.target.value = '';
    },
    [replaceTargetId, isDefault, images, userId]
  );

  const handleAudioSelected = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;
      const blobUrl = URL.createObjectURL(file);
      const audioId = `audio-${Date.now()}`;
      setAudioUrl((prev) => {
        if (prev) revokeBlobUrlIfNeeded(prev);
        return blobUrl;
      });
      // Save to cache
      saveUploadCacheItem(audioId, file, 'audio').catch(console.warn);
      uploadToSupabaseStorage(file, { userId: userId ?? undefined }).then((persistentUrl) => {
        if (!persistentUrl) return;
        setAudioUrl(persistentUrl);
        updateUploadCacheItem(audioId, { status: 'completed', url: persistentUrl }).catch(console.warn);
        revokeBlobUrlIfNeeded(blobUrl);
      });
    },
    [userId]
  );

  const handleStartPlayback = useCallback(async () => {
    if (!canStart || isGenerating) return;
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationError(null);
    try {
      setGenerationProgress(10);
      // All media should already be uploaded (http URLs) since canStart checks !isUploading
      const imageUrls = images.filter((i) => i.type !== 'video').map((i) => i.url);
      const videoUrls = images.filter((i) => i.type === 'video').map((i) => i.url);
      const persistentAudio = audioUrl ?? DEFAULT_VLOG_AUDIO_URL;
      const persistentRecorded = recordedAudioUrl;
      
      // Sanity check: ensure no blob URLs (should never happen if canStart works correctly)
      const hasBlobUrl = [...imageUrls, ...videoUrls, persistentAudio, persistentRecorded].some(
        (url) => url && typeof url === 'string' && url.startsWith('blob:')
      );
      if (hasBlobUrl) {
        throw new Error('请等待媒体上传完成后再试');
      }

      setGenerationProgress(30);
      const firstImageUrl = imageUrls[0];
      let filterPreset = 'Original';
      let artifiedScript: string[] = subtitleText.split('\n').map((s) => s.trim()).filter(Boolean);
      // Use imageUrl (server fetches image); no heavy client-side base64 on real devices
      if (firstImageUrl && subtitleText.trim()) {
        setGenerationProgress(50);
        const body: Record<string, unknown> = {
          location: memoryLocation.trim() || undefined,
          scriptText: subtitleText.trim(),
          imageUrl: firstImageUrl,
        };
        if (persistentRecorded && persistentRecorded.startsWith('http')) {
          body.recordedAudioUrl = persistentRecorded;
        }
        setGenerationProgress(70);
        const res = await fetch('/api/vlog-style-and-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        setGenerationProgress(90);
        if (res.ok) {
          const data = await res.json();
          filterPreset = data.filterPreset ?? 'Original';
          if (Array.isArray(data.artifiedScript) && data.artifiedScript.length > 0) {
            artifiedScript = data.artifiedScript;
          }
        }
      }
      setGenerationProgress(95);
      // LUT: use user selection when they chose a preset; otherwise use AI recommendation
      const finalFilterPreset =
        selectedFilterPreset !== 'Original' ? selectedFilterPreset : filterPreset;
      const data: VlogData = {
        location: memoryLocation.trim(),
        images: imageUrls,
        videos: videoUrls,
        audio: persistentAudio,
        recordedAudio: persistentRecorded,
        subtitles: artifiedScript,
        filterPreset: finalFilterPreset,
        youtubeIds,
      };

      // Save vlog as memory card (once; duplicate prevented by isGenerating guard)
      let savedMemoryId: string | null = null;
      if (userId) {
        const carouselInput = vlogToCarouselItem(data);
        const { data: savedData, error } = await saveMemory(userId, carouselInput);
        if (!error && savedData?.id) {
          savedMemoryId = savedData.id;
          await updateMemory(userId, savedData.id, {
            vlogDataJson: JSON.stringify(data),
          } as any);
        }
      } else {
        savedMemoryId = `vlog-${Date.now()}`;
      }

      setGenerationProgress(100);

      // Clear upload cache on success
      await clearUploadCache().catch(console.warn);

      // Redirect by id so this vlog has a stable play URL and does not overwrite others
      if (savedMemoryId && userId) {
        router.push(`/memories/vlog/play?id=${encodeURIComponent(savedMemoryId)}`);
      } else {
        sessionStorage.setItem(VLOG_SESSION_KEY, JSON.stringify(data));
        if (savedMemoryId) sessionStorage.setItem('vlogMemoryId', savedMemoryId);
        router.push('/memories/vlog/play');
      }
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Generation failed');
      setIsGenerating(false);
    }
  }, [
    canStart,
    isGenerating,
    images,
    memoryLocation,
    subtitleText,
    selectedFilterPreset,
    audioUrl,
    recordedAudioUrl,
    youtubeIds,
    userId,
    router,
  ]);

  const goToNextStep = useCallback(() => {
    if (currentStep === 0) setCurrentStep(1);
    else if (currentStep === 1) setCurrentStep(2);
    else handleStartPlayback();
  }, [currentStep, handleStartPlayback]);

  const handleDismissError = useCallback(() => setGenerationError(null), []);

  const isDark = useDayNightTheme() === 'dark';
  const imageUrlsForLoader = useMemo(
    () => images.map((img) => img.url),
    [images]
  );

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans transition-colors duration-300 ${
        isDark
          ? 'selection:bg-white selection:text-black'
          : 'selection:bg-black selection:text-white'
      }`}
    >
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-colors duration-300"
        style={{
          background: isDark
            ? 'linear-gradient(to bottom, rgb(0, 113, 227), #050505)'
            : 'linear-gradient(to bottom, #CBE8FA 0%, #FCFDFD 100%)',
        }}
      />

      {isGenerating && (
        <CinematicGenerationLoader
          isGenerating
          progress={generationProgress}
          imageUrls={imageUrlsForLoader}
          theme={isDark ? 'dark' : 'light'}
        />
      )}

      <ErrorDisplay
        error={generationError}
        onRetry={handleStartPlayback}
        onDismiss={handleDismissError}
      />

      {/* Resume Upload Dialog */}
      {showResumeDialog && pendingCache && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className={`max-w-md w-full rounded-2xl p-6 shadow-2xl ${
              isDark ? 'bg-gray-900 border border-white/10' : 'bg-white'
            }`}
          >
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('vlog.resumeUploadTitle') || '检测到未完成的上传'}
            </h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
              {t('vlog.resumeUploadMessage') || `发现 ${pendingCache.length} 个未完成的文件，是否继续上传？刷新或关闭页面前上传已自动保存。`}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleResumeUploads}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${
                  isDark
                    ? 'bg-white text-black hover:bg-gray-100'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {t('vlog.resumeUpload') || '继续上传'}
              </button>
              <button
                type="button"
                onClick={handleDiscardCache}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${
                  isDark
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {t('vlog.discardCache') || '放弃并清空'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header
        className="fixed top-0 left-0 right-0 z-50 flex flex-col"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="px-3 pb-2">
          <StoryStepBar
            steps={VLOG_STEP_COUNT}
            currentStep={currentStep}
            progress={1}
            className="w-full"
            variant={isDark ? 'dark' : 'light'}
          />
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
        aria-hidden
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.mpc,.wav,.webm,.aac,.ogg,.flac"
        onChange={(e) => {
          const files = e.target.files;
          if (files?.length) handleAudioSelected(Array.from(files));
          e.target.value = '';
        }}
        className="hidden"
        aria-hidden
      />
      {recordedAudioUrl && (
        <audio
          ref={recordedAudioPlayerRef}
          src={recordedAudioUrl}
          className="hidden"
          aria-hidden
        />
      )}

      <main className="max-w-4xl w-full flex flex-col items-center z-10 flex-1 pt-24 md:pt-28 pb-32 md:pb-36">
        {currentStep === 0 && (
          <div className="flex-1 w-full flex flex-col justify-center items-center px-4">
            <h2
              className={`text-2xl font-semibold mb-3 text-center ${
                isDark ? 'text-white/90' : 'text-gray-800'
              }`}
            >
              {t('upload.locationHeading')}
            </h2>
            <input
              type="text"
              value={memoryLocation}
              onChange={(e) => setMemoryLocation(e.target.value)}
              placeholder={t('upload.locationPlaceholder')}
              className={`w-full max-w-md text-base rounded-xl px-4 py-3 outline-none transition-colors ${
                isDark
                  ? 'bg-white/10 text-white placeholder:text-white/40 focus:bg-white/15'
                  : 'bg-white/50 text-gray-800 placeholder:text-gray-400 focus:bg-white'
              }`}
              autoFocus
              aria-label={t('upload.locationPlaceholder')}
            />
          </div>
        )}

        {currentStep === 1 && (
          <div className="w-full flex flex-col items-center gap-8 flex-1">
            <div className="w-full relative h-[360px] md:h-[500px] flex justify-center items-center">
              <GalleryDisplay
                images={images}
                onDelete={handleDeleteImage}
                onReplace={handleTriggerReplace}
              />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="w-full flex flex-col items-center gap-6 flex-1">
            <div className="w-full max-w-sm mb-4">
              <div
                className={`backdrop-blur-2xl rounded-3xl shadow-2xl p-5 relative transition-colors duration-300 ${
                  isDark
                    ? 'bg-white/10 border border-white/20'
                    : 'bg-white/60 border border-white/40'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3
                    className={`text-sm font-semibold flex items-center gap-2 ${
                      isDark ? 'text-white/90' : 'text-gray-800'
                    }`}
                  >
                    <Pencil size={14} className={isDark ? 'text-white/50' : 'text-gray-500'} />
                    {t('upload.transcriptHeading')}
                  </h3>
                </div>
                <textarea
                  className={`w-full text-sm leading-relaxed bg-transparent resize-none outline-none rounded-xl p-2 ml-1 transition-colors ${
                    isDark
                      ? 'text-white/90 placeholder:text-white/40 focus:bg-white/5'
                      : 'text-gray-800 placeholder:text-gray-400 focus:bg-white/40'
                  }`}
                  rows={4}
                  value={subtitleText}
                  onChange={(e) => setSubtitleText(e.target.value)}
                  placeholder={t('vlog.screenplayPlaceholder')}
                  readOnly={isTranscribing}
                  aria-label={t('upload.transcriptHeading')}
                />
                <div className={`mt-3 flex items-center justify-end gap-1.5 ${isDark ? 'text-white/90' : 'text-gray-800'}`}>
                  {isRecording ? (
                    <>
                      <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-red-500 text-white text-xs font-medium tabular-nums">
                        <span className="relative flex h-1 w-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          <span className="relative rounded-full h-1 w-1 bg-white" />
                        </span>
                        {formatTime(recordingTime)}
                      </span>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 transition-all active:scale-95"
                        aria-label={t('upload.recordingStop')}
                      >
                        <Square size={12} fill="currentColor" />
                      </button>
                    </>
                  ) : recordedAudioUrl ? (
                    <>
                      <button
                        type="button"
                        onClick={toggleRecordedPlayback}
                        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-95 ${
                          isPlayingRecorded
                            ? isDark ? 'bg-white/20 text-white' : 'bg-gray-800 text-white'
                            : 'bg-black hover:bg-gray-800 text-white'
                        }`}
                        aria-label={isPlayingRecorded ? t('home.pause') : t('home.play')}
                      >
                        {isPlayingRecorded ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleTranscribeRecordedClick}
                        disabled={isTranscribing}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                          isTranscribing
                            ? isDark ? 'bg-white/10 text-white/50 cursor-wait' : 'bg-gray-200 text-gray-400 cursor-wait'
                            : 'bg-black hover:bg-gray-800 text-white'
                        }`}
                      >
                        {isTranscribing ? <Loader2 size={12} className="animate-spin" /> : null}
                        <span>{isTranscribing ? '…' : t('upload.transcribe')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={deleteRecordedAudio}
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                          isDark
                            ? 'hover:bg-white/10 text-white/50 hover:text-red-400'
                            : 'hover:bg-black/5 text-gray-500 hover:text-red-500'
                        }`}
                        aria-label={t('upload.deleteRecording')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-semibold transition-all active:scale-95"
                    >
                      <Mic size={12} strokeWidth={2.5} />
                      <span>{t('upload.record')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`w-full max-w-sm backdrop-blur-2xl rounded-2xl p-4 transition-colors ${
                isDark ? 'bg-white/10 border border-white/20' : 'bg-white/60 border border-white/40'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-semibold ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                  {t('vlog.videoLinks')}
                </span>
                {youtubeIds.length > 0 && (
                  <span className={`text-[10px] ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                    {youtubeIds.length} {t('vlog.clipsAdded')}
                  </span>
                )}
              </div>
              <textarea
                className={`w-full h-16 text-sm rounded-xl p-2 resize-none outline-none ${
                  isDark ? 'bg-white/5 text-white placeholder:text-white/40' : 'bg-white/50 text-gray-800 placeholder:text-gray-400'
                }`}
                placeholder={t('vlog.videoInsertsPlaceholder')}
                value={videoText}
                onChange={(e) => setVideoText(e.target.value)}
                aria-label={t('vlog.videoLinks')}
              />
            </div>

            <div
              className={`w-full max-w-sm backdrop-blur-2xl rounded-2xl p-4 transition-colors ${
                isDark ? 'bg-white/10 border border-white/20' : 'bg-white/60 border border-white/40'
              }`}
            >
              <label
                htmlFor="vlog-lut-select"
                className={`block text-xs font-semibold mb-2 ${isDark ? 'text-white/60' : 'text-gray-500'}`}
              >
                {t('vlog.colorGrade')}
              </label>
              <select
                id="vlog-lut-select"
                value={selectedFilterPreset}
                onChange={(e) => setSelectedFilterPreset(e.target.value)}
                className={`w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors cursor-pointer appearance-none bg-no-repeat bg-right ${
                  isDark
                    ? 'bg-white/5 text-white focus:bg-white/10 [&>option]:bg-gray-900 [&>option]:text-white'
                    : 'bg-white/50 text-gray-800 focus:bg-white/80 [&>option]:bg-white [&>option]:text-gray-800'
                }`}
                style={{
                  backgroundImage: isDark
                    ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='white' d='M4 6l4 4 4-4z'/%3E%3C/svg%3E\")"
                    : "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%23374151' d='M4 6l4 4 4-4z'/%3E%3C/svg%3E\")",
                  backgroundPosition: 'right 12px center',
                }}
                aria-label={t('vlog.colorGrade')}
              >
                {FILTER_PRESETS.map((preset) => (
                  <option key={preset.name} value={preset.name}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </main>

      <div
        className="fixed bottom-10 left-0 right-0 z-40 flex flex-col items-center pointer-events-none"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="w-full max-w-4xl flex flex-col items-center px-4 pointer-events-auto">
          <div
            className={`backdrop-blur-2xl rounded-full p-2 flex items-center gap-2 transition-all duration-300 ${
              isDark
                ? 'bg-white/10 border border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.3)]'
                : 'bg-white/30 border border-white/40 shadow-[0_20px_40px_rgba(0,0,0,0.1)]'
            }`}
          >
            {currentStep === 0 ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="group flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-black hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
                <span className="font-semibold text-[13px]">{t('upload.next')}</span>
              </button>
            ) : currentStep === 1 ? (
              <>
                <button
                  type="button"
                  onClick={handleStartClick}
                  disabled={!isDefault && images.length >= MAX_PHOTOS}
                  className={`group flex items-center gap-1.5 px-5 py-2.5 rounded-full transition-all active:scale-95 ${
                    !isDefault && images.length >= MAX_PHOTOS
                      ? isDark ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-black hover:bg-gray-800 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  <ImagePlus size={16} strokeWidth={2.5} />
                  <span className="font-semibold text-[13px]">{t('upload.uploadButton')}</span>
                </button>
                <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/20' : 'bg-black/10'}`} />
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 ${
                    audioUrl
                      ? 'bg-black text-white hover:bg-gray-800'
                      : isDark
                        ? 'bg-white/10 text-white/70 hover:bg-white/20'
                        : 'bg-black/5 text-gray-600 hover:bg-black/10'
                  }`}
                  title={t('vlog.soundtrack')}
                  aria-label={t('vlog.soundtrack')}
                >
                  {audioUrl ? <Check size={18} strokeWidth={2.5} /> : <Music size={18} strokeWidth={2.5} />}
                </button>
                <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/20' : 'bg-black/10'}`} />
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={isDefault}
                  className={`group flex items-center gap-1.5 px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 ${
                    isDefault
                      ? isDark ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-black hover:bg-gray-800 text-white'
                  }`}
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                  <span className="font-semibold text-[13px]">{t('upload.next')}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={goToNextStep}
                disabled={!canStart || isGenerating}
                className={`group relative flex items-center gap-1.5 px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 overflow-hidden ${
                  canStart && !isGenerating
                    ? 'bg-black hover:bg-gray-800 text-white'
                    : isDark ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Play size={16} strokeWidth={2.5} />
                <span className="font-semibold text-[13px]">{t('vlog.startPlayback')}</span>
              </button>
            )}
          </div>
          {currentStep === 2 && !canStart && (
            <p className={`mt-3 text-xs text-center max-w-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              {isUploading 
                ? `${t('vlog.uploadingMedia') || '正在上传媒体'} (${totalMediaCount - uploadingCount}/${totalMediaCount})`
                : t('vlog.needPhotosAudioSubtitles')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
