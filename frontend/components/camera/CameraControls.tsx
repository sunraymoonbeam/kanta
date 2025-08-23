import React from 'react';
import { Zap, Settings, SwitchCamera } from 'lucide-react';
import { Button } from '../ui/button';

interface CameraControlsProps {
  isStreamActive: boolean;
  isLoading: boolean;
  flashEnabled: boolean;
  latestPhoto?: { dataUrl: string } | null;
  onToggleFlash: () => void;
  onSwitchCamera: () => void;
  onCapture: () => void;
  onOpenSettings?: () => void;
}

export function CameraControls({
  isStreamActive,
  isLoading,
  flashEnabled,
  latestPhoto,
  onToggleFlash,
  onSwitchCamera,
  onCapture,
  onOpenSettings,
}: CameraControlsProps) {
  return (
    <>
      <TopControls
        isStreamActive={isStreamActive}
        flashEnabled={flashEnabled}
        onToggleFlash={onToggleFlash}
        onOpenSettings={onOpenSettings}
      />
      <BottomControls
        isStreamActive={isStreamActive}
        isLoading={isLoading}
        latestPhoto={latestPhoto}
        onSwitchCamera={onSwitchCamera}
        onCapture={onCapture}
      />
    </>
  );
}

interface TopControlsProps {
  isStreamActive: boolean;
  flashEnabled: boolean;
  onToggleFlash: () => void;
  onOpenSettings?: () => void;
}

function TopControls({ isStreamActive, flashEnabled, onToggleFlash, onOpenSettings }: TopControlsProps) {
  return (
    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
      <Button
        variant="ghost"
        size="icon"
        className={`text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 ${
          flashEnabled ? 'text-yellow-400' : ''
        }`}
        onClick={onToggleFlash}
        disabled={!isStreamActive}
      >
        <Zap className="w-5 h-5" />
      </Button>
      {onOpenSettings && (
        <Button
          variant="ghost"
          size="icon"
          className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40"
          onClick={onOpenSettings}
        >
          <Settings className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}

interface BottomControlsProps {
  isStreamActive: boolean;
  isLoading: boolean;
  latestPhoto?: { dataUrl: string } | null;
  onSwitchCamera: () => void;
  onCapture: () => void;
}

function BottomControls({
  isStreamActive,
  isLoading,
  latestPhoto,
  onSwitchCamera,
  onCapture,
}: BottomControlsProps) {
  return (
    <div className="bg-black p-6 flex items-center justify-center relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-6 text-white hover:bg-white/10"
        onClick={onSwitchCamera}
        disabled={!isStreamActive || isLoading}
      >
        <SwitchCamera className="w-6 h-6" />
      </Button>

      <CaptureButton onClick={onCapture} disabled={isLoading} />

      <GalleryPreview latestPhoto={latestPhoto} />
    </div>
  );
}

interface CaptureButtonProps {
  onClick: () => void;
  disabled: boolean;
}

function CaptureButton({ onClick, disabled }: CaptureButtonProps) {
  return (
    <div className="relative">
      <Button
        className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 hover:bg-gray-100 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onClick}
        disabled={disabled}
      >
        <div className="w-full h-full rounded-full bg-white" />
      </Button>
    </div>
  );
}

interface GalleryPreviewProps {
  latestPhoto?: { dataUrl: string } | null;
}

function GalleryPreview({ latestPhoto }: GalleryPreviewProps) {
  return (
    <div className="absolute right-6">
      {latestPhoto ? (
        <div className="w-12 h-12 rounded-lg border-2 border-white/30 overflow-hidden">
          <img
            src={latestPhoto.dataUrl}
            alt="Latest capture"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-lg bg-gray-600 border-2 border-white/30 overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500" />
        </div>
      )}
    </div>
  );
}