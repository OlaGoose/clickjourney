'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ImagePlus,
  RefreshCw,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  X,
  Loader2,
  Pencil,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { GalleryDisplay } from '@/components/upload/GalleryDisplay';
import { StoryStepBar } from '@/components/upload/StoryStepBar';
import { CinematicGenerationLoader } from '@/components/upload/CinematicGenerationLoader';
import { ErrorDisplay } from '@/components/upload/ErrorDisplay';
import { DEFAULT_UPLOAD_IMAGES, UPLOAD_STEP_COUNT } from '@/lib/upload/constants';
import { compressMultipleImages } from '@/lib/utils/imageUtils';
import type { UploadedImage } from '@/types/upload';
import type { DirectorScript } from '@/types/cinematic';

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function MemoryUploadPage() {
  const router = useRouter();
  const [images, setImages] = useState<UploadedImage[]>(DEFAULT_UPLOAD_IMAGES);
  const [isDefault, setIsDefault] = useState(true);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  /** Step index: 0 = image upload, 1 = audio upload. Drives top story bar and bottom toolbar. */
  const [currentStep, setCurrentStep] = useState(0);

  // AI Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const generateCinematicMemory = useCallback(async () => {
    if (isDefault) {
      alert('请先上传至少一张照片');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationError(null);

    try {
      // Step 1: Compress images (20% progress)
      setGenerationProgress(10);
      const imageUrls = images.map((img) => img.url);
      const base64Images = await compressMultipleImages(
        imageUrls,
        (current, total) => {
          const progressPercent = 10 + (current / total) * 20;
          setGenerationProgress(progressPercent);
        }
      );

      // Step 2: Call AI generation API (30% -> 90%)
      setGenerationProgress(30);
      const response = await fetch('/api/generate-cinematic-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: base64Images,
          transcript: transcript || '',
          userContext: '', // Can be extended for user notes
        }),
      });

      setGenerationProgress(90);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const directorScript: DirectorScript = await response.json();

      // Step 3: Navigate to cinematic page (100%)
      setGenerationProgress(100);
      
      // Store in sessionStorage for immediate access
      sessionStorage.setItem('cinematicScript', JSON.stringify(directorScript));
      
      // Navigate after brief delay for visual feedback
      setTimeout(() => {
        router.push('/memories/cinematic');
      }, 500);

    } catch (error) {
      console.error('Failed to generate cinematic memory:', error);
      setGenerationError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
      setIsGenerating(false);
    }
  }, [images, isDefault, transcript, router]);

  const goToNextStep = useCallback(() => {
    if (currentStep === 0) {
      setCurrentStep(1);
    } else if (currentStep === 1) {
      // Generate cinematic memory
      generateCinematicMemory();
    }
  }, [currentStep, generateCinematicMemory]);

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
      if (!files || files.length === 0) return;

      if (replaceTargetId) {
        const file = files[0];
        if (!file) return;
        const newUrl = URL.createObjectURL(file);
        setImages((prev) =>
          prev.map((img) =>
            img.id === replaceTargetId ? { ...img, url: newUrl } : img
          )
        );
        if (isDefault) setIsDefault(false);
        setReplaceTargetId(null);
      } else {
        const currentImages = isDefault ? [] : images;
        const remainingSlots = 9 - currentImages.length;
        if (remainingSlots <= 0) {
          alert('最多只能上传 9 张照片');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
        const fileArray = Array.from(files).slice(0, remainingSlots);
        const newImages: UploadedImage[] = fileArray.map((file) => ({
          id: Math.random().toString(36).slice(2, 11),
          url: URL.createObjectURL(file),
        }));
        setImages([...currentImages, ...newImages]);
        setIsDefault(false);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [replaceTargetId, isDefault, images]
  );

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setTranscript('');
    try {
      const base64Data = await blobToBase64(audioBlob);
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64: base64Data,
          mimeType: 'audio/webm',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTranscript(data?.error ?? '无法识别录音内容');
        return;
      }
      setTranscript(data.text ?? '');
    } catch {
      setTranscript('无法识别录音内容');
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
        transcribeAudio(audioBlob);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setTranscript('');
      setShowTranscript(false);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      alert('无法访问麦克风，请检查权限设置。');
    }
  }, [transcribeAudio]);

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

  const deleteAudio = useCallback(() => {
    setAudioUrl(null);
    setIsPlaying(false);
    setShowTranscript(false);
    setTranscript('');
  }, []);

  const togglePlayback = useCallback(() => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
    } else {
      audioPlayerRef.current.play();
      setShowTranscript(true);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioPlayerRef.current;
    if (!audio) return;
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [audioUrl]);

  const handleReset = useCallback(() => {
    setImages(DEFAULT_UPLOAD_IMAGES);
    setIsDefault(true);
    setAudioUrl(null);
    setIsPlaying(false);
    setTranscript('');
    setShowTranscript(false);
    setCurrentStep(0);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-black selection:text-white">
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#CBE8FA] to-[#FCFDFD]" />

      {/* Cinematic Generation Loader */}
      <CinematicGenerationLoader
        isGenerating={isGenerating}
        progress={generationProgress}
      />

      {/* Error Display */}
      <ErrorDisplay
        error={generationError}
        onRetry={generateCinematicMemory}
        onDismiss={() => setGenerationError(null)}
      />

      {/* Top: Instagram-style step bar + back/reset row */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex flex-col"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="px-3 pb-2">
          <StoryStepBar
            steps={UPLOAD_STEP_COUNT}
            currentStep={currentStep}
            progress={1}
            className="w-full"
          />
        </div>
      </header>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*"
        className="hidden"
        aria-hidden
      />
      {audioUrl && (
        <audio ref={audioPlayerRef} src={audioUrl} className="hidden" aria-hidden />
      )}

      <main className="max-w-4xl w-full flex flex-col items-center gap-12 z-10 flex-1 pt-24 md:pt-28 pb-32 md:pb-36">
        <div className="w-full relative h-[360px] md:h-[500px] flex justify-center items-center">
          <GalleryDisplay
            images={images}
            onDelete={handleDeleteImage}
            onReplace={handleTriggerReplace}
          />
        </div>
      </main>

      {/* Fixed bottom toolbar (Instagram-style glass dock, center) */}
      <div
        className="fixed bottom-10 left-0 right-0 z-40 flex flex-col items-center pointer-events-none"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="w-full max-w-4xl flex flex-col items-center px-4 pointer-events-auto">
          {currentStep === 1 && showTranscript && audioUrl && (
            <div className="w-full max-w-sm mb-4">
              <div className="bg-white/60 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/40 p-5 relative">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Pencil size={14} className="text-gray-500" />
                    Transcript
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowTranscript(false)}
                    className="p-1.5 hover:bg-black/5 rounded-full text-gray-500 transition-colors"
                    aria-label="关闭"
                  >
                    <X size={14} />
                  </button>
                </div>
                {isTranscribing ? (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-500 gap-2">
                    <Loader2 size={24} className="animate-spin text-black" />
                    <p className="text-xs font-medium">Generating text...</p>
                  </div>
                ) : (
                  <textarea
                    className="w-full text-sm text-gray-800 leading-relaxed bg-transparent resize-none outline-none focus:bg-white/40 rounded-xl p-2 -ml-2 transition-colors placeholder:text-gray-400"
                    rows={4}
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="No transcript available"
                  />
                )}
              </div>
            </div>
          )}

          <div className="bg-white/30 backdrop-blur-2xl border border-white/40 shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-full p-2 flex items-center gap-2 transition-all duration-300">
            {currentStep === 0 ? (
              <>
                <button
                  type="button"
                  onClick={handleStartClick}
                  disabled={!isDefault && images.length >= 9}
                  className={`group flex items-center gap-1.5 px-5 py-2.5 rounded-full transition-all active:scale-95 ${
                    !isDefault && images.length >= 9
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-black hover:bg-gray-800 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  <ImagePlus size={16} strokeWidth={2.5} className="text-white" />
                  <span className="font-semibold text-[13px]">Upload</span>
                </button>
                <div className="w-px h-5 bg-black/10 mx-1" />
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={isDefault}
                  className={`group flex items-center gap-1.5 px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 ${
                    isDefault
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-black hover:bg-gray-800 text-white'
                  }`}
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                  <span className="font-semibold text-[13px]">Next</span>
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center">
                  {isRecording ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-red-500 text-white font-medium shadow-lg animate-pulse">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                        </span>
                        <span className="text-[13px] tabular-nums">{formatTime(recordingTime)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-black text-white hover:bg-gray-800 shadow-lg transition-all active:scale-95"
                        aria-label="停止录音"
                      >
                        <Square size={14} fill="currentColor" />
                      </button>
                    </div>
                  ) : audioUrl ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={togglePlayback}
                        className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all active:scale-95 shadow-lg ${
                          showTranscript ? 'bg-gray-800 text-white ring-2 ring-black/10' : 'bg-black hover:bg-gray-800 text-white'
                        }`}
                      >
                        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                        <span>Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={deleteAudio}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 text-gray-500 hover:text-red-500 transition-colors"
                        title="Delete"
                        aria-label="删除录音"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="group flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-black hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all active:scale-95"
                    >
                      <Mic size={16} strokeWidth={2.5} className="text-white" />
                      <span className="font-semibold text-[13px]">Record</span>
                    </button>
                  )}
                </div>
                <div className="w-px h-5 bg-black/10 mx-1" />
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={isDefault}
                  className={`group relative flex items-center gap-1.5 px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 overflow-hidden ${
                    isDefault
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-black via-gray-900 to-black hover:from-gray-900 hover:to-gray-900 text-white'
                  }`}
                >
                  {!isDefault && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                  )}
                  <Sparkles size={16} strokeWidth={2.5} className={isDefault ? '' : 'animate-pulse'} />
                  <span className="font-semibold text-[13px] relative z-10">Generate</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
