import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface InferenceState {
  // Settings
  confThreshold: number;
  iouThreshold: number;
  maxDetections: number;
  boundingBoxColor: string;
  labelColor: string;
  fontSize: number;
  showFPS: boolean;
  showLatency: boolean;
  showConfidence: boolean;
  enableSentenceBuilder: boolean;
  language: 'en' | 'ar';
  theme: 'light' | 'dark' | 'system';
  
  // Actions
  setConfThreshold: (value: number) => void;
  setIouThreshold: (value: number) => void;
  setMaxDetections: (value: number) => void;
  setBoundingBoxColor: (value: string) => void;
  setLabelColor: (value: string) => void;
  setFontSize: (value: number) => void;
  setShowFPS: (value: boolean) => void;
  setShowLatency: (value: boolean) => void;
  setShowConfidence: (value: boolean) => void;
  setEnableSentenceBuilder: (value: boolean) => void;
  setLanguage: (value: 'en' | 'ar') => void;
  setTheme: (value: 'light' | 'dark' | 'system') => void;
  
  // Reset
  resetSettings: () => void;
}

const defaultSettings = {
  confThreshold: 0.3,
  iouThreshold: 0.45,
  maxDetections: 100,
  boundingBoxColor: '#00ff00',
  labelColor: '#ffffff',
  fontSize: 14,
  showFPS: true,
  showLatency: true,
  showConfidence: true,
  enableSentenceBuilder: true,
  language: 'ar' as const,
  theme: 'system' as const,
};

export const useInferenceStore = create<InferenceState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      
      setConfThreshold: (value) => set({ confThreshold: value }),
      setIouThreshold: (value) => set({ iouThreshold: value }),
      setMaxDetections: (value) => set({ maxDetections: value }),
      setBoundingBoxColor: (value) => set({ boundingBoxColor: value }),
      setLabelColor: (value) => set({ labelColor: value }),
      setFontSize: (value) => set({ fontSize: value }),
      setShowFPS: (value) => set({ showFPS: value }),
      setShowLatency: (value) => set({ showLatency: value }),
      setShowConfidence: (value) => set({ showConfidence: value }),
      setEnableSentenceBuilder: (value) => set({ enableSentenceBuilder: value }),
      setLanguage: (value) => set({ language: value }),
      setTheme: (value) => set({ theme: value }),
      
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'asl-inference-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);