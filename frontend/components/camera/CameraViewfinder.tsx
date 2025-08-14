import React from 'react';
import { Camera, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

interface CameraViewfinderProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isStreamActive: boolean;
  isLoading: boolean;
  error: string | null;
  permissionDenied: boolean;
  onRequestPermission: () => void;
}

export function CameraViewfinder({
  videoRef,
  isStreamActive,
  isLoading,
  error,
  permissionDenied,
  onRequestPermission,
}: CameraViewfinderProps) {
  return (
    <div className="flex-1 relative bg-gray-900 overflow-hidden">
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${!isStreamActive ? 'hidden' : ''}`}
        autoPlay
        playsInline
        muted
      />

      {isLoading && <LoadingOverlay />}
      {error && (
        <ErrorOverlay
          error={error}
          permissionDenied={permissionDenied}
          onRequestPermission={onRequestPermission}
        />
      )}
      {!isStreamActive && !isLoading && !error && <NoStreamPlaceholder />}
      {isStreamActive && <CompositionGrid />}
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
      <div className="text-white text-center">
        <Loader2 className="animate-spin w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">Initializing camera...</p>
      </div>
    </div>
  );
}

interface ErrorOverlayProps {
  error: string;
  permissionDenied: boolean;
  onRequestPermission: () => void;
}

function ErrorOverlay({ error, permissionDenied, onRequestPermission }: ErrorOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
      <div className="text-white text-center px-6 max-w-sm">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
        <p className="text-sm mb-4">{error}</p>
        {permissionDenied && (
          <Button
            onClick={onRequestPermission}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Request Camera Access
          </Button>
        )}
      </div>
    </div>
  );
}

function NoStreamPlaceholder() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-white/60 text-center">
        <Camera className="w-16 h-16 mx-auto mb-2" />
        <p className="text-sm">Camera Unavailable</p>
      </div>
    </div>
  );
}

function CompositionGrid() {
  return (
    <div className="absolute inset-0 opacity-20 pointer-events-none">
      <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="border border-white/30" />
        ))}
      </div>
    </div>
  );
}