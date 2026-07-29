'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Image as ImageIcon,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Trash2,
  Settings,
  X,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Check,
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

export default function ImagePage() {
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [confThreshold, setConfThreshold] = useState(0.3);
  const [iouThreshold, setIouThreshold] = useState(0.45);
  const [maxDetections, setMaxDetections] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
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
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    setError(null);
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    
    // Reset state
    setDetections([]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    clear();
  }, [clear]);

  // Image loaded
  const handleImageLoad = useCallback(() => {
    if (imgRef.current && canvasRef.current && overlayRef.current) {
      const img = imgRef.current;
      canvasRef.current.width = img.naturalWidth;
      canvasRef.current.height = img.naturalHeight;
      overlayRef.current.width = img.naturalWidth;
      overlayRef.current.height = img.naturalHeight;
      drawImage();
      drawOverlay();
    }
  }, []);

  // Draw image on canvas
  const drawImage = useCallback(() => {
    if (!canvasRef.current || !imgRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.drawImage(imgRef.current, 0, 0);
  }, []);

  // Draw detections overlay
  const drawOverlay = useCallback(() => {
    if (!overlayRef.current || !showBoxes) return;
    
    const ctx = overlayRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    
    detections.forEach(det => {
      const [x1, y1, x2, y2] = det.bbox;
      const color = COLORS[det.class_id % COLORS.length];
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      
      if (showLabels || showConfidence) {
        const label = showLabels ? CLASS_NAMES[det.class_id] : '';
        const conf = showConfidence ? `${(det.confidence * 100).toFixed(0)}%` : '';
        const text = [label, conf].filter(Boolean).join(' ');
        
        ctx.font = '14px system-ui';
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width + 12;
        const textHeight = 24;
        
        ctx.fillStyle = color;
        ctx.fillRect(x1, y1 - textHeight, textWidth, textHeight);
        
        ctx.fillStyle = 'white';
        ctx.fillText(text, x1 + 6, y1 - 6);
      }
    });
  }, [detections, showBoxes, showLabels, showConfidence]);

  // Process image
  const processImage = useCallback(async () => {
    if (!imageFile || isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    setDetections([]);
    clear();
    
    try {
      // Convert to base64
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      img.src = imageUrl;
      await new Promise(resolve => { img.onload = resolve; });
      
      canvas.width = 640;
      canvas.height = 640;
      ctx.drawImage(img, 0, 0, 640, 640);
      const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
      
      // Run inference
      const result = await infer(base64);
      const newDetections = result.predictions || [];
      
      setDetections(newDetections);
      drawOverlay();
      
      // Update sentence
      for (const det of newDetections) {
        if (det.confidence > confThreshold) {
          addLetter(det.class_name, det.confidence);
        }
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
      console.error('Image processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [imageFile, isProcessing, imageUrl, infer, confThreshold, addLetter, clear, drawOverlay]);

  // Download annotated image
  const downloadImage = useCallback(() => {
    if (!canvasRef.current) return;
    
    // Create combined canvas
    const combined = document.createElement('canvas');
    combined.width = canvasRef.current.width;
    combined.height = canvasRef.current.height;
    const ctx = combined.getContext('2d')!;
    
    // Draw original image
    ctx.drawImage(canvasRef.current, 0, 0);
    
    // Draw detections
    detections.forEach(det => {
      const [x1, y1, x2, y2] = det.bbox;
      const color = COLORS[det.class_id % COLORS.length];
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      
      if (showLabels || showConfidence) {
        const label = showLabels ? CLASS_NAMES[det.class_id] : '';
        const conf = showConfidence ? `${(det.confidence * 100).toFixed(0)}%` : '';
        const text = [label, conf].filter(Boolean).join(' ');
        
        ctx.font = '14px system-ui';
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width + 12;
        const textHeight = 24;
        
        ctx.fillStyle = color;
        ctx.fillRect(x1, y1 - textHeight, textWidth, textHeight);
        
        ctx.fillStyle = 'white';
        ctx.fillText(text, x1 + 6, y1 - 6);
      }
    });
    
    const link = document.createElement('a');
    link.download = `asl-annotated-${Date.now()}.png`;
    link.href = combined.toDataURL('image/png');
    link.click();
  }, [detections, showLabels, showConfidence]);

  // Export JSON
  const exportJSON = useCallback(() => {
    const data = JSON.stringify(detections, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asl-detections-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [detections]);

  // Zoom controls
  const zoomIn = useCallback(() => setZoom(prev => Math.min(prev * 1.2, 5)));
  const zoomOut = useCallback(() => setZoom(prev => Math.max(prev / 1.2, 0.2)));
  const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); });

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || zoom <= 1) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    e.preventDefault();
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.min(Math.max(prev * delta, 0.2), 5));
    } else {
      setPan(prev => ({ 
        x: prev.x - e.deltaX, 
        y: prev.y - e.deltaY 
      }));
    }
  }, []);

  // Cleanup
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [handleMouseMove, handleMouseUp, imageUrl]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface-elevated/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
              <ImageIcon className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Image Recognition</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={downloadImage} disabled={detections.length === 0}>
                    <Download className="h-4 w-4" />
                    <TooltipContent side="bottom">Download Annotated</TooltipContent>
                  </Button>
                </TooltipTrigger>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={exportJSON} disabled={detections.length === 0}>
                    <Copy className="h-4 w-4" />
                    <TooltipContent side="bottom">Export JSON</TooltipContent>
                  </Button>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Upload/Controls */}
        <div className="px-4 pb-3 border-t border-border/50">
          {!imageFile ? (
            // Upload Area
            <div 
              className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary-500 transition-colors cursor-pointer"
              onClick={() => document.getElementById('image-upload')?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary-500'); }}
              onDragLeave={e => { e.currentTarget.classList.remove('border-primary-500'); }}
              onDrop={e => { 
                e.preventDefault(); 
                e.currentTarget.classList.remove('border-primary-500');
                if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
              }}
            >
              <input
                id="image-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={e => e.target.files[0] && handleFileSelect(e.target.files[0])}
              />
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Drop image here or click to browse</h3>
              <p className="text-sm text-muted-foreground">PNG, JPG, JPEG, WEBP up to 100MB</p>
            </div>
          ) : (
            // Image Controls
            <div className="space-y-3">
              {/* Main Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {!isProcessing ? (
                  <Button 
                    size="lg" 
                    onClick={processImage}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <Loader2 className="h-4 w-4" />
                    {detections.length > 0 ? 'Re-process' : 'Analyze Image'}
                  </Button>
                ) : (
                  <Button size="lg" variant="secondary" disabled className="gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </Button>
                )}
                
                {detections.length > 0 && !isProcessing && (
                  <Button variant="outline" size="sm" onClick={() => setImageFile(null)}>
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                )}
                
                <Separator className="h-8" orientation="vertical" />
                
                {/* Inference Settings */}
                <div className="flex items-center gap-4 text-sm">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground">Confidence</TooltipTrigger>
                      <TooltipContent side="top">Detection confidence threshold</TooltipContent>
                    </TooltipTrigger>
                  </Tooltip>
                  <Slider value={[confThreshold]} onValueChange={([v]) => setConfThreshold(v)} min={0} max={1} step={0.05} className="w-32" />
                  <span className="w-10 font-mono">{confThreshold.toFixed(2)}</span>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground">IoU</TooltipTrigger>
                      <TooltipContent side="top">Intersection over Union threshold</TooltipContent>
                    </TooltipTrigger>
                  </Tooltip>
                  <Slider value={[iouThreshold]} onValueChange={([v]) => setIouThreshold(v)} min={0} max={1} step={0.05} className="w-32" />
                  <span className="w-10 font-mono">{iouThreshold.toFixed(2)}</span>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground">Max</TooltipTrigger>
                      <TooltipContent side="top">Maximum detections</TooltipContent>
                    </TooltipTrigger>
                  </Tooltip>
                  <Select value={maxDetections.toString()} onValueChange={e => setMaxDetections(Number(e))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Display Options */}
              <div className="flex flex-wrap items-center gap-4">
                <ToggleGroup type="multiple" defaultValue={['boxes', 'labels', 'confidence']} className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="boxes" onValueChange={v => setShowBoxes(v.includes('boxes'))}>
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
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Image Area */}
        <div className="flex-1 relative bg-gray-100 dark:bg-gray-900 min-w-0 flex flex-col">
          <div 
            ref={containerRef}
            className="relative flex-1 overflow-auto flex items-center justify-center p-4"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ touchAction: 'none' }}
          >
            {error && (
              <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center max-w-md bg-background/90 backdrop-blur rounded-xl p-6 border border-border"
                >
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Error</h2>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button variant="outline" onClick={() => setError(null)}>Dismiss</Button>
                </motion.div>
              </div>
            )}
            
            {!imageFile && (
              <div className="flex flex-col items-center justify-center text-gray-500 p-8">
                <ImageIcon className="h-24 w-24 mb-6 opacity-50" />
                <h2 className="text-2xl font-medium mb-2">No Image Selected</h2>
                <p className="text-center max-w-md">
                  Upload an image to analyze Arabic Sign Language. The system will detect 
                  hand signs and display bounding boxes with confidence scores.
                </p>
              </div>
            )}
            
            {imageFile && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  cursor: isPanning ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
                  userSelect: 'none',
                }}
                className="relative"
              >
                <canvas
                  ref={canvasRef}
                  className="block"
                />
                <canvas
                  ref={overlayRef}
                  className="absolute top-0 left-0 pointer-events-none"
                />
                
                {/* Hidden img for loading */}
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Uploaded image"
                  style={{ display: 'none' }}
                  onLoad={handleImageLoad}
                />
              </motion.div>
            )}
            
            {/* Zoom Controls Overlay */}
            {imageFile && zoom !== 1 && (
              <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="secondary" size="icon" onClick={zoomIn} disabled={zoom >= 5}>
                        <ZoomIn className="h-4 w-4" />
                        <TooltipContent side="left">Zoom In</TooltipContent>
                      </Button>
                    </TooltipTrigger>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="secondary" size="icon" onClick={zoomOut} disabled={zoom <= 0.2}>
                        <ZoomOut className="h-4 w-4" />
                        <TooltipContent side="left">Zoom Out</TooltipContent>
                      </Button>
                    </TooltipTrigger>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="secondary" size="icon" onClick={resetZoom}>
                        <RotateCcw className="h-4 w-4" />
                        <TooltipContent side="left">Reset Zoom</TooltipContent>
                      </Button>
                    </TooltipTrigger>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            
            {/* Zoom Indicator */}
            {imageFile && zoom !== 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur text-white text-sm font-mono"
              >
                {Math.round(zoom * 100)}%
              </motion.div>
            )}
          </div>
          
          {/* Bottom Info Bar */}
          {imageFile && (
            <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-black/50 backdrop-blur border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-white">
                {imgRef.current && (
                  <>
                    <span>{imgRef.current.naturalWidth} × {imgRef.current.naturalHeight}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>{Math.round((imageFile.size / 1024) * 100) / 100} KB</span>
                  </>
                )}
                {detections.length > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="text-green-400">{detections.length} detections</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <kbd className="px-2 py-0.5 bg-white/10 rounded">Scroll</kbd> Pan
                <kbd className="px-2 py-0.5 bg-white/10 rounded">Ctrl+Scroll</kbd> Zoom
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
                {sentence || <span className="text-muted-foreground text-base">Upload image to build sentence...</span>}
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

          {/* Detections List */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Detections</h2>
                {detections.length > 0 && (
                  <span className="text-sm px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                    {detections.length}
                  </span>
                )}
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {detections.length > 0 ? (
                    detections.map((det, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-3 rounded-lg bg-surface border border-border"
                        style={{ borderLeft: `4px solid ${COLORS[det.class_id % COLORS.length]}` }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-foreground capitalize">
                            {CLASS_NAMES[det.class_id]}
                          </span>
                          <span className="text-sm font-mono px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                            {(det.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          [{det.bbox.map(v => Math.round(v)).join(', ')}]
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div
                      className="p-4 rounded-lg bg-surface border border-border text-center text-muted-foreground text-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      No detections yet. Upload and analyze an image.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>

          {/* Stats */}
          <Card className="m-4">
            <Card.Header className="pb-2">
              <Card.Title className="text-sm">Image Info</Card.Title>
            </Card.Header>
            <Card.Content className="pt-0 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-surface border border-border">
                  <div className="text-muted-foreground text-xs">Dimensions</div>
                  <div className="font-mono font-bold">
                    {imgRef.current ? `${imgRef.current.naturalWidth}×${imgRef.current.naturalHeight}` : '—'}
                  </div>
                </div>
                <div className="p-2 rounded bg-surface border border-border">
                  <div className="text-muted-foreground text-xs">File Size</div>
                  <div className="font-mono font-bold">
                    {imageFile ? `${Math.round((imageFile.size / 1024) * 100) / 100} KB` : '—'}
                  </div>
                </div>
                <div className="p-2 rounded bg-surface border border-border">
                  <div className="text-muted-foreground text-xs">Detections</div>
                  <div className="font-mono font-bold">{detections.length}</div>
                </div>
                <div className="p-2 rounded bg-surface border border-border">
                  <div className="text-muted-foreground text-xs">Zoom</div>
                  <div className="font-mono font-bold">{Math.round(zoom * 100)}%</div>
                </div>
              </div>
            </Card.Content>
          </Card>
        </aside>
      </main>
    </div>
  );
}