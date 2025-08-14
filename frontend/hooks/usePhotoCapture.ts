import { useRef, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: number;
}

interface PhotoCaptureOptions {
  maxPhotos?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
}

export function usePhotoCapture(options: PhotoCaptureOptions = {}) {
  const { maxPhotos = 50, quality = 0.9, format = 'jpeg' } = options;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [capturedPhotos, setCapturedPhotos] = useLocalStorage<CapturedPhoto[]>(
    'kanta-captured-photos',
    []
  );

  const capturePhoto = useCallback(async (
    videoElement: HTMLVideoElement | null
  ): Promise<CapturedPhoto | null> => {
    if (!videoElement || !canvasRef.current) {
      return null;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL(`image/${format}`, quality);
    const newPhoto: CapturedPhoto = {
      id: generatePhotoId(),
      dataUrl,
      timestamp: Date.now()
    };

    setCapturedPhotos(prev => {
      const updated = [newPhoto, ...prev];
      return updated.slice(0, maxPhotos);
    });

    provideHapticFeedback();
    showCaptureAnimation();

    return newPhoto;
  }, [format, quality, maxPhotos, setCapturedPhotos]);

  const deletePhoto = useCallback((photoId: string) => {
    setCapturedPhotos(prev => prev.filter(photo => photo.id !== photoId));
  }, [setCapturedPhotos]);

  const clearAllPhotos = useCallback(() => {
    setCapturedPhotos([]);
  }, [setCapturedPhotos]);

  return {
    canvasRef,
    capturedPhotos,
    capturePhoto,
    deletePhoto,
    clearAllPhotos,
  };
}

function generatePhotoId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function provideHapticFeedback(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(50);
  }
}

function showCaptureAnimation(): void {
  const flashOverlay = document.createElement('div');
  flashOverlay.className = 'fixed inset-0 bg-white pointer-events-none z-50 animate-flash';
  document.body.appendChild(flashOverlay);
  
  setTimeout(() => {
    document.body.removeChild(flashOverlay);
  }, 200);
}