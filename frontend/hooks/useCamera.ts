import { useRef, useState, useCallback, useEffect } from 'react';

export interface CameraConstraints {
  facingMode: 'user' | 'environment';
  width?: number;
  height?: number;
}

export interface CameraState {
  isStreamActive: boolean;
  isLoading: boolean;
  error: string | null;
  permissionDenied: boolean;
}

export interface CameraActions {
  initializeCamera: () => Promise<void>;
  cleanupCamera: () => void;
  switchCamera: () => void;
  toggleFlash: () => void;
}

export function useCamera(constraints: CameraConstraints) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [state, setState] = useState<CameraState>({
    isStreamActive: false,
    isLoading: false,
    error: null,
    permissionDenied: false,
  });

  const [facingMode, setFacingMode] = useState(constraints.facingMode);
  const [flashEnabled, setFlashEnabled] = useState(false);

  const updateState = useCallback((updates: Partial<CameraState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const cleanupCamera = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    updateState({ isStreamActive: false });
  }, [updateState]);

  const initializeCamera = useCallback(async () => {
    updateState({ isLoading: true, error: null, permissionDenied: false });

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const mediaConstraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: constraints.width || 1920, max: constraints.width || 1920 },
          height: { ideal: constraints.height || 1080, max: constraints.height || 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve();
          }
        });
        
        try {
          await videoRef.current.play();
          updateState({ isStreamActive: true, isLoading: false });
        } catch (playError) {
          if (playError instanceof Error && playError.name === 'AbortError') {
            setTimeout(async () => {
              if (videoRef.current?.srcObject) {
                try {
                  await videoRef.current.play();
                  updateState({ isStreamActive: true, isLoading: false });
                } catch {
                  // Silent fail on retry
                }
              }
            }, 100);
          } else {
            throw playError;
          }
        }
      }
    } catch (err) {
      const errorMessage = handleCameraError(err);
      updateState({
        error: errorMessage,
        permissionDenied: err instanceof Error && 
          (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'),
        isStreamActive: false,
        isLoading: false
      });
    }
  }, [facingMode, constraints.width, constraints.height, updateState]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  const toggleFlash = useCallback(() => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track?.getCapabilities && track.applyConstraints) {
        const capabilities = track.getCapabilities();
        if ((capabilities as any).torch) {
          track.applyConstraints({
            advanced: [{ torch: !flashEnabled } as any]
          }).then(() => {
            setFlashEnabled(!flashEnabled);
          }).catch(() => {
            // Silent fail for flash toggle
          });
        }
      }
    }
  }, [flashEnabled]);

  useEffect(() => {
    initializeCamera();
    return cleanupCamera;
  }, [facingMode]);

  return {
    videoRef,
    state,
    flashEnabled,
    actions: {
      initializeCamera,
      cleanupCamera,
      switchCamera,
      toggleFlash,
    }
  };
}

function handleCameraError(err: unknown): string {
  if (!(err instanceof Error)) return 'Unknown camera error occurred.';
  
  const errorMap: Record<string, string> = {
    NotAllowedError: 'Camera permission denied. Please allow camera access and refresh the page.',
    PermissionDeniedError: 'Camera permission denied. Please allow camera access and refresh the page.',
    NotFoundError: 'No camera device found.',
    NotSupportedError: 'Camera not supported on this device.',
    NotReadableError: 'Camera is already in use by another application.',
    OverconstrainedError: 'Camera constraints could not be satisfied.',
  };

  return errorMap[err.name] || `Camera error: ${err.message}`;
}