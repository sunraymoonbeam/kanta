'use client';

import React, { useState, use } from 'react';
import { CameraScreen } from '../../../../components/CameraScreen';
import { GalleryScreen } from '../../../../components/GalleryScreen';
import { FaceClusteringScreen } from '../../../../components/FaceClusteringScreen';
import { BottomNavigation, type Screen } from '../../../../components/BottomNavigation';

interface Props {
  params: Promise<{
    code: string;
  }>;
}

export default function EventCameraApp({ params }: Props) {
  const [activeScreen, setActiveScreen] = useState<Screen>('camera');
  const { code } = use(params);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'camera':
        return <CameraScreen eventCode={code} />;
      case 'gallery':
        return <GalleryScreen eventCode={code} />;
      case 'faces':
        return <FaceClusteringScreen eventCode={code} />;
      default:
        return <CameraScreen eventCode={code} />;
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col max-w-md mx-auto relative overflow-hidden">
      <header className="p-4 bg-gray-50 border-b">
        <h1 className="text-lg font-semibold text-gray-900">Event: {code}</h1>
      </header>
      <main className="flex-1 overflow-hidden">
        {renderScreen()}
      </main>
      <BottomNavigation 
        activeScreen={activeScreen} 
        onScreenChange={setActiveScreen} 
      />
    </div>
  );
}