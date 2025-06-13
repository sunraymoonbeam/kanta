'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { uploadImage } from '../../../lib/api';
import { useEvents } from '../../../hooks/useEvents';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { CapturedShot, ImageFilter } from '../../../types/images';
import { IMAGE_FILTERS, MAX_DISPOSABLE_SHOTS, FILM_STRIP_ROWS, FILM_STRIP_COLS } from '../../../lib/constants';

export default function UploadPage() {
  const { selected: eventCode } = useEvents();
  
  // Device upload states
  const [deviceFiles, setDeviceFiles] = useState<File[]>([]);
  const [deviceUploading, setDeviceUploading] = useState(false);
  const [devicePreviews, setDevicePreviews] = useState<string[]>([]);
  
  // Camera states
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [filter, setFilter] = useState<ImageFilter>('Normal');
  
  // Film strip states
  const [pendingShots, setPendingShots] = useState<CapturedShot[]>([]);
  const [uploadedShots, setUploadedShots] = useState<CapturedShot[]>([]);
  const [selectedShots, setSelectedShots] = useState<Set<string>>(new Set());
  
  // Progress tracking states
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [totalProgress, setTotalProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filterStyle: Record<ImageFilter, string> = {
    'Normal': 'none',
    'Black & White': 'grayscale(100%)',
    'Warm': 'sepia(0.3) saturate(120%)',
    'Cool': 'contrast(90%) hue-rotate(180deg)',
    'Sepia': 'sepia(100%)',
    'Vintage': 'sepia(0.5) contrast(1.2) brightness(1.1)',
    'Dramatic': 'contrast(1.5) saturate(0.8) brightness(0.9)',
  };

  const shotsUsed = pendingShots.length + uploadedShots.length;
  const shotsLeft = MAX_DISPOSABLE_SHOTS - shotsUsed;

  const startCamera = useCallback(async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.error('Error playing video:', e);
          });
        }
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      const errorMessage = error.name === 'NotAllowedError' 
        ? 'Camera access denied. Please allow camera permissions and try again.'
        : error.name === 'NotFoundError'
        ? 'No camera found on this device.'
        : 'Could not access camera. Please check permissions and try again.';
      setCameraError(errorMessage);
      alert(errorMessage);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [cameraStream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || shotsLeft <= 0) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.filter = filterStyle[filter];
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' });
      const dataUrl = canvas.toDataURL('image/png');
      
      const shot: CapturedShot = {
        id: Date.now().toString(),
        dataUrl,
        file,
        filter,
        timestamp: Date.now(),
      };

      setPendingShots(prev => [...prev, shot]);
    }, 'image/png');
  }, [filter, filterStyle, shotsLeft]);

  const handleDeviceFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setDeviceFiles(files);
    
    // Generate previews
    Promise.all(
      files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      })
    ).then(setDevicePreviews);
  };

  const uploadDeviceFiles = async () => {
    if (!eventCode || deviceFiles.length === 0) return;

    setDeviceUploading(true);
    try {
      for (const file of deviceFiles) {
        await uploadImage(eventCode, file);
      }
      alert(`Successfully uploaded ${deviceFiles.length} photos!`);
      setDeviceFiles([]);
      setDevicePreviews([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setDeviceUploading(false);
    }
  };

  const uploadSelectedShots = async () => {
    if (!eventCode || selectedShots.size === 0) return;

    setIsUploading(true);
    setUploadProgress({});

    const shotsToUpload = pendingShots.filter(shot => selectedShots.has(shot.id));

    try {
      for (let i = 0; i < shotsToUpload.length; i++) {
        const shot = shotsToUpload[i];
        setUploadProgress(prev => ({ ...prev, [shot.id]: 0 }));
        
        await uploadImage(eventCode, shot.file);
        
        setUploadProgress(prev => ({ ...prev, [shot.id]: 100 }));
        setTotalProgress(((i + 1) / shotsToUpload.length) * 100);
      }

      // Move uploaded shots
      setUploadedShots(prev => [...prev, ...shotsToUpload]);
      setPendingShots(prev => prev.filter(shot => !selectedShots.has(shot.id)));
      setSelectedShots(new Set());
      
      alert(`Successfully uploaded ${shotsToUpload.length} photos!`);
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress({});
      setTotalProgress(0);
    }
  };

  const toggleShotSelection = (shotId: string) => {
    setSelectedShots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shotId)) {
        newSet.delete(shotId);
      } else {
        newSet.add(shotId);
      }
      return newSet;
    });
  };

  const clearFilmStrip = () => {
    setPendingShots([]);
    setUploadedShots([]);
    setSelectedShots(new Set());
  };

  if (!eventCode) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Card padding="lg">
          <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>No Event Selected</h2>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Please select an event from the header dropdown before uploading photos.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1200px', 
      margin: '0 auto',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh'
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '1rem',
          color: '#2c3e50',
          fontSize: '2.5rem'
        }}>
          📸 Upload Photos
        </h1>
        <p style={{ 
          textAlign: 'center', 
          color: '#666', 
          fontSize: '1.1rem' 
        }}>
          Upload photos to <strong>{eventCode}</strong> using your device or camera
        </p>
      </div>

      {/* Device Upload Section */}
      <Card style={{ marginBottom: '2rem' }} padding="lg">
        <h2 style={{ color: '#2c3e50', marginBottom: '1rem' }}>📱 Upload from Device</h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleDeviceFileSelect}
            style={{
              width: '100%',
              padding: '1rem',
              border: '2px dashed #ddd',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          />
        </div>

        {devicePreviews.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Selected Files ({deviceFiles.length})</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              {devicePreviews.map((preview, index) => (
                <img
                  key={index}
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '120px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #ddd'
                  }}
                />
              ))}
            </div>
            
            <Button
              onClick={uploadDeviceFiles}
              isLoading={deviceUploading}
              disabled={deviceFiles.length === 0}
              variant="primary"
            >
              {deviceUploading ? 'Uploading...' : `Upload ${deviceFiles.length} Photos`}
            </Button>
          </div>
        )}
      </Card>

      {/* Camera Section */}
      <Card padding="lg">
        <h2 style={{ color: '#2c3e50', marginBottom: '1rem' }}>📷 Camera Capture</h2>
        
        {/* Camera Controls */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {!cameraStream ? (
            <Button onClick={startCamera} variant="primary">
              Start Camera
            </Button>
          ) : (
            <Button onClick={stopCamera} variant="secondary">
              Stop Camera
            </Button>
          )}
          
          {cameraStream && (
            <>
              <Button 
                onClick={capturePhoto}
                disabled={shotsLeft <= 0}
                variant="success"
              >
                📸 Capture ({shotsLeft} left)
              </Button>
              
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as ImageFilter)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #ddd'
                }}
              >
                {IMAGE_FILTERS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Camera Preview */}
        {cameraStream && (
          <div style={{ marginBottom: '1rem' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                maxWidth: '500px',
                height: 'auto',
                borderRadius: '8px',
                filter: filterStyle[filter]
              }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {/* Error Display */}
        {cameraError && (
          <div style={{ 
            background: '#fee', 
            color: '#c33', 
            padding: '1rem', 
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            {cameraError}
          </div>
        )}

        {/* Film Strip */}
        {(pendingShots.length > 0 || uploadedShots.length > 0) && (
          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Film Strip ({shotsUsed}/{MAX_DISPOSABLE_SHOTS})</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedShots.size > 0 && (
                  <Button
                    onClick={uploadSelectedShots}
                    isLoading={isUploading}
                    variant="primary"
                  >
                    Upload Selected ({selectedShots.size})
                  </Button>
                )}
                <Button onClick={clearFilmStrip} variant="danger" size="sm">
                  Clear All
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ 
                  background: '#e0e0e0', 
                  borderRadius: '4px', 
                  height: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    background: '#667eea', 
                    height: '100%', 
                    width: `${totalProgress}%`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <p style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Uploading... {Math.round(totalProgress)}%
                </p>
              </div>
            )}

            {/* Film Strip Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: `repeat(${FILM_STRIP_COLS}, 1fr)`, 
              gap: '0.5rem',
              maxHeight: `${FILM_STRIP_ROWS * 120 + (FILM_STRIP_ROWS - 1) * 8}px`,
              overflow: 'hidden'
            }}>
              {[...pendingShots, ...uploadedShots].slice(0, MAX_DISPOSABLE_SHOTS).map((shot) => (
                <div
                  key={shot.id}
                  onClick={() => !uploadedShots.some(u => u.id === shot.id) && toggleShotSelection(shot.id)}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: uploadedShots.some(u => u.id === shot.id) ? 'default' : 'pointer',
                    border: selectedShots.has(shot.id) ? '3px solid #667eea' : '1px solid #ddd',
                    opacity: uploadedShots.some(u => u.id === shot.id) ? 0.7 : 1
                  }}
                >
                  <img
                    src={shot.dataUrl}
                    alt={`Shot ${shot.id}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  
                  {uploadedShots.some(u => u.id === shot.id) && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: 'rgba(0,0,0,0.8)',
                      color: '#fff',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem'
                    }}>
                      ✓ Uploaded
                    </div>
                  )}
                  
                  {selectedShots.has(shot.id) && !uploadedShots.some(u => u.id === shot.id) && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: '#667eea',
                      color: '#fff',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem'
                    }}>
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
