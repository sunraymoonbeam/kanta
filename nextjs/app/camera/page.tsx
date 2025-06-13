'use client';
import { useState, useRef, useCallback } from 'react';
import { uploadImage } from '../../lib/api';
import { useEvents } from '../../components/EventContext';

export default function CameraPage() {
  const { selected: eventCode } = useEvents();
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>('');
  const [filter, setFilter] = useState('Normal');
  const [uploading, setUploading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');
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
    if (videoRef.current && canvasRef.current) {
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
        setCapturedPhoto(dataURL);
        
        // Convert to File object
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setFile(file);
            setPreview(dataURL);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  }, [filter, filterStyle]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setCapturedPhoto('');
    }
  };

  const handleUpload = async () => {
    if (!file || !eventCode) {
      alert('Please select an event and capture/upload a photo first.');
      return;
    }

    setUploading(true);
    try {
      await uploadImage(eventCode, file);
      alert('Photo uploaded successfully! 📸');
      setFile(undefined);
      setPreview('');
      setCapturedPhoto('');
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setUploading(false);
    }
  };

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
      maxWidth: '800px', 
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
        <h2 style={{ 
          textAlign: 'center', 
          marginBottom: '2rem',
          color: '#2c3e50',
          fontSize: '2rem'
        }}>📸 Event Camera</h2>
        
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

        {/* Camera Controls */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          {!cameraStream ? (
            <button 
              onClick={startCamera}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '8px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                marginRight: '1rem'
              }}
            >
              📷 Start Camera
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={capturePhoto}
                style={{
                  background: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  cursor: 'pointer'
                }}
              >
                📸 Capture Photo
              </button>
              <button 
                onClick={stopCamera}
                style={{
                  background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  cursor: 'pointer'
                }}
              >
                🛑 Stop Camera
              </button>
            </div>
          )}
        </div>

        {/* Camera Video */}
        {cameraStream && (
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <video 
              ref={videoRef}
              autoPlay
              playsInline
              style={{ 
                width: '100%',
                maxWidth: '500px',
                borderRadius: '8px',
                filter: filterStyle[filter]
              }}
            />
          </div>
        )}

        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* File Upload */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem',
            color: '#2c3e50',
            fontWeight: 'bold'
          }}>
            Or upload from device:
          </label>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment"
            onChange={handleFileUpload}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '2px dashed #ddd',
              borderRadius: '8px',
              background: '#f8f9fa'
            }}
          />
        </div>

        {/* Filter Selection */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem',
            color: '#2c3e50',
            fontWeight: 'bold'
          }}>
            Photo Filter:
          </label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              background: '#fff'
            }}
          >
            {Object.keys(filterStyle).map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* Preview */}
        {preview && (
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <h3 style={{ color: '#2c3e50', marginBottom: '1rem' }}>Preview:</h3>
            <img 
              src={preview} 
              alt="Preview"
              style={{ 
                width: '100%',
                maxWidth: '400px',
                borderRadius: '8px',
                filter: filterStyle[filter],
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
              }} 
            />
          </div>
        )}

        {/* Upload Button */}
        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{
              background: file && !uploading 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                : '#ccc',
              color: '#fff',
              border: 'none',
              padding: '1rem 3rem',
              borderRadius: '8px',
              fontSize: '1.2rem',
              cursor: file && !uploading ? 'pointer' : 'not-allowed',
              transform: file && !uploading ? 'translateY(0)' : 'translateY(2px)',
              boxShadow: file && !uploading ? '0 4px 15px rgba(0,0,0,0.2)' : 'none'
            }}
          >
            {uploading ? '⏳ Uploading...' : '📤 Upload Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
