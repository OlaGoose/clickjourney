'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wand2, 
  X, 
  Image as ImageIcon,
  ScanEye,
  Settings,
  Play,
  Volume2,
  Sparkles
} from 'lucide-react';
import { AspectRatio, ImageSize } from '@/types/cinematic';
import * as GeminiService from '@/lib/services/geminiCinematic';

interface AIDirectorPanelProps {
  showTools: boolean;
  onClose: () => void;
  selectedBlockId: string | null;
  selectedBlock?: { image?: string; text: string } | null;
  onUpdateBlock: (id: string, updates: any) => void;
  onAddNewBlock: (image?: string, text?: string) => void;
}

export const AIDirectorPanel = ({
  showTools,
  onClose,
  selectedBlockId,
  selectedBlock,
  onUpdateBlock,
  onAddNewBlock
}: AIDirectorPanelProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.RATIO_16_9);
  const [imageSize, setImageSize] = useState<ImageSize>(ImageSize.SIZE_1K);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleGenerateImage = async () => {
    if (!prompt) return;
    setIsProcessing(true);
    try {
      const base64Image = await GeminiService.generateImage(prompt, aspectRatio, imageSize);
      if (selectedBlockId) {
        onUpdateBlock(selectedBlockId, { image: base64Image });
      } else {
        onAddNewBlock(base64Image, prompt);
      }
      setPrompt("");
    } catch (e) {
      alert("Failed to generate image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditImage = async () => {
    if (!selectedBlockId || !prompt || !selectedBlock?.image) return;
    const blockImage = selectedBlock.image;
    
    setIsProcessing(true);
    try {
      let imageToEdit = blockImage;
      if (imageToEdit.startsWith('http')) {
        try {
          const resp = await fetch(imageToEdit);
          const blob = await resp.blob();
          imageToEdit = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          alert("External image CORS error. Upload a local image first.");
          setIsProcessing(false);
          return;
        }
      }

      const editedImage = await GeminiService.editImage(imageToEdit, prompt);
      onUpdateBlock(selectedBlockId, { image: editedImage });
      setPrompt("");
    } catch (e) {
      alert("Edit failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedBlockId || !selectedBlock?.image) return;
    const blockImage = selectedBlock.image;
    
    setIsProcessing(true);
    try {
      let imageToAnalyze = blockImage;
      if (imageToAnalyze.startsWith('http')) {
        try {
          const resp = await fetch(imageToAnalyze);
          const blob = await resp.blob();
          imageToAnalyze = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          alert("External image CORS error.");
          setIsProcessing(false);
          return;
        }
      }

      const caption = await GeminiService.analyzeImage(imageToAnalyze);
      onUpdateBlock(selectedBlockId, { text: caption });
    } catch (e) {
      alert("Analysis failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTTS = async () => {
    if (!selectedBlockId || !selectedBlock?.text) return;
    const blockText = selectedBlock.text;
    
    setIsProcessing(true);
    try {
      const audioBuffer = await GeminiService.generateSpeech(blockText);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
      source.onended = () => setIsPlayingAudio(false);
      setIsPlayingAudio(true);
    } catch (e) {
      console.error(e);
      alert("TTS Failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {showTools && (
        <motion.div 
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          className="fixed bottom-0 left-0 w-full z-50 bg-[#0a0a0a]/95 backdrop-blur-3xl rounded-t-3xl p-6 md:p-8 shadow-2xl"
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Wand2 size={18} className="text-blue-400" />
                <h3 className="text-lg font-serif text-white/90">Gemini Director</h3>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X size={18} className="text-gray-500 hover:text-white" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Generate, edit, or analyze..."
                  className="w-full bg-white/5 border-none rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:bg-white/10 resize-none h-32 font-sans text-sm transition-all"
                />
                
                <div className="flex gap-4">
                  <select 
                    value={aspectRatio} 
                    onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                    className="flex-1 bg-white/5 text-gray-400 text-xs p-3 rounded-lg border-none outline-none appearance-none"
                  >
                    {Object.values(AspectRatio).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select 
                    value={imageSize} 
                    onChange={(e) => setImageSize(e.target.value as ImageSize)}
                    className="flex-1 bg-white/5 text-gray-400 text-xs p-3 rounded-lg border-none outline-none appearance-none"
                  >
                    {Object.values(ImageSize).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 content-start">
                <button 
                  onClick={handleGenerateImage}
                  disabled={isProcessing}
                  className="group flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all disabled:opacity-30"
                >
                  <ImageIcon className="text-blue-400/80 group-hover:text-blue-400 w-5 h-5" />
                  <span className="text-xs font-medium text-gray-300">Generate</span>
                </button>

                <AIActionButton
                  icon={Settings}
                  label="Edit Media"
                  color="purple"
                  disabled={!selectedBlockId || isProcessing}
                  onClick={handleEditImage}
                />

                <AIActionButton
                  icon={ScanEye}
                  label="Analyze"
                  color="green"
                  disabled={!selectedBlockId || isProcessing}
                  onClick={handleAnalyzeImage}
                />

                <AIActionButton
                  icon={isPlayingAudio ? Volume2 : Play}
                  label="Narrate"
                  color="yellow"
                  disabled={!selectedBlockId || isProcessing}
                  onClick={handleTTS}
                  isAnimated={isPlayingAudio}
                />
              </div>
            </div>
            
            {isProcessing && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-t-3xl z-50">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <p className="text-xs text-white/50 font-medium tracking-widest uppercase animate-pulse">Processing</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface AIActionButtonProps {
  icon: any;
  label: string;
  color: 'purple' | 'green' | 'yellow';
  disabled: boolean;
  onClick: (arg?: any) => void;
  isAnimated?: boolean;
}

const AIActionButton = ({ 
  icon: Icon, 
  label, 
  color, 
  disabled, 
  onClick,
  isAnimated = false 
}: AIActionButtonProps) => {
  const colorClasses = {
    purple: 'text-purple-400/80 group-hover:text-purple-400',
    green: 'text-green-400/80 group-hover:text-green-400',
    yellow: 'text-yellow-400/80 group-hover:text-yellow-400'
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all disabled:opacity-30"
    >
      <Icon className={`${colorClasses[color]} w-5 h-5 ${isAnimated ? 'animate-pulse' : ''}`} />
      <span className="text-xs font-medium text-gray-300">{label}</span>
    </button>
  );
};
