'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  Cpu,
  MemoryStick,
  HardDrive,
  Activity,
  Gauge,
  CheckCircle,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  unit?: string;
  className?: string;
}

function MetricCard({ title, value, icon, trend, trendValue, unit, className }: MetricCardProps) {
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    stable: 'text-gray-500',
  };

  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    stable: Minus,
  };

  const TrendIcon = trendIcons[trend || 'stable'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('p-5 rounded-xl bg-surface-elevated border border-border', className)}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{value}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-1">
              <TrendIcon className={cn('h-3 w-3', trendColors[trend])} />
              <span className={cn('text-xs font-medium', trendColors[trend])}>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

interface SystemMetricProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  color?: 'primary' | 'success' | 'warning' | 'error';
  icon: React.ReactNode;
}

function SystemMetric({ label, value, max = 100, unit = '%', color = 'primary', icon }: SystemMetricProps) {
  const colorClasses = {
    primary: 'bg-primary-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  const bgClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30',
    success: 'bg-green-100 dark:bg-green-900/30',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30',
    error: 'bg-red-100 dark:bg-red-900/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 rounded-xl bg-surface-elevated border border-border"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('p-2 rounded-lg', bgClasses[color])}>
            {icon}
          </div>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className="text-lg font-bold font-mono text-foreground">
          {value.toFixed(1)}{unit}
        </span>
      </div>
      <Progress 
        value={Math.min(value, max)} 
        max={max} 
        className={cn('h-2', colorClasses[color])} 
      />
    </motion.div>
  );
}

interface InferenceStatsProps {
  stats: {
    totalInferences: number;
    avgLatency: number;
    avgFPS: number;
    errors: number;
    uptime: number;
  };
}

function InferenceStats({ stats }: InferenceStatsProps) {
  const uptimeHours = Math.floor(stats.uptime / 3600);
  const uptimeMinutes = Math.floor((stats.uptime % 3600) / 60);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Inference Statistics</h2>
        <Badge variant="outline" className="gap-1">
          <Activity className="h-3 w-3" />
          {stats.totalInferences > 0 ? 'Active' : 'Idle'}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Inferences"
          value={stats.totalInferences.toLocaleString()}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Latency"
          value={stats.avgLatency.toFixed(1)}
          unit="ms"
          icon={<Gauge className="h-5 w-5" />}
          trend={stats.avgLatency < 50 ? 'up' : stats.avgLatency < 100 ? 'stable' : 'down'}
          trendValue={stats.avgLatency < 50 ? 'Excellent' : stats.avgLatency < 100 ? 'Good' : 'Slow'}
        />
        <MetricCard
          title="Avg FPS"
          value={stats.avgFPS.toFixed(1)}
          icon={<Zap className="h-5 w-5" />}
          trend={stats.avgFPS > 50 ? 'up' : stats.avgFPS > 20 ? 'stable' : 'down'}
          trendValue={stats.avgFPS > 50 ? 'Fast' : stats.avgFPS > 20 ? 'OK' : 'Slow'}
        />
        <MetricCard
          title="Errors"
          value={stats.errors}
          icon={<AlertCircle className="h-5 w-5" />}
          trend={stats.errors === 0 ? 'up' : 'down'}
          trendValue={stats.errors === 0 ? 'Clean' : `${stats.errors} errors`}
        />
      </div>
    </Card>
  );
}

interface ModelInfoProps {
  modelInfo: {
    loaded: boolean;
    path: string;
    provider: string;
    loadTime: number;
    warmupTime: number;
    classes: number;
  };
}

function ModelInfo({ modelInfo }: ModelInfoProps) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-foreground mb-4">Model Information</h2>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', modelInfo.loaded ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
              {modelInfo.loaded ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">Model Status</p>
              <p className="text-sm text-muted-foreground">
                {modelInfo.loaded ? 'Loaded and Ready' : 'Not Loaded'}
              </p>
            </div>
          </div>
          <Badge variant={modelInfo.loaded ? 'default' : 'destructive'}>
            {modelInfo.loaded ? 'Ready' : 'Offline'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {modelInfo.loaded && [
            { label: 'Execution Provider', value: modelInfo.provider },
            { label: 'Classes', value: modelInfo.classes.toString() },
            { label: 'Load Time', value: `${modelInfo.loadTime.toFixed(0)}ms` },
            { label: 'Warmup Time', value: `${modelInfo.warmupTime.toFixed(0)}ms` },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.3 }}
              className="p-3 rounded-lg bg-surface-elevated border border-border"
            >
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <p className="font-mono font-medium text-foreground">{item.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Model: <code className="font-mono text-foreground">{modelInfo.path}</code>
          </p>
        </div>
      </div>
    </Card>
  );
}

interface PerformanceChartProps {
  data: Array<{ timestamp: number; fps: number; latency: number; memory: number }>;
}

function PerformanceChart({ data }: PerformanceChartProps) {
  // Simple canvas-based chart
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        setSize({ width: parent.clientWidth, height: 200 });
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, size.width, size.height);

    // Draw grid
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (size.height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size.width, y);
      ctx.stroke();
    }

    if (data.length < 2) return;

    // Draw FPS line
    const maxFPS = Math.max(...data.map(d => d.fps), 60);
    const maxLatency = Math.max(...data.map(d => d.latency), 100);
    
    ctx.beginPath();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    
    data.forEach((point, i) => {
      const x = (i / (data.length - 1)) * size.width;
      const y = size.height - (point.fps / maxFPS) * size.height * 0.8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw latency line
    ctx.beginPath();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    data.forEach((point, i) => {
      const x = (i / (data.length - 1)) * size.width;
      const y = size.height - (point.latency / maxLatency) * size.height * 0.8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Legend
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#22c55e';
    ctx.fillText('FPS', 8, 14);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('Latency', 8, 28);
  }, [data, size]);

  return (
    <div className="relative" style={{ width: '100%', height: 200 }}>
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute bottom-2 right-2 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          FPS
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-red-500" />
          Latency
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    cpu: 0,
    memory: 0,
    gpu: 0,
    disk: 0,
    fps: 0,
    latency: 0,
    totalInferences: 0,
    avgLatency: 0,
    avgFPS: 0,
    errors: 0,
    uptime: 0,
  });
  
  const [modelInfo, setModelInfo] = useState({
    loaded: false,
    path: 'models/best.onnx',
    provider: 'CPU',
    loadTime: 0,
    warmupTime: 0,
    classes: 32,
  });
  
  const [history, setHistory] = useState<Array<{ timestamp: number; fps: number; latency: number; memory: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      const [healthRes, metricsRes] = await Promise.all([
        fetch('/api/v1/health'),
        fetch('/api/v1/metrics'),
      ]);
      
      const health = await healthRes.json();
      const metrics = await metricsRes.json();
      
      setMetrics(prev => ({
        ...prev,
        cpu: health.cpu_usage || 0,
        memory: health.memory_usage || 0,
        gpu: metrics.system?.gpu_percent || 0,
        fps: metrics.inference?.avg_fps || 0,
        latency: metrics.inference?.avg_inference_ms || 0,
        totalInferences: metrics.inference?.total_inferences || 0,
        avgLatency: metrics.inference?.avg_inference_ms || 0,
        avgFPS: metrics.inference?.avg_fps || 0,
        errors: metrics.inference?.errors || 0,
        uptime: health.uptime_seconds || 0,
      }));
      
      setModelInfo({
        loaded: health.model_loaded,
        path: health.model_path,
        provider: health.execution_provider || 'CPU',
        loadTime: health.load_time_ms || 0,
        warmupTime: health.warmup_time_ms || 0,
        classes: 32,
      });
      
      // Add to history
      setHistory(prev => [
        ...prev.slice(-59),
        {
          timestamp: Date.now(),
          fps: metrics.inference?.avg_fps || 0,
          latency: metrics.inference?.avg_inference_ms || 0,
          memory: health.memory_usage || 0,
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface-elevated/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <Badge variant="outline" className="gap-1">
                <Activity className="h-3 w-3" />
                Real-time Monitoring
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Live
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <>
            {/* Metrics Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
            >
              <MetricCard
                title="CPU Usage"
                value={metrics.cpu.toFixed(1)}
                unit="%"
                icon={<Cpu className="h-5 w-5" />}
                trend={metrics.cpu < 50 ? 'up' : metrics.cpu < 80 ? 'stable' : 'down'}
                trendValue={metrics.cpu < 50 ? 'Healthy' : metrics.cpu < 80 ? 'Moderate' : 'High'}
              />
              <MetricCard
                title="Memory Usage"
                value={metrics.memory.toFixed(1)}
                unit="%"
                icon={<MemoryStick className="h-5 w-5" />}
                trend={metrics.memory < 70 ? 'up' : metrics.memory < 90 ? 'stable' : 'down'}
                trendValue={metrics.memory < 70 ? 'Healthy' : metrics.memory < 90 ? 'Moderate' : 'Critical'}
              />
              <MetricCard
                title="GPU Usage"
                value={metrics.gpu.toFixed(1)}
                unit="%"
                icon={<Gauge className="h-5 w-5" />}
                trend={metrics.gpu > 10 ? 'up' : 'stable'}
                trendValue={metrics.gpu > 10 ? 'Accelerated' : 'CPU Mode'}
              />
              <MetricCard
                title="Disk Usage"
                value={metrics.disk.toFixed(1)}
                unit="%"
                icon={<HardDrive className="h-5 w-5" />}
                trend={metrics.disk < 80 ? 'up' : 'down'}
                trendValue={metrics.disk < 80 ? 'OK' : 'Cleanup needed'}
              />
            </motion.div>

            {/* System Metrics */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mb-6"
            >
              <h2 className="text-lg font-semibold text-foreground mb-4">System Resources</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SystemMetric
                  label="CPU"
                  value={metrics.cpu}
                  icon={<Cpu className="h-4 w-4" />}
                  color="primary"
                />
                <SystemMetric
                  label="Memory"
                  value={metrics.memory}
                  icon={<MemoryStick className="h-4 w-4" />}
                  color="success"
                />
                <SystemMetric
                  label="GPU"
                  value={metrics.gpu}
                  icon={<Gauge className="h-4 w-4" />}
                  color="warning"
                />
                <SystemMetric
                  label="Disk"
                  value={metrics.disk}
                  icon={<HardDrive className="h-4 w-4" />}
                  color="error"
                />
              </div>
            </motion.section>

            {/* Model Info & Inference Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
            >
              <ModelInfo modelInfo={modelInfo} />
              <InferenceStats stats={metrics} />
            </motion.div>

            {/* Performance Chart */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mb-6"
            >
              <h2 className="text-lg font-semibold text-foreground mb-4">Performance History (Last 60s)</h2>
              <Card className="p-5">
                <PerformanceChart data={history} />
              </Card>
            </motion.section>

            {/* Quick Actions */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <a href="/camera" className="p-5 rounded-xl bg-surface-elevated border border-border hover:border-primary-300 dark:hover:border-primary-700 transition-colors group">
                  <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-3">
                    <Zap className="h-6 w-6" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">Live Camera</h3>
                  <p className="text-sm text-muted-foreground">Real-time sign detection</p>
                </a>
                <a href="/image" className="p-5 rounded-xl bg-surface-elevated border border-border hover:border-primary-300 dark:hover:border-primary-700 transition-colors group">
                  <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-3">
                    <Image className="h-6 w-6" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">Upload Image</h3>
                  <p className="text-sm text-muted-foreground">Single image analysis</p>
                </a>
                <a href="/video" className="p-5 rounded-xl bg-surface-elevated border border-border hover:border-primary-300 dark:hover:border-primary-700 transition-colors group">
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-3">
                    <Video className="h-6 w-6" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">Process Video</h3>
                  <p className="text-sm text-muted-foreground">Frame-by-frame analysis</p>
                </a>
                <a href="/history" className="p-5 rounded-xl bg-surface-elevated border border-border hover:border-primary-300 dark:hover:border-primary-700 transition-colors group">
                  <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mb-3">
                    <History className="h-6 w-6" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">History</h3>
                  <p className="text-sm text-muted-foreground">View past predictions</p>
                </a>
              </div>
            </motion.section>
          </>
        )}
      </main>
    </div>
  );
}

// Need to import React and History icon
import React, { useState, useEffect, useRef } from 'react';
import { Image, Video, History } from 'lucide-react';