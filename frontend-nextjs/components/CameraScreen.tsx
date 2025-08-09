import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, SwitchCamera, Zap, Settings, X, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: number;
}

export function CameraScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Load captured photos from localStorage on component mount
  useEffect(() => {
    const savedPhotos = localStorage.getItem('kanta-captured-photos');
    if (savedPhotos) {
      try {
        setCapturedPhotos(JSON.parse(savedPhotos));
      } catch (err) {
        console.error('Error loading saved photos:', err);
      }
    }
  }, []);

  // Save captured photos to localStorage
  const savePhotosToStorage = useCallback((photos: CapturedPhoto[]) => {
    try {
      localStorage.setItem('kanta-captured-photos', JSON.stringify(photos));
    } catch (err) {
      console.error('Error saving photos to storage:', err);
    }
  }, []);

  // Initialize camera stream
  const initializeCamera = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setPermissionDenied(false);

    try {
      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for metadata to load before playing
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve();
          }
        });
        
        // Handle play promise properly to avoid interruption errors
        if (videoRef.current) {
          try {
            await videoRef.current.play();
            setIsStreamActive(true);
          } catch (playError) {
            // Handle play interruption gracefully
            if (playError instanceof Error && playError.name === 'AbortError') {
              console.log('Play request was interrupted, retrying...');
              // Retry play after a small delay
              setTimeout(async () => {
                if (videoRef.current && videoRef.current.srcObject) {
                  try {
                    await videoRef.current.play();
                    setIsStreamActive(true);
                  } catch (retryError) {
                    console.error('Retry play failed:', retryError);
                  }
                }
              }, 100);
            } else {
              throw playError;
            }
          }
        }
      }
    } catch (err) {
      console.error('Camera initialization error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionDenied(true);
          setError('Camera permission denied. Please allow camera access and refresh the page.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera device found.');
        } else if (err.name === 'NotSupportedError') {
          setError('Camera not supported on this device.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is already in use by another application.');
        } else if (err.name === 'OverconstrainedError') {
          setError('Camera constraints could not be satisfied.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError('Unknown camera error occurred.');
      }
      setIsStreamActive(false);
    } finally {
      setIsLoading(false);
    }
  }, [facingMode]);

  // Cleanup camera stream
  const cleanupCamera = useCallback(() => {
    // Pause video first to prevent play interruption errors
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreamActive(false);
  }, []);

  // Initialize camera on component mount
  useEffect(() => {
    initializeCamera();
    
    // Cleanup on unmount
    return () => {
      cleanupCamera();
    };
  }, [facingMode]); // Only re-initialize when facingMode changes

  // Switch between front and back camera
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // Toggle flash (on supported devices)
  const toggleFlash = useCallback(() => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.getCapabilities && track.applyConstraints) {
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
          track.applyConstraints({
            advanced: [{ torch: !flashEnabled } as any]
          }).then(() => {
            setFlashEnabled(!flashEnabled);
          }).catch((err) => {
            console.error('Flash toggle error:', err);
          });
        }
      }
    }
  }, [flashEnabled]);

  // Capture photo
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isStreamActive) {
      // Placeholder action when camera is not active
      console.log('Camera capture triggered (placeholder)');
      alert('Photo capture triggered! (Camera functionality will be implemented)');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    // Create new photo object
    const newPhoto: CapturedPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dataUrl,
      timestamp: Date.now()
    };

    // Update photos state and save to storage
    const updatedPhotos = [newPhoto, ...capturedPhotos].slice(0, 50); // Keep only last 50 photos
    setCapturedPhotos(updatedPhotos);
    savePhotosToStorage(updatedPhotos);

    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // Visual feedback - briefly flash white overlay
    const flashOverlay = document.createElement('div');
    flashOverlay.className = 'fixed inset-0 bg-white pointer-events-none z-50';
    document.body.appendChild(flashOverlay);
    setTimeout(() => {
      document.body.removeChild(flashOverlay);
    }, 100);

    // Placeholder: Log capture action
    console.log('Photo captured successfully! (Not sending to backend yet)');
    alert('Photo captured! (Not sending to backend - placeholder mode)');
  }, [isStreamActive, capturedPhotos, savePhotosToStorage]);

  // Request camera permission
  const requestPermission = useCallback(() => {
    setPermissionDenied(false);
    initializeCamera();
  }, [initializeCamera]);

  return (
    <div className="h-full bg-black relative flex flex-col">
      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Camera Viewfinder Area */}
      <div className="flex-1 relative bg-gray-900 overflow-hidden">
        {/* Video Stream */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${!isStreamActive ? 'hidden' : ''}`}
          autoPlay
          playsInline
          muted
        />

        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm">Initializing camera...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-white text-center px-6 max-w-sm">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
              <p className="text-sm mb-4">{error}</p>
              {permissionDenied && (
                <Button
                  onClick={requestPermission}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Request Camera Access
                </Button>
              )}
            </div>
          </div>
        )}

        {/* No Stream Placeholder */}
        {!isStreamActive && !isLoading && !error && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-white/60 text-center">
              <Camera className="w-16 h-16 mx-auto mb-2" />
              <p className="text-sm">Camera Unavailable</p>
            </div>
          </div>
        )}

        {/* Grid overlay for camera composition */}
        {isStreamActive && (
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/30"></div>
              ))}
            </div>
          </div>
        )}

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <Button 
            variant="ghost" 
            size="icon" 
            className={`text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 ${
              flashEnabled ? 'text-yellow-400' : ''
            }`}
            onClick={toggleFlash}
            disabled={!isStreamActive}
          >
            <Zap className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-black p-6 flex items-center justify-center relative">
        {/* Switch Camera Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute left-6 text-white hover:bg-white/10"
          onClick={switchCamera}
          disabled={!isStreamActive || isLoading}
        >
          <SwitchCamera className="w-6 h-6" />
        </Button>

        {/* Capture Button */}
        <div className="relative">
          <Button 
            className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 hover:bg-gray-100 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={capturePhoto}
            disabled={isLoading}
          >
            <div className="w-full h-full rounded-full bg-white"></div>
          </Button>
        </div>

        {/* Gallery Preview */}
        <div className="absolute right-6">
          {capturedPhotos.length > 0 ? (
            <div className="w-12 h-12 rounded-lg border-2 border-white/30 overflow-hidden">
              <img 
                src={capturedPhotos[0].dataUrl} 
                alt="Latest capture" 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-600 border-2 border-white/30 overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}