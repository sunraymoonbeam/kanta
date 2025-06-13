'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadImage } from '../../lib/api';
import { useEvents } from '../../components/EventContext';

const MAX_DISPOSABLE_SHOTS = 20;
const FILM_STRIP_ROWS = 4;
const FILM_STRIP_COLS = 5;
const IMAGE_FILTERS = ["Normal", "Black & White", "Warm", "Cool", "Sepia", "Vintage", "Dramatic"];

interface CapturedShot {
  id: string;
  dataUrl: string;
  file: File;
  filter: string;
  timestamp: number;
}

export default function CameraPage() {
  const { selected: eventCode } = useEvents();
  
  // Device upload states
  const [deviceFiles, setDeviceFiles] = useState<File[]>([]);
  const [deviceUploading, setDeviceUploading] = useState(false);
  
  // Camera states
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [filter, setFilter] = useState('Normal');
  
  // Film strip states
  const [pendingShots, setPendingShots] = useState<CapturedShot[]>([]);
  const [uploadedShots, setUploadedShots] = useState<CapturedShot[]>([]);
  const [selectedShots, setSelectedShots] = useState<Set<string>>(new Set());
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const filterStyle: Record<string, string> = {
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera on mobile
        }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current && shotsLeft > 0) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Apply filter
        ctx.filter = filterStyle[filter];
        ctx.drawImage(video, 0, 0);
        
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        
        // Convert to File object
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `disposable-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const shot: CapturedShot = {
              id: Date.now().toString(),
              dataUrl: dataURL,
              file,
              filter,
              timestamp: Date.now()
            };
            setPendingShots(prev => [...prev, shot]);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  }, [filter, filterStyle, shotsLeft]);

  const handleDeviceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDeviceFiles(files);
  };

  const uploadDeviceFiles = async () => {
    if (!eventCode || deviceFiles.length === 0) return;
    
    setDeviceUploading(true);
    const results = { successes: 0, errors: 0 };
    
    try {
      for (let i = 0; i < deviceFiles.length; i++) {
        const file = deviceFiles[i];
        try {
          await uploadImage(eventCode, file);
          results.successes++;
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          results.errors++;
        }
      }
      
      if (results.successes > 0) {
        alert(`Successfully uploaded ${results.successes} image(s)! 📸`);
      }
      if (results.errors > 0) {
        alert(`Failed to upload ${results.errors} image(s). Please try again.`);
      }
      
      setDeviceFiles([]);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } finally {
      setDeviceUploading(false);
    }
  };

  const uploadSelectedShots = async () => {
    if (!eventCode) return;
    
    const selectedShotIds = Array.from(selectedShots);
    const shotsToUpload = pendingShots.filter(shot => selectedShotIds.includes(shot.id));
    
    if (shotsToUpload.length === 0) {
      alert('Please select shots to upload');
      return;
    }

    const results = { successes: 0, errors: 0 };
    
    for (const shot of shotsToUpload) {
      try {
        await uploadImage(eventCode, shot.file);
        results.successes++;
        
        // Move to uploaded
        setUploadedShots(prev => [...prev, shot]);
        setPendingShots(prev => prev.filter(s => s.id !== shot.id));
        setSelectedShots(prev => {
          const newSet = new Set(prev);
          newSet.delete(shot.id);
          return newSet;
        });
      } catch (error) {
        console.error('Failed to upload shot:', error);
        results.errors++;
      }
    }
    
    if (results.successes > 0) {
      alert(`Successfully uploaded ${results.successes} shot(s)! 📸`);
    }
    if (results.errors > 0) {
      alert(`Failed to upload ${results.errors} shot(s). Please try again.`);
    }
  };

  const deleteSelectedShots = () => {
    const selectedShotIds = Array.from(selectedShots);
    if (selectedShotIds.length === 0) {
      alert('Please select shots to delete');
      return;
    }
    
    if (confirm(`Delete ${selectedShotIds.length} selected shot(s)?`)) {
      setPendingShots(prev => prev.filter(shot => !selectedShotIds.includes(shot.id)));
      setSelectedShots(new Set());
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

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  if (!eventCode) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>⚠️ No Event Selected</h2>
        <p>Please select an event from the dropdown menu to start uploading photos.</p>
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
      <div style={{ 
        background: '#fff', 
        borderRadius: '12px', 
        padding: '2rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '2rem',
          color: '#2c3e50',
          fontSize: '2.5rem'
        }}>📸 Event Film Cam</h1>
        
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <span style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem'
          }}>
            Event: {eventCode}
          </span>
        </div>

        <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#666' }}>
          Use the <strong>disposable camera</strong> for a limited roll of shots. You can also directly <strong>upload existing images</strong> from your device directly (no limit).
        </p>

        {/* Upload Existing Photos */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '1rem' }}>Upload Existing Photos</h3>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Upload images from your device to the event. You can upload any number of images.
          </p>
          
          <div style={{ 
            border: '2px dashed #ddd', 
            borderRadius: '8px', 
            padding: '2rem', 
            background: '#f8f9fa' 
          }}>
            <input 
              type="file" 
              accept="image/*" 
              multiple
              onChange={handleDeviceUpload}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: '#fff',
                marginBottom: '1rem'
              }}
            />
            
            {deviceFiles.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  Selected files ({deviceFiles.length}):
                </p>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                  gap: '0.5rem',
                  marginBottom: '1rem' 
                }}>
                  {deviceFiles.slice(0, 8).map((file, idx) => (
                    <div key={idx} style={{ 
                      background: '#fff', 
                      padding: '0.5rem', 
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontSize: '0.8rem',
                      textAlign: 'center'
                    }}>
                      📷 {file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}
                    </div>
                  ))}
                  {deviceFiles.length > 8 && (
                    <div style={{ 
                      background: '#f0f0f0', 
                      padding: '0.5rem', 
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontSize: '0.8rem',
                      textAlign: 'center',
                      color: '#666'
                    }}>
                      +{deviceFiles.length - 8} more
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <button
              onClick={uploadDeviceFiles}
              disabled={!deviceFiles.length || deviceUploading}
              style={{
                background: deviceFiles.length && !deviceUploading 
                  ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' 
                  : '#ccc',
                color: '#fff',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: deviceFiles.length && !deviceUploading ? 'pointer' : 'not-allowed',
                width: '100%'
              }}
            >
              {deviceUploading ? '⏳ Uploading...' : `📤 Upload ${deviceFiles.length} Image(s)`}
            </button>
          </div>
        </div>

        <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #eee' }} />

        {/* Disposable Camera Counter */}
        <div style={{
          fontFamily: 'Impact, sans-serif',
          fontSize: '28px',
          fontWeight: 'bold',
          padding: '25px 40px',
          background: '#F6DCAC',
          color: '#01204E',
          textAlign: 'center',
          borderRadius: '20px',
          position: 'relative',
          borderTop: '6px solid #028391',
          borderBottom: '6px solid #F85525',
          marginBottom: '2rem'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            left: '15px',
            width: '8px',
            height: '60%',
            background: 'linear-gradient(to bottom, #028391, #FAA968, #F85525)',
            opacity: 0.7
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            right: '15px',
            width: '8px',
            height: '60%',
            background: 'linear-gradient(to bottom, #028391, #FAA968, #F85525)',
            opacity: 0.7
          }} />
          DISPOSABLE CAMERA: {shotsLeft} SHOT{shotsLeft !== 1 ? 'S' : ''} REMAINING
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', alignItems: 'start' }}>
          {/* Camera Section */}
          <div>
            <h3 style={{ color: '#2c3e50', marginBottom: '1rem' }}>Disposable Camera</h3>
            
            {/* Camera Controls */}
            <div style={{ marginBottom: '1rem' }}>
              {!cameraStream ? (
                <button 
                  onClick={startCamera}
                  disabled={shotsLeft <= 0}
                  style={{
                    background: shotsLeft > 0 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#ccc',
                    color: '#fff',
                    border: 'none',
                    padding: '1rem 2rem',
                    borderRadius: '8px',
                    fontSize: '1.1rem',
                    cursor: shotsLeft > 0 ? 'pointer' : 'not-allowed',
                    width: '100%'
                  }}
                >
                  📷 Start Camera
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={capturePhoto}
                    disabled={shotsLeft <= 0}
                    style={{
                      background: shotsLeft > 0 ? 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)' : '#ccc',
                      color: '#fff',
                      border: 'none',
                      padding: '1rem',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      cursor: shotsLeft > 0 ? 'pointer' : 'not-allowed',
                      flex: 1
                    }}
                  >
                    📸 Capture
                  </button>
                  <button 
                    onClick={stopCamera}
                    style={{
                      background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '1rem',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      cursor: 'pointer'
                    }}
                  >
                    🛑 Stop
                  </button>
                </div>
              )}
            </div>

            {shotsLeft <= 0 && (
              <div style={{ 
                background: '#fee', 
                color: '#c33', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                🎞️ Disposable camera roll is full!<br />
                Delete some pending shots from the film strip to take more.
              </div>
            )}

            {/* Camera Video */}
            {cameraStream && (
              <div style={{ marginBottom: '1rem' }}>
                <video 
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{ 
                    width: '100%',
                    borderRadius: '8px',
                    filter: filterStyle[filter]
                  }}
                />
              </div>
            )}

            {/* Filter Selection */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem',
                color: '#2c3e50',
                fontWeight: 'bold'
              }}>
                Apply filter to new shot:
              </label>
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  background: '#fff'
                }}
              >
                {IMAGE_FILTERS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Hidden canvas for capturing */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          {/* Film Strip Section */}
          <div>
            <h3 style={{ color: '#2c3e50', marginBottom: '1rem' }}>Film Strip</h3>
            <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Your captured shots. Upload or delete pending shots using the buttons below.
            </p>

            {/* Film Strip Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${FILM_STRIP_COLS}, 1fr)`,
              gap: '0.5rem',
              marginBottom: '1rem',
              background: '#f0f0f0',
              padding: '1rem',
              borderRadius: '8px'
            }}>
              {Array.from({ length: FILM_STRIP_ROWS * FILM_STRIP_COLS }).map((_, index) => {
                const allShots = [...pendingShots, ...uploadedShots];
                const shot = allShots[index];
                const isPending = shot ? pendingShots.some(p => p.id === shot.id) : false;
                const isUploaded = shot ? uploadedShots.some(u => u.id === shot.id) : false;

                return (
                  <div
                    key={index}
                    style={{
                      aspectRatio: '1',
                      background: shot ? 'none' : 'rgba(200,200,200,0.3)',
                      border: '2px dashed #999',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {shot ? (
                      <>
                        <img
                          src={shot.dataUrl}
                          alt={`Shot ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '2px'
                          }}
                        />
                        {isPending && (
                          <>
                            <input
                              type="checkbox"
                              checked={selectedShots.has(shot.id)}
                              onChange={() => toggleShotSelection(shot.id)}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                left: '4px',
                                transform: 'scale(1.2)'
                              }}
                            />
                            <div style={{
                              position: 'absolute',
                              bottom: '0',
                              left: '0',
                              right: '0',
                              background: 'rgba(255, 165, 0, 0.9)',
                              color: 'white',
                              fontSize: '0.7rem',
                              textAlign: 'center',
                              padding: '2px'
                            }}>
                              PENDING
                            </div>
                          </>
                        )}
                        {isUploaded && (
                          <div style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '0',
                            right: '0',
                            background: 'rgba(39, 174, 96, 0.9)',
                            color: 'white',
                            fontSize: '0.7rem',
                            textAlign: 'center',
                            padding: '2px'
                          }}>
                            UPLOADED
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{ color: '#999', fontSize: '0.8rem' }}>Empty</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Film Strip Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button
                onClick={uploadSelectedShots}
                disabled={selectedShots.size === 0}
                style={{
                  background: selectedShots.size > 0 ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' : '#ccc',
                  color: '#fff',
                  border: 'none',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  cursor: selectedShots.size > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '0.9rem'
                }}
              >
                📤 Upload Selected ({selectedShots.size})
              </button>
              
              <button
                onClick={deleteSelectedShots}
                disabled={selectedShots.size === 0}
                style={{
                  background: selectedShots.size > 0 ? '#e74c3c' : '#ccc',
                  color: '#fff',
                  border: 'none',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  cursor: selectedShots.size > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '0.9rem'
                }}
              >
                🗑️ Delete Selected ({selectedShots.size})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
