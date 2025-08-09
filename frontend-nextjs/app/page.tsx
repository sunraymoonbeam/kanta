'use client';

import React, { useState } from 'react';
import { CameraScreen } from '../components/CameraScreen';
import { GalleryScreen } from '../components/GalleryScreen';
import { FaceClusteringScreen } from '../components/FaceClusteringScreen';
import { BottomNavigation, type Screen } from '../components/BottomNavigation';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('camera');

  const renderScreen = () => {
    switch (activeScreen) {
      case 'camera':
        return <CameraScreen />;
      case 'gallery':
        return <GalleryScreen />;
      case 'faces':
        return <FaceClusteringScreen />;
      default:
        return <CameraScreen />;
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col max-w-md mx-auto relative overflow-hidden">
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
