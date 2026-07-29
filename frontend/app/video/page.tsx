'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileVideo,
  Play,
  Pause,
  Stop,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  Download,
  Trash2,
  RotateCcw,
  Settings,
  X,
  Loader2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useInference } from '@/hooks/useInference';
import { useSentence } from '@/hooks/useSentence';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toggle, ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const CLASS_NAMES = [
  'ain', 'al', 'aleff', 'bb', 'dal', 'dha', 'dhad', 'fa',
  'gaaf', 'ghain', 'ha', 'haa', 'jeem', 'kaaf', 'khaa', 'la',
  'laam', 'meem', 'nun', 'ra', 'saad', 'seen', 'sheen', 'ta',
  'taa', 'thaa', 'thal', 'toot', 'waw', 'ya', 'yaa', 'zay'
];

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a85cf6', '#d946ef',
];

interface Detection {
  bbox: [number, number, number, number];
  confidence: number;
  class_id: number;
  class_name: string;
}

interface FramePrediction {
  frame: number;
  detections: Detection[];
}

export default function VideoPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [predictions, setPredictions] = useState<FramePrediction[]>([]);
  const [processedFrames, setProcessedFrames] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sampleRate, setSampleRate] = useState(1);
  const [confThreshold, setConfThreshold] = useState(0.3);
  const [iouThreshold, setIouThreshold] = useState(0.45);
  const animationRef = useRef<number>();
  const lastProcessTime = useRef(0);
  
  const { infer, isLoading } = useInference();
  const { 
    sentence, 
    addLetter, 
    addSpace, 
    clear, 
    undo, 
    exportSentence,
    canUndo 
  } = useSentence();

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }
    
    setError(null);
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    
    // Reset state
    setPredictions([]);
    setProcessedFrames(0);
    setCurrentFrame(0);
    clear();
  }, [clear]);

  // Video metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      // Estimate total frames
      setTotalFrames(Math.floor(videoRef.current.duration * 30));
    }
  }, []);

  // Process video
  const processVideo = useCallback(async () => {
    if (!videoFile || isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    setProcessedFrames(0);
    setPredictions([]);
    clear();
    
    try {
      // Create canvas for frame extraction
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const video = videoRef.current!;
      
      canvas.width = 640;
      canvas.height = 640;
      
      // Process frames
      const frameCount = Math.floor(video.duration * 30);
      const frameResults: FramePrediction[] = [];
      
      for (let frame = 0; frame < frameCount; frame += sampleRate) {
        if (!isProcessing) break; // Allow cancellation
        
        const time = frame / 30;
        video.currentTime = time;
        await new Promise(resolve => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve(void 0);
          };
          video.addEventListener('seeked', onSeeked);
        });
        
        // Draw frame to canvas
        ctx.drawImage(video, 0, 0, 640, 640);
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        // Run inference
        const result = await infer(base64);
        const detections = result.predictions || [];
        
        frameResults.push({ frame, detections });
        setProcessedFrames(prev => prev + 1);
        setPredictions(prev => [...prev, { frame, detections }]);
        
        // Update sentence
        for (const det of detections) {
          if (det.confidence > confThreshold) {
            addLetter(det.class_name, det.confidence);
          }
        }
        
        // Update progress
        if (frame % 30 === 0) {
          await new Promise(r => setTimeout(r, 0)); // Yield to UI
        }
      }
      
      setCurrentFrame(0);
      if (videoRef.current) videoRef.current.currentTime = 0;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
      console.error('Video processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [videoFile, isProcessing, sampleRate, confThreshold, infer, addLetter, clear]);

  // Cancel processing
  const cancelProcessing = useCallback(() => {
    setIsProcessing(false);
  }, []);

  // Play/Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    } else {
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.volume = volume;
      videoRef.current.play();
      requestAnimationFrame(updateFrame);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, playbackRate, volume]);

  // Update frame display
  const updateFrame = useCallback(() => {
    if (!videoRef.current || !isPlaying) return;
    
    const frame = Math.floor(videoRef.current.currentTime * 30);
    setCurrentFrame(frame);
    
    // Draw detections on overlay
    if (overlayRef.current && videoRef.current) {
      drawOverlay(frame);
    }
    
    animationRef.current = requestAnimationFrame(updateFrame);
  }, [isPlaying]);

  // Draw overlay
  const drawOverlay = useCallback((frame: number) => {
    if (!overlayRef.current || !videoRef.current) return;
    
    const ctx = overlayRef.current.getContext('2d')!;
    const video = videoRef.current;
    
    // Clear
    ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    
    // Find predictions for this frame
    const pred = predictions.find(p => p.frame === frame);
    if (!pred || !showBoxes) return;
    
    const scaleX = overlayRef.current.width / 640;
    const scaleY = overlayRef.current.height / 640;
    
    pred.detections.forEach(det => {
      const [x1, y1, x2, y2] = det.bbox;
      const color = COLORS[det.class_id % COLORS.length];
      
      const x = x1 * scaleX;
      const y = y1 * scaleY;
      const w = (x2 - x1) * scaleX;
      const h = (y2 - y1) * scaleY;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
      
      if (showLabels || showConfidence) {
        const label = showLabels ? CLASS_NAMES[det.class_id] : '';
        const conf = showConfidence ? `${(det.confidence * 100).toFixed(0)}%` : '';
        const text = [label, conf].filter(Boolean).join(' ');
        
        ctx.font = '14px system-ui';
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width + 12;
        const textHeight = 24;
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y - textHeight, textWidth, textHeight);
        
        ctx.fillStyle = 'white';
        ctx.fillText(text, x + 6, y - 6);
      }
    });
  }, [predictions, showBoxes, showLabels, showConfidence]);

  // Seek to frame
  const seekTo = useCallback((frame: number) => {
    if (!videoRef.current) return;
    const time = frame / 30;
    videoRef.current.currentTime = time;
    setCurrentFrame(frame);
    if (!isPlaying) drawOverlay(frame);
  }, [isPlaying, drawOverlay]);

  // Download annotated video (placeholder)
  const downloadVideo = useCallback(async () => {
    // Would require server-side processing or MediaRecorder
    alert('Video download requires server-side processing. Use the export feature for predictions.');
  }, []);

  // Export predictions
  const exportPredictions = useCallback(() => {
    const data = JSON.stringify(predictions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asl-predictions-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [predictions]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  // Handle canvas resize
  useEffect(() => {
    if (videoRef.current && overlayRef.current && videoRef.current.videoWidth) {
      overlayRef.current.width = videoRef.current.videoWidth;
      overlayRef.current.height = videoRef.current.videoHeight;
    }
  }, [videoRef.current?.videoWidth]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface-elevated/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
              <FileVideo className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Video Processing</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={downloadVideo} disabled={predictions.length === 0}>
                    <Download className="h-4 w-4" />
                    <TooltipContent side="bottom">Download Video</TooltipContent>
                  </Button>
                </TooltipTrigger>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={exportPredictions} disabled={predictions.length === 0}>
                    <RotateCcw className="h-4 w-4" />
                    <TooltipContent side="bottom">Export JSON</TooltipContent>
                  </Button>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Upload/Controls */}
        <div className="px-4 pb-3 border-t border-border/50">
          {!videoFile ? (
            // Upload Area
            <div 
              className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary-500 transition-colors cursor-pointer"
              onClick={() => document.getElementById('video-upload')?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary-500'); }}
              onDragLeave={e => { e.currentTarget.classList.remove('border-primary-500'); }}
              onDrop={e => { 
                e.preventDefault(); 
                e.currentTarget.classList.remove('border-primary-500');
                if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
              }}
            >
              <input
                id="video-upload"
                type="file"
                accept="video/mp4,video/avi,video/quicktime,video/x-matroska"
                className="hidden"
                onChange={e => e.target.files[0] && handleFileSelect(e.target.files[0])}
              />
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Drop video here or click to browse</h3>
              <p className="text-sm text-muted-foreground">MP4, AVI, MOV, MKV up to 100MB</p>
            </div>
          ) : (
            // Video Controls
            <div className="space-y-3">
              {/* Progress Bar */}
              <div className="flex items-center gap-4">
                <Progress 
                  value={duration > 0 ? (videoRef.current?.currentTime || 0) / duration * 100 : 0} 
                  className="flex-1 h-2"
                />
                <span className="text-sm text-muted-foreground font-mono w-20 text-right">
                  {videoRef.current ? `${(videoRef.current.currentTime || 0).toFixed(1)}s` : '0s'}
                </span>
                <span className="text-sm text-muted-foreground font-mono w-20">
                  {duration.toFixed(1)}s
                </span>
              </div>
              
              {/* Controls Row */}
              <div className="flex flex-wrap items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => seekTo(Math.max(0, currentFrame - 30 * 10))} disabled={!videoFile}>
                      <SkipBack className="h-4 w-4" />
                      <TooltipContent side="bottom">Back 10s</TooltipContent>
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={isPlaying ? 'secondary' : 'outline'} 
                      size="icon" 
                      onClick={togglePlay}
                      disabled={!videoFile}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      <TooltipContent side="bottom">{isPlaying ? 'Pause' : 'Play'}</TooltipContent>
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => seekTo(Math.min(totalFrames, currentFrame + 30 * 10))} disabled={!videoFile}>
                      <SkipForward className="h-4 w-4" />
                      <TooltipContent side="bottom">Forward 10s</TooltipContent>
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
                
                <Separator className="h-8" orientation="vertical" />
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => videoRef.current && (videoRef.current.currentTime = 0)} disabled={!videoFile}>
                      <RotateCcw className="h-4 w-4" />
                      <TooltipContent side="bottom">Restart</TooltipContent>
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => videoRef.current && setVolume(videoRef.current.muted ? 1 : 0)} disabled={!videoFile}>
                      {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      <TooltipContent side="bottom">Mute/Unmute</TooltipContent>
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
                
                <Separator className="h-8" orientation="vertical" />
                
                {/* Playback Speed */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Select value={playbackRate.toString()} onValueChange={e => setPlaybackRate(Number(e))} disabled={!videoFile}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.25">0.25x</SelectItem>
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="1.5">1.5x</SelectItem>
                        <SelectItem value="2">2x</SelectItem>
                      </SelectContent>
                    </Select>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Playback Speed</TooltipContent>
                </Tooltip>
                
                <Separator className="h-8" orientation="vertical" />
                
                {/* Processing Controls */}
                {!isProcessing ? (
                  <Button 
                    size="lg" 
                    onClick={processVideo}
                    disabled={isLoading || processedFrames > 0}
                    className="gap-2"
                  >
                    <Loader2 className="h-4 w-4" />
                    {processedFrames > 0 ? 'Re-process' : 'Process Video'}
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    variant="secondary" 
                    onClick={cancelProcessing}
                    className="gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </Button>
                )}
                
                {processedFrames > 0 && !isProcessing && (
                  <Button variant="outline" size="sm" onClick={() => setVideoFile(null)}>
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
              
              {/* Processing Settings */}
              {isProcessing && (
                <div className="flex items-center gap-4 text-sm">
                  <span>Sample every</span>
                  <Select value={sampleRate.toString()} onValueChange={e => setSampleRate(Number(e))}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 frame</SelectItem>
                      <SelectItem value="2">2 frames</SelectItem>
                      <SelectItem value="5">5 frames</SelectItem>
                      <SelectItem value="10">10 frames</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>• Conf:</span>
                  <Slider value={[confThreshold]} onValueChange={([v]) => setConfThreshold(v)} min={0} max={1} step={0.05} className="w-32" />
                  <span className="w-10">{confThreshold.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 relative bg-black min-w-0 flex flex-col">
          <div className="relative flex-1">
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center max-w-md"
                >
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
                  <p className="text-gray-300 mb-4">{error}</p>
                  <Button variant="outline" onClick={() => setError(null)}>Dismiss</Button>
                </motion.div>
              </div>
            )}
            
            {!videoFile && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-8">
                <FileVideo className="h-24 w-24 mb-6 opacity-50" />
                <h2 className="text-2xl font-medium mb-2">No Video Selected</h2>
                <p className="text-center max-w-md">
                  Upload a video file to analyze Arabic Sign Language frame by frame.
                  The system will process each frame and build sentences from detections.
                </p>
              </div>
            )}
            
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-contain"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentFrame(Math.floor(videoRef.current.currentTime * 30));
                }
              }}
            />
            
            <canvas
              ref={overlayRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            
            {/* Processing Progress Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center p-8"
                >
                  <Loader2 className="h-12 w-12 text-primary-500 animate-spin mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Processing Video</h3>
                  <p className="text-gray-300 mb-4">
                    Frame {processedFrames} / ~{totalFrames}
                  </p>
                  <Progress value={totalFrames > 0 ? processedFrames / totalFrames * 100 : 0} className="w-64" />
                  <Button variant="secondary" onClick={cancelProcessing} className="mt-4">Cancel</Button>
                </motion.div>
              </div>
            )}
          </div>
          
          {/* Timeline with detection markers */}
          {videoFile && (
            <div className="h-16 bg-surface-elevated border-t border-border relative overflow-hidden">
              <div className="absolute inset-0 flex items-end" style={{ transform: 'scaleY(0.5)' }}>
                {predictions.map((pred, i) => {
                  if (pred.detections.length === 0) return null;
                  const x = (pred.frame / Math.max(totalFrames, 1)) * 100;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scaleY: 0 }}
                      animate={{ opacity: 1, scaleY: 1 }}
                      style={{ 
                        left: `${x}%`,
                        height: `${Math.min(pred.detections.length * 10, 100)}%`,
                        width: '2px',
                        background: COLORS[pred.detections[0].class_id % COLORS.length],
                      }}
                      className="absolute bottom-0 rounded-t transition-opacity"
                    />
                  );
                })}
                {/* Current position indicator */}
                <motion.div
                  animate={{ left: `${totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0}%` }}
                  transition={{ duration: 0.1 }}
                  style={{ 
                    width: '2px', 
                    height: '100%', 
                    background: '#ef4444',
                    zIndex: 10 
                  }}
                  className="absolute top-0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-80 sm:w-96 border-l border-border bg-surface-elevated flex flex-col overflow-hidden">
          {/* Sentence Builder */}
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">Sentence Builder</h2>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={clear} disabled={!sentence && !canUndo}>
                      <Trash2 className="h-4 w-4" />
                      <TooltipContent side="left">Clear</TooltipContent>
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo}>
                      <RotateCcw className="h-4 w-4" />
                      <TooltipContent side="left">Undo</TooltipContent>
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => exportSentence('txt')}>
                      <Download className="h-4 w-4" />
                      <TooltipContent side="left">Export</TooltipContent>
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
              </div>
            </div>
            
            <div className="min-h-[100px] max-h-[200px] overflow-y-auto pr-2">
              <p 
                className="text-right rtl font-arabic text-2xl sm:text-3xl font-medium text-foreground leading-relaxed 
                  min-h-[60px] flex items-end justify-end p-2 
                  bg-primary-50 dark:bg-primary-900/20 rounded-xl"
                dir="rtl"
                style={{ fontFamily: '"Noto Sans Arabic", "Amiri", system-ui, sans-serif' }}
              >
                {sentence || <span className="text-muted-foreground text-base">Process video to build sentence...</span>}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={addSpace} className="flex-1 min-w-[80px]">
                Space
              </Button>
              <Button variant="outline" size="sm" onClick={clear} disabled={!sentence && !canUndo} className="flex-1 min-w-[80px]">
                Clear
              </Button>
            </div>
          </div>

          {/* Frame Predictions */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex-shrink-0">
              <h2 className="font-semibold text-foreground">Frame Predictions</h2>
              <p className="text-sm text-muted-foreground">
                {processedFrames} frames processed • {predictions.filter(p => p.detections.length > 0).length} with detections
              </p>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {predictions
                    .filter(p => p.detections.length > 0)
                    .slice(-20)
                    .reverse()
                    .map((pred, i) => (
                      <motion.div
                        key={`${pred.frame}-${i}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-3 rounded-lg bg-surface border border-border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-mono text-muted-foreground">Frame {pred.frame}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                            {pred.detections.length} detections
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {pred.detections.slice(0, 5).map((det, j) => (
                            <span
                              key={j}
                              className="px-2 py-1 text-xs rounded-full font-medium"
                              style={{
                                background: `${COLORS[det.class_id % COLORS.length]}20`,
                                color: COLORS[det.class_id % COLORS.length],
                                border: `1px solid ${COLORS[det.class_id % COLORS.length]}`
                              }}
                            >
                              {CLASS_NAMES[det.class_id]} {(det.confidence * 100).toFixed(0)}%
                            </span>
                          ))}
                          {pred.detections.length > 5 && (
                            <span className="px-2 py-1 text-xs rounded-full text-muted-foreground bg-muted">
                              +{pred.detections.length - 5} more
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  {predictions.filter(p => p.detections.length > 0).length === 0 && (
                    <motion.div
                      className="p-4 rounded-lg bg-surface border border-border text-center text-muted-foreground text-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      No detections yet. Process a video to see frame-by-frame predictions.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>

          {/* Stats */}
          <Card className="m-4">
            <Card.Header className="pb-2">
              <Card.Title className="text-sm">Video Info</Card.Title>
            </Card.Header>
            <Card.Content className="pt-0 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-surface border border-border">
                  <div className="text-muted-foreground text-xs">Duration</div>
                  <div className="font-mono font-bold">{duration.toFixed(1)}s</div>
                </div>
                <div className="p-2 rounded bg-surface border border-border">
                  <div className="text-muted-foreground text-xs">Frames</div>
                  <div className="font-mono font-bold">{totalFrames}</div>
                </div>
                <div className="p-2 rounded bg-surface border border-border">
                  <div className="text-muted-foreground text-xs">Processed</div>
                  <div className="font-mono font-bold">{processedFrames}</div>
                </div>
                <div className="p-2 rounded bg-surface border border-border">
                  <div className="text-muted-foreground text-xs">Detections</div>
                  <div className="font-mono font-bold">{predictions.filter(p => p.detections.length > 0).length}</div>
                </div>
              </div>
            </Card.Content>
          </Card>
        </aside>
      </main>
    </div>
  );
}