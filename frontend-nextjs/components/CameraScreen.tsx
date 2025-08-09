import React from 'react';
import { Camera, SwitchCamera, Zap, Settings } from 'lucide-react';
import { Button } from './ui/button';

export function CameraScreen() {
  return (
    <div className="h-full bg-black relative flex flex-col">
      {/* Camera Viewfinder Area */}
      <div className="flex-1 relative bg-gray-900 overflow-hidden">
        {/* Simulated camera feed with grid overlay */}
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 relative">
          {/* Grid overlay for camera composition */}
          <div className="absolute inset-0 opacity-20">
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/30"></div>
              ))}
            </div>
          </div>
          
          {/* Camera feed placeholder */}
          <div className="absolute inset-4 border-2 border-white/30 rounded-lg flex items-center justify-center">
            <div className="text-white/60 text-center">
              <Camera className="w-16 h-16 mx-auto mb-2" />
              <p className="text-sm">Camera Feed</p>
            </div>
          </div>
        </div>

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
          <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40">
            <Zap className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-sm hover:bg-black/40">
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
        >
          <SwitchCamera className="w-6 h-6" />
        </Button>

        {/* Capture Button */}
        <div className="relative">
          <Button 
            className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 hover:bg-gray-100 transition-all duration-200 active:scale-95"
            onClick={() => {
              // Simulate capture with haptic feedback
              console.log('Photo captured!');
            }}
          >
            <div className="w-full h-full rounded-full bg-white"></div>
          </Button>
        </div>

        {/* Gallery Preview */}
        <div className="absolute right-6">
          <div className="w-12 h-12 rounded-lg bg-gray-600 border-2 border-white/30 overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
          </div>
        </div>
      </div>
    </div>
  );
}