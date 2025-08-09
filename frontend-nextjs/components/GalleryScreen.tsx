import React from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MoreVertical } from 'lucide-react';
import { Button } from './ui/button';

// Mock photo data
const mockPhotos = [
  { id: 1, url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=300&fit=crop&crop=face' },
  { id: 2, url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face' },
  { id: 3, url: 'https://images.unsplash.com/photo-1494790108755-2616b612b639?w=300&h=300&fit=crop&crop=face' },
  { id: 4, url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&h=300&fit=crop&crop=face' },
  { id: 5, url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop&crop=face' },
  { id: 6, url: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=300&h=300&fit=crop&crop=face' },
  { id: 7, url: 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=300&h=300&fit=crop&crop=face' },
  { id: 8, url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face' },
  { id: 9, url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face' },
  { id: 10, url: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=300&h=300&fit=crop&crop=face' },
  { id: 11, url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop&crop=face' },
  { id: 12, url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300&h=300&fit=crop&crop=face' },
];

export function GalleryScreen() {
  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg">Photos</h1>
            <p className="text-sm text-muted-foreground">{mockPhotos.length} photos</p>
          </div>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-3 gap-1">
          {mockPhotos.map((photo) => (
            <div key={photo.id} className="aspect-square relative group">
              <ImageWithFallback
                src={photo.url}
                alt={`Photo ${photo.id}`}
                className="w-full h-full object-cover rounded-lg transition-transform duration-200 group-active:scale-95"
              />
              {/* Selection overlay on tap */}
              <div className="absolute inset-0 bg-black/0 group-active:bg-black/20 rounded-lg transition-colors duration-200"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}