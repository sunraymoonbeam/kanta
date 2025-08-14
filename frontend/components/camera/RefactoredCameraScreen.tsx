import React, { useCallback } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { usePhotoCapture } from '../../hooks/usePhotoCapture';
import { CameraViewfinder } from './CameraViewfinder';
import { CameraControls } from './CameraControls';
import { useToast } from '../../hooks/useToast';

export function RefactoredCameraScreen() {
  const { showToast } = useToast();
  
  const {
    videoRef,
    state,
    flashEnabled,
    actions
  } = useCamera({ facingMode: 'environment' });

  const {
    canvasRef,
    capturedPhotos,
    capturePhoto,
  } = usePhotoCapture({ maxPhotos: 50, quality: 0.9 });

  const handleCapture = useCallback(async () => {
    if (!state.isStreamActive) {
      showToast('Camera is not ready', 'error');
      return;
    }

    const photo = await capturePhoto(videoRef.current);
    if (photo) {
      showToast('Photo captured successfully!', 'success');
    }
  }, [state.isStreamActive, capturePhoto, videoRef, showToast]);

  const handleRequestPermission = useCallback(() => {
    actions.initializeCamera();
  }, [actions]);

  return (
    <div className="h-full bg-black relative flex flex-col">
      <canvas ref={canvasRef} className="hidden" />
      
      <CameraViewfinder
        videoRef={videoRef}
        isStreamActive={state.isStreamActive}
        isLoading={state.isLoading}
        error={state.error}
        permissionDenied={state.permissionDenied}
        onRequestPermission={handleRequestPermission}
      />

      <CameraControls
        isStreamActive={state.isStreamActive}
        isLoading={state.isLoading}
        flashEnabled={flashEnabled}
        latestPhoto={capturedPhotos[0]}
        onToggleFlash={actions.toggleFlash}
        onSwitchCamera={actions.switchCamera}
        onCapture={handleCapture}
      />
    </div>
  );
}