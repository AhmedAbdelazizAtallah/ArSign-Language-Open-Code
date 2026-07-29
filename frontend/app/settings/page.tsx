'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  SlidersHorizontal,
  Palette,
  Globe,
  Shield,
  Bell,
  Database,
  Download,
  Upload,
  RefreshCw,
  Save,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle, ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { sonner } from 'sonner';

const THEMES = ['light', 'dark', 'system'] as const;
const LANGUAGES = ['en', 'ar'] as const;

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // Inference
    confThreshold: 0.3,
    iouThreshold: 0.45,
    maxDetections: 100,
    // UI
    boundingBoxColor: '#00ff00',
    labelColor: '#ffffff',
    fontSize: 14,
    showFPS: true,
    showLatency: true,
    showConfidence: true,
    enableSentenceBuilder: true,
    // General
    language: 'ar' as 'en' | 'ar',
    theme: 'system' as 'light' | 'dark' | 'system',
    // Advanced
    autoSaveHistory: true,
    maxHistoryItems: 1000,
    enableNotifications: true,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('asl-settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
  }, []);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Apply language (RTL)
  useEffect(() => {
    document.documentElement.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('asl-settings', JSON.stringify(settings));
      sonner.success('Settings saved successfully');
      setHasChanges(false);
    } catch (e) {
      sonner.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      localStorage.removeItem('asl-settings');
      window.location.reload();
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asl-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setSettings(imported);
        localStorage.setItem('asl-settings', JSON.stringify(imported));
        sonner.success('Settings imported successfully');
        window.location.reload();
      } catch (e) {
        sonner.error('Invalid settings file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface-elevated/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <Badge variant="secondary" className="text-xs">
              v1.0.0
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleExport} disabled={isSaving}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                    <TooltipContent side="bottom">Export settings as JSON</TooltipContent>
                  </Button>
                </TooltipTrigger>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isSaving}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                    <TooltipContent side="bottom">Import settings from JSON</TooltipContent>
                  </TooltipTrigger>
                </Tooltip>
              </Tooltip>
            </TooltipProvider>
            <input
              type="file"
              accept=".json"
              className="hidden"
              id="settings-import"
              onChange={handleImport}
            />
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={isSaving || !hasChanges}
              className="ml-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Tabs defaultValue="inference" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="inference"><SlidersHorizontal className="h-4 w-4 mr-2" /> Inference</TabsTrigger>
            <TabsTrigger value="ui"><Palette className="h-4 w-4 mr-2" /> UI & Display</TabsTrigger>
            <TabsTrigger value="general"><Globe className="h-4 w-4 mr-2" /> General</TabsTrigger>
            <TabsTrigger value="advanced"><Shield className="h-4 w-4 mr-2" /> Advanced</TabsTrigger>
            <TabsTrigger value="data"><Database className="h-4 w-4 mr-2" /> Data</TabsTrigger>
          </TabsList>

          {/* Inference Settings */}
          <TabsContent value="inference" className="space-y-6 animate-fade-in">
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  Inference Parameters
                </Card.Title>
                <Card.Description>
                  Configure model inference thresholds and limits
                </Card.Description>
              </Card.Header>
              <Card.Content className="space-y-6 pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Confidence Threshold</Label>
                      <p className="text-sm text-muted-foreground">Minimum confidence for detections (0.0 - 1.0)</p>
                    </div>
                    <span className="font-mono text-lg text-foreground">{settings.confThreshold.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[settings.confThreshold]}
                    onValueChange={([v]) => handleChange('confThreshold', v)}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>IoU Threshold</Label>
                      <p className="text-sm text-muted-foreground">Intersection over Union for NMS (0.0 - 1.0)</p>
                    </div>
                    <span className="font-mono text-lg text-foreground">{settings.iouThreshold.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[settings.iouThreshold]}
                    onValueChange={([v]) => handleChange('iouThreshold', v)}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Max Detections</Label>
                      <p className="text-sm text-muted-foreground">Maximum number of detections per frame</p>
                    </div>
                  </div>
                  <Select value={settings.maxDetections.toString()} onValueChange={e => handleChange('maxDetections', Number(e))}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  Performance
                </Card.Title>
                <Card.Description>
                  Model execution and optimization settings
                </Card.Description>
              </Card.Header>
              <Card.Content className="space-y-4 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-surface border border-border">
                    <Label className="flex items-center gap-2">
                      <span>Use GPU Acceleration</span>
                      <span className="ml-auto text-xs text-muted-foreground">Requires CUDA</span>
                    </Label>
                    <Switch 
                      checked={true} 
                      onCheckedChange={() => {}}
                      disabled
                    />
                  </div>
                  <div className="p-4 rounded-lg bg-surface border border-border">
                    <Label>Warmup Runs</Label>
                    <Input type="number" value={5} min={1} max={20} className="mt-1 w-24" readOnly />
                  </div>
                </div>
              </Card.Content>
            </Card>
          </TabsContent>

          {/* UI & Display Settings */}
          <TabsContent value="ui" className="space-y-6 animate-fade-in">
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  Visualization
                </Card.Title>
                <Card.Description>
                  Customize how detections are displayed
                </Card.Description>
              </Card.Header>
              <Card.Content className="space-y-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bounding Box Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settings.boundingBoxColor}
                        onChange={e => handleChange('boundingBoxColor', e.target.value)}
                        className="w-12 h-12 rounded-lg border border-border cursor-pointer"
                      />
                      <Input
                        value={settings.boundingBoxColor}
                        onChange={e => handleChange('boundingBoxColor', e.target.value)}
                        className="font-mono text-sm max-w-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Label Text Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settings.labelColor}
                        onChange={e => handleChange('labelColor', e.target.value)}
                        className="w-12 h-12 rounded-lg border border-border cursor-pointer"
                      />
                      <Input
                        value={settings.labelColor}
                        onChange={e => handleChange('labelColor', e.target.value)}
                        className="font-mono text-sm max-w-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Font Size</Label>
                      <p className="text-sm text-muted-foreground">Label font size in pixels</p>
                    </div>
                    <span className="font-mono text-lg text-foreground">{settings.fontSize}px</span>
                  </div>
                  <Slider
                    value={[settings.fontSize]}
                    onValueChange={([v]) => handleChange('fontSize', v)}
                    min={8}
                    max={32}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="flex flex-wrap gap-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ToggleGroup type="multiple" defaultValue={['fps', 'latency', 'confidence']} className="flex items-center gap-2">
                          <ToggleGroupItem value="fps" onValueChange={v => handleChange('showFPS', v.includes('fps'))}>
                            <Gauge className="h-4 w-4 mr-2" /> Show FPS
                          </TooltipTrigger>
                        </Tooltip>
                      </TooltipTrigger>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ToggleGroupItem value="latency" onValueChange={v => handleChange('showLatency', v.includes('latency'))}>
                          <Activity className="h-4 w-4 mr-2" /> Show Latency
                          <TooltipContent side="bottom">Show inference latency</TooltipContent>
                        </TooltipTrigger>
                      </Tooltip>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ToggleGroupItem value="confidence" onValueChange={v => handleChange('showConfidence', v.includes('confidence'))}>
                          <Percent className="h-4 w-4 mr-2" /> Show Confidence
                          <TooltipContent side="bottom">Show detection confidence</TooltipContent>
                        </TooltipTrigger>
                      </Tooltip>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ToggleGroupItem value="sentence" onValueChange={v => handleChange('enableSentenceBuilder', v.includes('sentence'))}>
                          <Type className="h-4 w-4 mr-2" /> Sentence Builder
                          <TooltipContent side="bottom">Enable Arabic sentence construction</TooltipContent>
                        </TooltipTrigger>
                      </Tooltip>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <Layout className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  Layout & Behavior
                </Card.Title>
              </Card.Header>
              <Card.Content className="space-y-4 pt-0">
                <div className="space-y-2">
                  <Label>Default Sidebar Width</Label>
                  <Select defaultValue="medium" className="w-48">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact (280px)</SelectItem>
                      <SelectItem value="medium">Medium (320px)</SelectItem>
                      <SelectItem value="wide">Wide (384px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Animation Speed</Label>
                  <Select defaultValue="normal" className="w-48">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="fast">Fast</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="slow">Slow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card.Content>
            </Card>
          </TabsContent>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6 animate-fade-in">
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  Language & Region
                </Card.Title>
              </Card.Header>
              <Card.Content className="space-y-4 pt-0">
                <div className="space-y-2">
                  <Label>Interface Language</Label>
                  <Select value={settings.language} onValueChange={e => handleChange('language', e as 'en' | 'ar')}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English (LTR)</SelectItem>
                      <SelectItem value="ar">Arabic (RTL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={settings.theme} onValueChange={e => handleChange('theme', e as 'light' | 'dark' | 'system')}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select defaultValue="locale" className="w-48">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="locale">System Default</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  Notifications
                </Card.Title>
              </Card.Header>
              <Card.Content className="space-y-4 pt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">Show toast notifications for events</p>
                  </div>
                  <Switch checked={settings.enableNotifications} onCheckedChange={v => handleChange('enableNotifications', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sound Alerts</Label>
                    <p className="text-sm text-muted-foreground">Play sound for new detections</p>
                  </div>
                  <Switch checked={false} onCheckedChange={() => {}} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Browser Notifications</Label>
                    <p className="text-sm text-muted-foreground">Show system notifications when tab is hidden</p>
                  </div>
                  <Switch checked={false} onCheckedChange={() => {}} />
                </div>
              </Card.Content>
            </Card>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced" className="space-y-6 animate-fade-in">
            <Card className="border-warning/50">
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-warning" />
                  Advanced Settings
                </Card.Title>
                <Card.Description className="text-warning">
                  These settings affect system behavior. Change with caution.
                </Card.Description>
              </Card.Header>
              <Card.Content className="space-y-6 pt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-surface border border-border">
                    <div>
                      <Label>Experimental Features</Label>
                      <p className="text-sm text-muted-foreground">Enable beta features that may be unstable</p>
                    </div>
                    <Switch checked={false} onCheckedChange={() => {}} />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-surface border border-border">
                    <div>
                      <Label>Debug Mode</Label>
                      <p className="text-sm text-muted-foreground">Show detailed logs and performance metrics</p>
                    </div>
                    <Switch checked={false} onCheckedChange={() => {}} />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-surface border border-border">
                    <div>
                      <Label>Telemetry</Label>
                      <p className="text-sm text-muted-foreground">Send anonymous usage statistics</p>
                    </div>
                    <Switch checked={false} onCheckedChange={() => {}} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Log Level</Label>
                      <Select defaultValue="info" className="w-full">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="debug">Debug</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warn">Warning</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Log Files</Label>
                      <Input type="number" value={10} min={1} max={100} className="w-24" />
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </TabsContent>

          {/* Data Management */}
          <TabsContent value="data" className="space-y-6 animate-fade-in">
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  History & Storage
                </Card.Title>
              </Card.Header>
              <Card.Content className="space-y-4 pt-0">
                <div className="flex items-center justify-between p-4 rounded-lg bg-surface border border-border">
                  <div>
                    <Label>Auto-save History</Label>
                    <p className="text-sm text-muted-foreground">Automatically save predictions to history</p>
                  </div>
                  <Switch checked={settings.autoSaveHistory} onCheckedChange={v => handleChange('autoSaveHistory', v)} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-surface border border-border">
                  <div>
                    <Label>Max History Items</Label>
                    <p className="text-sm text-muted-foreground">Maximum number of history entries to keep</p>
                  </div>
                  <Select value={settings.maxHistoryItems.toString()} onValueChange={e => handleChange('maxHistoryItems', Number(e))} className="w-40">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1,000</SelectItem>
                      <SelectItem value="5000">5,000</SelectItem>
                      <SelectItem value="10000">10,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-surface border border-border">
                  <div>
                    <Label>Compress Old Entries</Label>
                    <p className="text-sm text-muted-foreground">Compress history older than 30 days</p>
                  </div>
                  <Switch checked={true} onCheckedChange={() => {}} />
                </div>
              </Card.Content>
            </Card>

            <Card className="border-error/50">
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-error" />
                  Danger Zone
                </Card.Title>
                <Card.Description>
                  Irreversible actions that delete data
                </Card.Description>
              </Card.Header>
              <Card.Content className="space-y-4 pt-0">
                <div className="p-4 rounded-lg bg-surface border border-error/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-error">Clear All History</Label>
                      <p className="text-sm text-muted-foreground">Permanently delete all prediction history</p>
                    </div>
                    <Button variant="destructive" size="sm">Clear History</Button>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-surface border border-error/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-error">Reset All Settings</Label>
                      <p className="text-sm text-muted-foreground">Restore all settings to factory defaults</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleReset}>Reset Settings</Button>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Missing imports
import { Zap, Activity, Layout, Percent, Type, Image, Video, History, Trash2 } from 'lucide-react';