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
import { blobUrlToPersistentUrl } from '@/lib/upload-media';
import { vlogToCarouselItem } from '@/lib/vlog-to-memory';
import {
  VLOG_SESSION_KEY,
  VLOG_STEP_COUNT,
  FILTER_PRESETS,
  type VlogData,
} from '@/types/vlog';
import type { UploadedImage } from '@/types/upload';

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

  const youtubeIds = getYoutubeIds(videoText);
  const hasVisualContent = images.length > 0 || youtubeIds.length > 0;
  const canStart =
    hasVisualContent && subtitleText.trim().length > 0;

  const transcribeRecordedAudio = useCallback(async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setSubtitleText('');
    try {
      const base64Data = await blobToBase64(audioBlob);
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: base64Data, mimeType: 'audio/webm' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubtitleText(data?.error ?? t('upload.transcriptUnavailable'));
        return;
      }
      setSubtitleText(data.text ?? '');
    } catch {
      setSubtitleText(t('upload.transcriptUnavailable'));
    } finally {
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
  }, [transcribeRecordedAudio, t]);

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
    try {
      const res = await fetch(recordedAudioUrl);
      const blob = await res.blob();
      const base64Data = await blobToBase64(blob);
      const apiRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: base64Data, mimeType: 'audio/webm' }),
      });
      const data = await apiRes.json();
      if (apiRes.ok) {
        setSubtitleText(data.text ?? '');
      } else {
        setSubtitleText(data?.error ?? t('upload.transcriptUnavailable'));
      }
    } catch {
      setSubtitleText(t('upload.transcriptUnavailable'));
    } finally {
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
      if (replaceTargetId) {
        const file = files[0];
        if (!file) return;
        setImages((prev) => {
          const prevImg = prev.find((img) => img.id === replaceTargetId);
          if (prevImg?.url) revokeBlobUrlIfNeeded(prevImg.url);
          const isVideo = file.type.startsWith('video/');
          return prev.map((img) =>
            img.id === replaceTargetId
              ? { ...img, url: URL.createObjectURL(file), type: (isVideo ? 'video' : 'image') as 'image' | 'video' }
              : img
          );
        });
        if (isDefault) setIsDefault(false);
        setReplaceTargetId(null);
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
      }
      e.target.value = '';
    },
    [replaceTargetId, isDefault, images]
  );

  const handleAudioSelected = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setAudioUrl((prev) => {
      if (prev) revokeBlobUrlIfNeeded(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const handleStartPlayback = useCallback(async () => {
    if (!canStart || isGenerating) return;
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationError(null);
    try {
      setGenerationProgress(5);
      // Convert blob URLs to persistent URLs one-by-one so progress moves on slow devices (avoids stuck at 5%)
      const uploadOpts = { userId: userId ?? undefined };
      const imageBlobUrls = images.filter((i) => i.type !== 'video').map((i) => i.url);
      const videoBlobUrls = images.filter((i) => i.type === 'video').map((i) => i.url);
      const totalUploads = Math.max(1, imageBlobUrls.length + videoBlobUrls.length + (audioUrl?.startsWith('blob:') ? 1 : 0) + (recordedAudioUrl?.startsWith('blob:') ? 1 : 0));
      const uploadProgressSpan = 10; // 5% -> 15%
      let uploadDone = 0;

      const imageUrls: string[] = [];
      for (let i = 0; i < imageBlobUrls.length; i++) {
        const url = await blobUrlToPersistentUrl(imageBlobUrls[i]!, { ...uploadOpts, filename: `vlog-img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg` });
        imageUrls.push(url);
        uploadDone += 1;
        setGenerationProgress(5 + (uploadDone / totalUploads) * uploadProgressSpan);
      }
      const videoUrls: string[] = [];
      for (let i = 0; i < videoBlobUrls.length; i++) {
        const url = await blobUrlToPersistentUrl(videoBlobUrls[i]!, { ...uploadOpts, filename: `vlog-vid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4` });
        videoUrls.push(url);
        uploadDone += 1;
        setGenerationProgress(5 + (uploadDone / totalUploads) * uploadProgressSpan);
      }
      let persistentAudio = audioUrl ?? DEFAULT_VLOG_AUDIO_URL;
      if (audioUrl && audioUrl.startsWith('blob:')) {
        persistentAudio = await blobUrlToPersistentUrl(audioUrl, { ...uploadOpts, filename: 'vlog-audio.mp3' });
        uploadDone += 1;
        setGenerationProgress(5 + (uploadDone / totalUploads) * uploadProgressSpan);
      }
      let persistentRecorded: string | null = recordedAudioUrl;
      if (recordedAudioUrl && recordedAudioUrl.startsWith('blob:')) {
        persistentRecorded = await blobUrlToPersistentUrl(recordedAudioUrl, { ...uploadOpts, filename: 'vlog-voice.webm' });
        uploadDone += 1;
        setGenerationProgress(5 + (uploadDone / totalUploads) * uploadProgressSpan);
      }

      setGenerationProgress(15);
      const firstImageUrl = imageUrls[0];
      let filterPreset = 'Original';
      let artifiedScript: string[] = subtitleText.split('\n').map((s) => s.trim()).filter(Boolean);
      if (firstImageUrl) {
        await new Promise((r) => setTimeout(r, 0)); // yield so 15% paints before heavy work (helps on slow devices)
        setGenerationProgress(18);
        const base64Image = await compressImageToBase64(firstImageUrl);
        setGenerationProgress(35);
        let recordedBase64: string | undefined;
        if (persistentRecorded) {
          try {
            const res = await fetch(persistentRecorded);
            const blob = await res.blob();
            recordedBase64 = await blobToBase64(blob);
          } catch {
            // optional
          }
        }
        setGenerationProgress(50);

        const API_TIMEOUT_MS = 90000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
        let progressInterval: ReturnType<typeof setInterval> | null = null;
        const startProgress = Date.now();
        progressInterval = setInterval(() => {
          const elapsed = (Date.now() - startProgress) / 1000;
          const bump = Math.min(Math.floor(elapsed / 2) * 3, 32);
          setGenerationProgress((p) => Math.min(p, 50 + bump));
        }, 2000);

        let res: Response;
        try {
          res = await fetch('/api/vlog-style-and-script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: memoryLocation.trim() || undefined,
              image: base64Image,
              scriptText: subtitleText.trim(),
              ...(recordedBase64 && {
                recordedAudioBase64: recordedBase64,
                recordedMimeType: 'audio/webm',
              }),
            }),
            signal: controller.signal,
          });
        } catch (fetchErr) {
          if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
            throw new Error('Request timed out. Please check your network and try again.');
          }
          throw fetchErr;
        } finally {
          clearTimeout(timeoutId);
          if (progressInterval) clearInterval(progressInterval);
        }
        setGenerationProgress(85);
        if (res.ok) {
          const data = await res.json();
          filterPreset = data.filterPreset ?? 'Original';
          if (Array.isArray(data.artifiedScript) && data.artifiedScript.length > 0) {
            artifiedScript = data.artifiedScript;
          }
        }
      }
      setGenerationProgress(95);
      const data: VlogData = {
        location: memoryLocation.trim(),
        images: imageUrls,
        videos: videoUrls,
        audio: persistentAudio,
        recordedAudio: persistentRecorded,
        subtitles: artifiedScript,
        filterPreset: filterPreset,
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
              {t('vlog.needPhotosAudioSubtitles')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
