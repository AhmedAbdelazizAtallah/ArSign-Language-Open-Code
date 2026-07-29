'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Camera,
  CameraOff,
  Maximize2,
  Minimize2,
  Zap,
  Clock,
  Cpu,
  Download,
  Copy,
  Trash2,
  RotateCcw,
  Settings,
  X,
  Check,
  AlertCircle,
  Loader2,
  Mic,
  MicOff,
} from 'lucide-react';
import { useInference } from '@/hooks/useInference';
import { useSentence } from '@/hooks/useSentence';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toggle, ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
];

interface Detection {
  bbox: [number, number, number, number];
  confidence: number;
  class_id: number;
  class_name: string;
}

export default function CameraPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [resolution, setResolution] = useState<'640x480' | '1280x720' | '1920x1080'>('1280x720');
  const [targetFPS, setTargetFPS] = useState(30);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [stats, setStats] = useState({ fps: 0, latency: 0, inference: 0 });
  const animationRef = useRef<number>();
  const lastTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const fpsRef = useRef(0);
  
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

  // Get available cameras
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0 && !selectedDevice) {
          setSelectedDevice(videoDevices[0].deviceId);
        }
      })
      .catch(console.error);
  }, [selectedDevice]);

  // Start camera
  const startCamera = useCallback(async () => {
    if (isActive) return;
    
    try {
      setError(null);
      const [width, height] = resolution.split('x').map(Number);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          facingMode: selectedDevice ? undefined : facingMode,
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: targetFPS, max: targetFPS },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Set canvas size to match video
        videoRef.current.onloadedmetadata = () => {
          if (canvasRef.current && overlayRef.current) {
            canvasRef.current.width = videoRef.current!.videoWidth;
            canvasRef.current.height = videoRef.current!.videoHeight;
            overlayRef.current.width = videoRef.current!.videoWidth;
            overlayRef.current.height = videoRef.current!.videoHeight;
          }
        };
        
        setIsActive(true);
        lastTimeRef.current = performance.now();
        requestAnimationFrame(processFrame);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start camera');
      console.error('Camera error:', err);
    }
  }, [isActive, resolution, facingMode, targetFPS, selectedDevice]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsActive(false);
    setIsFullscreen(false);
  }, []);

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    if (isActive) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  }, [isActive, startCamera, stopCamera]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!overlayRef.current) return;
    
    if (!isFullscreen) {
      try {
        await overlayRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Fullscreen error:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error('Exit fullscreen error:', err);
      }
    }
  }, [isFullscreen]);

  // Take snapshot
  const takeSnapshot = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(videoRef.current, 0, 0);
    
    // Draw detections on snapshot
    // ... detection drawing logic
    
    const link = document.createElement('a');
    link.download = `asl-snapshot-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  // Process frame
  const processFrame = async (time: number) => {
    if (!isActive || !videoRef.current || !overlayRef.current) return;
    
    const ctx = overlayRef.current.getContext('2d')!;
    const video = videoRef.current;
    
    // Clear overlay
    ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    
    // Run inference every few frames for performance
    frameCountRef.current++;
    const shouldInfer = frameCountRef.current % Math.max(1, Math.floor(30 / targetFPS)) === 0;
    
    let detections: Detection[] = [];
    
    if (shouldInfer && !isLoading) {
      const startInfer = performance.now();
      try {
        // Convert video frame to base64
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 640;
        tempCanvas.height = 640;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.drawImage(video, 0, 0, 640, 640);
        const base64 = tempCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        const result = await infer(base64);
        detections = result.predictions || [];
        
        const inferTime = performance.now() - startInfer;
        setStats(prev => ({ ...prev, inference: inferTime }));
        
        // Add to sentence builder
        for (const det of detections) {
          if (det.confidence > 0.5) {
            addLetter(det.class_name, det.confidence);
          }
        }
      } catch (err) {
        console.error('Inference error:', err);
      }
    }
    
    // Draw detections
    if (showBoxes && detections.length > 0) {
      detections.forEach((det, i) => {
        const [x1, y1, x2, y2] = det.bbox;
        const color = COLORS[det.class_id % COLORS.length];
        
        // Scale coordinates to overlay size
        const scaleX = overlayRef.current!.width / 640;
        const scaleY = overlayRef.current!.height / 640;
        
        const x = x1 * scaleX;
        const y = y1 * scaleY;
        const w = (x2 - x1) * scaleX;
        const h = (y2 - y1) * scaleY;
        
        // Draw box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
        
        // Draw label background
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
    }
    
    // Calculate FPS
    const elapsed = time - lastTimeRef.current;
    if (elapsed >= 1000) {
      fpsRef.current = frameCountRef.current;
      frameCountRef.current = 0;
      lastTimeRef.current = time;
      setStats(prev => ({ ...prev, fps: fpsRef.current }));
    }
    
    const frameTime = performance.now() - time;
    setStats(prev => ({ ...prev, latency: frameTime }));
    
    animationRef.current = requestAnimationFrame(processFrame);
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface-elevated/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
              <Camera className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Live Camera</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleFullscreen}
                    disabled={!isActive}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    <TooltipContent side="bottom">Toggle Fullscreen</TooltipContent>
                  </Button>
                </TooltipTrigger>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={takeSnapshot} disabled={!isActive}>
                    <Download className="h-4 w-4" />
                    <TooltipContent side="bottom">Take Snapshot</TooltipContent>
                  </Button>
                </TooltipTrigger>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={switchCamera} disabled={!isActive || devices.length < 2}>
                    <RotateCcw className="h-4 w-4" />
                    <TooltipContent side="bottom">Switch Camera</TooltipContent>
                  </Button>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
            
            <div className="flex items-center gap-2 ml-4 px-3 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium">
              <Zap className="h-3 w-3" />
              <span>{stats.fps} FPS</span>
              <Separator className="h-4 mx-1" orientation="vertical" />
              <Clock className="h-3 w-3" />
              <span>{stats.latency.toFixed(1)}ms</span>
            </div>
          </div>
          
          {/* Controls */}
          <div className="px-4 pb-3 border-t border-border/50">
            <div className="flex flex-wrap items-center gap-4">
              {/* Camera Select */}
              {devices.length > 1 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Select value={selectedDevice} onValueChange={setSelectedDevice} disabled={isActive}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select Camera" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.map(device => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${devices.indexOf(device) + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Select Camera</TooltipContent>
                </Tooltip>
              )}
              
              {/* Resolution */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Select value={resolution} onValueChange={setResolution} disabled={isActive}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="640x480">640×480</SelectItem>
                      <SelectItem value="1280x720">1280×720</SelectItem>
                      <SelectItem value="1920x1080">1920×1080</SelectItem>
                    </SelectContent>
                  </Select>
                </TooltipTrigger>
                <TooltipContent side="bottom">Resolution</TooltipContent>
              </Tooltip>
              
              {/* FPS */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Select value={targetFPS.toString()} onValueChange={e => setTargetFPS(Number(e))} disabled={isActive}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 FPS</SelectItem>
                      <SelectItem value="30">30 FPS</SelectItem>
                      <SelectItem value="60">60 FPS</SelectItem>
                    </SelectContent>
                  </Select>
                </TooltipTrigger>
                <TooltipContent side="bottom">Target FPS</TooltipContent>
              </Tooltip>
              
              <Separator className="h-8" orientation="vertical" />
              
              {/* Display Options */}
              <ToggleGroup type="multiple" defaultValue={['boxes', 'labels', 'confidence']} className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="boxes" onValueChange={v => setShowBoxes(v.includes('boxes'))}>
                      <Check className="h-4 w-4" />
                      <span className="hidden sm:inline">Boxes</span>
                      <TooltipContent side="bottom">Show Boxes</TooltipContent>
                    </TooltipTrigger>
                  </Tooltip>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="labels" onValueChange={v => setShowLabels(v.includes('labels'))}>
                      <span className="hidden sm:inline">Labels</span>
                      <TooltipContent side="bottom">Show Labels</TooltipContent>
                    </TooltipTrigger>
                  </Tooltip>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="confidence" onValueChange={v => setShowConfidence(v.includes('confidence'))}>
                      <span className="hidden sm:inline">Conf.</span>
                      <TooltipContent side="bottom">Show Confidence</TooltipContent>
                    </TooltipTrigger>
                  </Tooltip>
                </Tooltip>
              </ToggleGroup>
              
              <Separator className="h-8" orientation="vertical" />
              
              {/* Start/Stop */}
              {!isActive ? (
                <Button 
                  size="lg" 
                  onClick={startCamera}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start Camera'}
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  variant="destructive" 
                  onClick={stopCamera}
                  className="gap-2"
                >
                  <CameraOff className="h-4 w-4" />
                  Stop Camera
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 relative bg-black min-w-0">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-md"
              >
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Camera Error</h2>
                <p className="text-gray-300 mb-4">{error}</p>
                <Button onClick={() => { setError(null); startCamera(); }}>Retry</Button>
              </motion.div>
            </div>
          )}
          
          {!isActive && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-8">
              <Camera className="h-24 w-24 mb-6 opacity-50" />
              <h2 className="text-2xl font-medium mb-2">Camera Inactive</h2>
              <p className="text-center max-w-md">
                Configure your camera settings above and click "Start Camera" to begin 
                real-time Arabic Sign Language recognition.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm opacity-70">
                <span>📷 Camera Access Required</span>
                <span>🔒 HTTPS or localhost only</span>
                <span>⚡ 30+ FPS target</span>
              </div>
            </div>
          )}
          
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          
          <canvas
            ref={overlayRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ touchAction: 'none' }}
          />
          
          {/* FPS Counter Overlay */}
          {isActive && showConfidence && (
            <div className="absolute bottom-4 left-4 flex flex-col gap-1 z-10">
              <motion.div
                className="px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur text-white text-sm font-mono"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {stats.fps} FPS • {stats.latency.toFixed(1)}ms • {stats.inference.toFixed(1)}ms infer
              </motion.div>
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
                      <TooltipContent side="left">Clear All</TooltipContent>
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
                {sentence || <span className="text-muted-foreground text-base">Start signing...</span>}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={addSpace} className="flex-1">
                <span min-w-[80px]>
                Space
              </Button>
              <Button variant="outline" size="sm" onClick={clear} disabled={!sentence && !canUndo} className="flex-1 min-w-[80px]">
                Clear
              </Button>
            </div>
          </div>

          {/* Detection History */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex-shrink-0">
              <h2 className="font-semibold text-foreground">Recent Detections</h2>
              <p className="text-sm text-muted-foreground">Real-time predictions</p>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {/* Detections would be listed here in real-time */}
                  <motion.div
                    className="p-3 rounded-lg bg-surface border border-border text-center text-muted-foreground text-sm"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    No detections yet. Start the camera and sign in front of it.
                  </motion.div>
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>

          {/* Stats */}
          <Card className="m-4">
            <Card.Header className="pb-2">
              <Card.Title className="text-sm">Performance</Card.Title>
            </Card.Header>
            <Card.Content className="pt-0 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-surface border border-border">
                  <div className="text-muted-foreground text-xs">FPS</div>
                  <div className="font-mono font-bold text-lg">{stats.fps}</div>
                </div>
                <div className="p-2 rounded bg-surface border border-border">
                  <div className="text-muted-foreground text-xs">Latency</div>
                  <div className="font-mono font-bold text-lg">{stats.latency.toFixed(1)}ms</div>
                </div>
                <div className="p-2 rounded bg-surface border border-border">
                  <div className="text-muted-foreground text-xs">Inference</div>
                  <div className="font-mono font-bold text-lg">{stats.inference.toFixed(1)}ms</div>
                </div>
                <div className="p-2 rounded bg-surface border border-border">
                  <div className="text-muted-foreground text-xs">Device</div>
                  <div className="font-mono font-bold text-lg truncate">{facingMode}</div>
                </div>
              </div>
            </Card.Content>
          </Card>
        </aside>
      </main>
    </div>
  );
}