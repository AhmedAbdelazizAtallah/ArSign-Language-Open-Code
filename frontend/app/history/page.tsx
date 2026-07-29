'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Download,
  Trash2,
  Filter,
  Calendar,
  FileText,
  Image,
  Video,
  Camera,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';

interface HistoryEntry {
  id: string;
  timestamp: string;
  source: string;
  source_name: string;
  detections: Array<{
    bbox: number[];
    confidence: number;
    class_id: number;
    class_name: string;
  }>;
  sentence: string;
  latency_ms: number;
  fps: number;
  avg_confidence: number;
}

const CLASS_NAMES = [
  'ain', 'al', 'aleff', 'bb', 'dal', 'dha', 'dhad', 'fa',
  'gaaf', 'ghain', 'ha', 'haa', 'jeem', 'kaaf', 'khaa', 'la',
  'laam', 'meem', 'nun', 'ra', 'saad', 'seen', 'sheen', 'ta',
  'taa', 'thaa', 'thal', 'toot', 'waw', 'ya', 'yaa', 'zay'
];

const SOURCE_ICONS = {
  camera: Camera,
  video: Video,
  image: Image,
};

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

export default function HistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    source: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });
  const [stats, setStats] = useState({
    total: 0,
    bySource: {},
    avgLatency: 0,
    avgFps: 0,
    avgConfidence: 0,
  });

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (filters.source) params.append('source', filters.source);
      
      const response = await fetch(`/api/v1/history?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/history/stats');
      if (response.ok) {
        setStats(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchStats();
  }, [page, pageSize, filters.source]);

  const handleExport = async (format: 'json' | 'csv' | 'txt') => {
    try {
      const response = await fetch(`/api/v1/history/export?format=${format}`);
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([data.content], { type: format === 'json' ? 'application/json' : 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all history? This cannot be undone.')) return;
    
    try {
      const response = await fetch('/api/v1/history', { method: 'DELETE' });
      if (response.ok) {
        setEntries([]);
        setTotal(0);
        fetchStats();
      }
    } catch (error) {
      console.error('Clear failed:', error);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/history/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setEntries(prev => prev.filter(e => e.id !== id));
        setTotal(prev => prev - 1);
        fetchStats();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const getSourceIcon = (source: string) => {
    const Icon = SOURCE_ICONS[source as keyof typeof SOURCE_ICONS] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'camera': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'video': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'image': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface-elevated/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">History</h1>
                <p className="text-sm text-muted-foreground">View and manage your prediction history</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export JSON
                      <TooltipContent side="bottom">Export as JSON</TooltipContent>
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export CSV
                      <TooltipContent side="bottom">Export as CSV</TooltipContent>
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => handleExport('txt')}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export TXT
                      <TooltipContent side="bottom">Export as Text</TooltipContent>
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="destructive" size="sm" onClick={handleClear} disabled={total === 0}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                      <TooltipContent side="bottom">Clear all history</TooltipContent>
                    </Button>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search predictions..."
                value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>

            <Select value={filters.source} onValueChange={v => setFilters(prev => ({ ...prev, source: v }))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sources</SelectItem>
                <SelectItem value="camera">Camera</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="image">Image</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-36"
                placeholder="From"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-36"
                placeholder="To"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-surface-elevated/50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Entries</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-2xl font-bold text-foreground">{stats.avgLatency.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Avg Latency (ms)</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-2xl font-bold text-foreground">{stats.avgFps.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Avg FPS</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-2xl font-bold text-foreground">{(stats.avgConfidence * 100).toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Avg Confidence</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-2xl font-bold text-foreground">
                {Object.entries(stats.bySource).reduce((sum, [, v]) => sum + v, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Detections</p>
            </div>
          </div>
        </div>
      </div>

      {/* History List */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No History Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start using the camera, uploading images, or processing videos to build your prediction history.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button asChild>
                <a href="/camera">
                  <Camera className="h-4 w-4 mr-2" />
                  Try Camera
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="/image">
                  <Image className="h-4 w-4 mr-2" />
                  Upload Image
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="/video">
                  <Video className="h-4 w-4 mr-2" />
                  Process Video
                </a>
              </Button>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {entries.map((entry, index) => (
                  <motion.article
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative p-4 rounded-xl bg-surface-elevated border border-border hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', getSourceColor(entry.source))}>
                            {getSourceIcon(entry.source)}
                            <span className="capitalize">{entry.source}</span>
                          </div>
                          <span className="text-sm text-muted-foreground font-mono">
                            {entry.source_name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatRelativeTime(entry.timestamp)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(entry.timestamp)}
                          </span>
                        </div>

                        {/* Sentence */}
                        {entry.sentence && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-right rtl font-arabic text-xl font-medium text-foreground mb-3 leading-relaxed p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg"
                            dir="rtl"
                            style={{ fontFamily: '"Noto Sans Arabic", "Amiri", system-ui, sans-serif' }}
                          >
                            {entry.sentence}
                          </motion.p>
                        )}

                        {/* Detections */}
                        {entry.detections.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {entry.detections.slice(0, 10).map((det, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="gap-1 text-xs"
                                style={{
                                  background: `${COLORS[det.class_id % COLORS.length]}20`,
                                  color: COLORS[det.class_id % COLORS.length],
                                  borderColor: COLORS[det.class_id % COLORS.length],
                                }}
                              >
                                {CLASS_NAMES[det.class_id]}
                                <span className="font-mono">{(det.confidence * 100).toFixed(0)}%</span>
                              </Badge>
                            ))}
                            {entry.detections.length > 10 && (
                              <Badge variant="outline" className="text-xs">
                                +{entry.detections.length - 10} more
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Metrics */}
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            {(entry.avg_confidence * 100).toFixed(1)}% confidence
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            {entry.latency_ms.toFixed(1)}ms
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            {entry.fps.toFixed(1)} FPS
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExport('json')}>
                                <Download className="h-4 w-4" />
                                <TooltipContent side="left">Export Entry</TooltipContent>
                              </Button>
                            </TooltipTrigger>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteEntry(entry.id)}>
                                <Trash2 className="h-4 w-4 text-error" />
                                <TooltipContent side="left">Delete Entry</TooltipContent>
                              </Button>
                            </TooltipTrigger>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {total > pageSize && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(total / pageSize)) }, (_, i) => {
                    let pageNum: number;
                    const totalPages = Math.ceil(total / pageSize);
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="h-8 w-8 min-w-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                  disabled={page === Math.ceil(total / pageSize)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} entries
            </div>
          </>
        )}
      </main>
    </div>
  );
}