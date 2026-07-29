'use client';

import { useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';

interface Detection {
  bbox: [number, number, number, number];
  confidence: number;
  class_id: number;
  class_name: string;
}

interface InferenceResult {
  latency_ms: number;
  fps: number;
  predictions: Detection[];
  sentence?: string;
}

export function useInference() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const imageMutation = useMutation({
    mutationFn: async (file: File): Promise<InferenceResult> => {
      abortControllerRef.current = new AbortController();
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/predict/image', formData, {
        signal: abortControllerRef.current.signal,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
  });

  const videoMutation = useMutation({
    mutationFn: async (file: File): Promise<InferenceResult> => {
      abortControllerRef.current = new AbortController();
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/predict/video', formData, {
        signal: abortControllerRef.current.signal,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
  });

  const cameraMutation = useMutation({
    mutationFn: async (frame: string): Promise<InferenceResult> => {
      abortControllerRef.current = new AbortController();
      return api.post('/predict/camera', { frame }, {
        signal: abortControllerRef.current.signal,
      });
    },
  });

  const inferImage = useCallback(async (file: File) => {
    return imageMutation.mutateAsync(file);
  }, [imageMutation]);

  const inferVideo = useCallback(async (file: File) => {
    return videoMutation.mutateAsync(file);
  }, [videoMutation]);

  const inferCameraFrame = useCallback(async (frame: string) => {
    return cameraMutation.mutateAsync(frame);
  }, [cameraMutation]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    inferImage,
    inferVideo,
    inferCameraFrame,
    cancel,
    isLoading: imageMutation.isPending || videoMutation.isPending || cameraMutation.isPending,
    isImageLoading: imageMutation.isPending,
    isVideoLoading: videoMutation.isPending,
    isCameraLoading: cameraMutation.isPending,
    error: imageMutation.error || videoMutation.error || cameraMutation.error,
  };
}