'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadImage } from '../../../lib/api';
import { useEvents } from '../../../hooks/useEvents';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { CapturedShot, ImageFilter } from '../../../types/images';
import { IMAGE_FILTERS, MAX_DISPOSABLE_SHOTS, FILM_STRIP_ROWS, FILM_STRIP_COLS } from '../../../lib/constants';
import { effects } from '../../../config/kanta.config';
import styles from './UploadPage.module.css';

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

  // Device upload handlers
  const handleDeviceFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setDeviceFiles(files);
      
      const previews = files.map(file => URL.createObjectURL(file));
      setDevicePreviews(prev => {
        prev.forEach(url => URL.revokeObjectURL(url));
        return previews;
      });
    }
  }, []);

  const uploadDeviceFiles = useCallback(async () => {
    if (!eventCode || deviceFiles.length === 0) return;
    
    setDeviceUploading(true);
    try {
      const uploadPromises = deviceFiles.map(file => uploadImage(eventCode, file));
      await Promise.all(uploadPromises);
      
      setDeviceFiles([]);
      setDevicePreviews(prev => {
        prev.forEach(url => URL.revokeObjectURL(url));
        return [];
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setDeviceUploading(false);
    }
  }, [eventCode, deviceFiles]);

  // Camera handlers
  const startCamera = useCallback(async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      setCameraError('Unable to access camera. Please check permissions.');
      console.error('Camera error:', error);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || shotsLeft <= 0) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.save();
    if (filter !== 'Normal') {
      context.filter = filterStyle[filter];
    }
    context.drawImage(video, 0, 0);
    context.restore();
    
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const newShot: CapturedShot = {
          id: Date.now().toString(),
          dataUrl: canvas.toDataURL('image/jpeg', 0.9),
          file,
          filter,
          timestamp: Date.now()
        };
        setPendingShots(prev => [...prev, newShot]);
      }
    }, 'image/jpeg', 0.9);
  }, [filter, filterStyle, shotsLeft]);

  // Film strip handlers
  const toggleShotSelection = useCallback((shotId: string) => {
    setSelectedShots(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(shotId)) {
        newSelection.delete(shotId);
      } else {
        newSelection.add(shotId);
      }
      return newSelection;
    });
  }, []);

  const clearFilmStrip = useCallback(() => {
    setPendingShots([]);
    setUploadedShots([]);
    setSelectedShots(new Set());
    setUploadProgress({});
    setTotalProgress(0);
  }, []);

  const uploadSelectedShots = useCallback(async () => {
    if (!eventCode || selectedShots.size === 0) return;
    
    setIsUploading(true);
    const shotsToUpload = pendingShots.filter(shot => selectedShots.has(shot.id));
    
    try {
      for (const shot of shotsToUpload) {
        setUploadProgress(prev => ({ ...prev, [shot.id]: 0 }));
        
        // Use the file directly from the shot
        await uploadImage(eventCode, shot.file);
        
        setUploadProgress(prev => ({ ...prev, [shot.id]: 100 }));
        setUploadedShots(prev => [...prev, shot]);
        setPendingShots(prev => prev.filter(s => s.id !== shot.id));
      }
      
      setSelectedShots(new Set());
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  }, [eventCode, selectedShots, pendingShots]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      devicePreviews.forEach(url => URL.revokeObjectURL(url));
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [devicePreviews, cameraStream]);

  // Calculate total progress
  useEffect(() => {
    if (Object.keys(uploadProgress).length > 0) {
      const total = Object.values(uploadProgress).reduce((sum, progress) => sum + progress, 0);
      setTotalProgress(total / Object.keys(uploadProgress).length);
    }
  }, [uploadProgress]);

  return (
    <div className={styles.container}>
      {/* Background Effects */}
      <div className={styles.effects}>
        {effects.dots.display && (
          <div
            className={styles.effect}
            style={{
              background: `radial-gradient(circle, var(--brand-background-medium) 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
              opacity: effects.dots.opacity / 100
            }}
          />
        )}
        {effects.gradient.display && (
          <div
            className={styles.effect}
            style={{
              background: `linear-gradient(${effects.gradient.tilt}deg, var(--${effects.gradient.colorStart}), var(--${effects.gradient.colorEnd}))`,
              opacity: effects.gradient.opacity / 100
            }}
          />
        )}
      </div>

      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={styles.header}
        >
          <h1 className={styles.title}>📸 Upload Photos</h1>
          <p className={styles.subtitle}>
            Share your memories from the event
          </p>
        </motion.div>

        {/* Device Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card padding="lg" className={styles.uploadCard}>
            <h2 className={styles.sectionTitle}>📱 Upload from Device</h2>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleDeviceFiles}
              className={styles.fileInput}
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
              size="lg"
              className={styles.selectButton}
            >
              📁 Select Photos
            </Button>

            {deviceFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={styles.previewSection}
              >
                <h3 className={styles.previewTitle}>
                  Selected Files ({deviceFiles.length})
                </h3>
                
                <div className={styles.previewGrid}>
                  <AnimatePresence>
                    {devicePreviews.map((preview, index) => (
                      <motion.img
                        key={index}
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className={styles.previewImage}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: index * 0.1 }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                
                <Button
                  onClick={uploadDeviceFiles}
                  isLoading={deviceUploading}
                  disabled={deviceFiles.length === 0}
                  variant="primary"
                  size="lg"
                  className={styles.uploadButton}
                >
                  🚀 Upload {deviceFiles.length} Photo{deviceFiles.length !== 1 ? 's' : ''}
                </Button>
              </motion.div>
            )}
          </Card>
        </motion.div>

        {/* Camera Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card padding="lg" className={styles.cameraCard}>
            <h2 className={styles.sectionTitle}>📷 Camera Capture</h2>
            
            {/* Camera Controls */}
            <div className={styles.cameraControls}>
              {!cameraStream ? (
                <Button onClick={startCamera} variant="primary" size="lg">
                  📹 Start Camera
                </Button>
              ) : (
                <Button onClick={stopCamera} variant="secondary" size="lg">
                  ⏹ Stop Camera
                </Button>
              )}

              {/* Filter Selection */}
              <div className={styles.filterSection}>
                <label className={styles.filterLabel}>Filter:</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as ImageFilter)}
                  className={styles.filterSelect}
                >
                  {IMAGE_FILTERS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Camera Error */}
            {cameraError && (
              <div className={styles.error}>
                ⚠️ {cameraError}
              </div>
            )}

            {/* Camera View */}
            {cameraStream && (
              <div className={styles.cameraView}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={styles.video}
                  style={{ filter: filterStyle[filter] }}
                />
                
                <canvas
                  ref={canvasRef}
                  className={styles.canvas}
                />
                
                <div className={styles.captureControls}>
                  <Button
                    onClick={capturePhoto}
                    disabled={shotsLeft <= 0}
                    variant="primary"
                    size="lg"
                    className={styles.captureButton}
                  >
                    📸 Capture ({shotsLeft} left)
                  </Button>
                </div>
              </div>
            )}

            {/* Film Strip */}
            {(pendingShots.length > 0 || uploadedShots.length > 0) && (
              <div className={styles.filmStrip}>
                <div className={styles.filmStripHeader}>
                  <h3 className={styles.filmStripTitle}>
                    🎞️ Film Strip ({shotsUsed}/{MAX_DISPOSABLE_SHOTS})
                  </h3>
                  <div className={styles.filmStripControls}>
                    <Button
                      onClick={uploadSelectedShots}
                      disabled={selectedShots.size === 0 || isUploading}
                      isLoading={isUploading}
                      variant="primary"
                    >
                      📤 Upload Selected ({selectedShots.size})
                    </Button>
                    <Button
                      onClick={clearFilmStrip}
                      disabled={isUploading}
                      variant="secondary"
                    >
                      🗑️ Clear All
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                {isUploading && (
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill}
                      style={{ width: `${totalProgress}%` }}
                    />
                  </div>
                )}

                {/* Film Strip Grid */}
                <div className={styles.filmStripGrid}>
                  {[...pendingShots, ...uploadedShots].slice(0, MAX_DISPOSABLE_SHOTS).map((shot) => (
                    <div
                      key={shot.id}
                      className={`${styles.filmFrame} ${
                        selectedShots.has(shot.id) ? styles.selected : ''
                      } ${
                        uploadedShots.some(u => u.id === shot.id) ? styles.uploaded : ''
                      }`}
                      onClick={() => toggleShotSelection(shot.id)}
                    >
                      <img
                        src={shot.dataUrl}
                        alt={`Shot ${shot.id}`}
                        className={styles.filmImage}
                      />
                      
                      {/* Upload Status */}
                      {uploadedShots.some(u => u.id === shot.id) && (
                        <div className={styles.uploadStatus}>
                          ✓
                        </div>
                      )}
                      
                      {/* Upload Progress */}
                      {uploadProgress[shot.id] !== undefined && uploadProgress[shot.id] < 100 && (
                        <div className={styles.uploadProgress}>
                          {uploadProgress[shot.id]}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}