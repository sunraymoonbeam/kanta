import React, { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MoreVertical, Check, Download, Square } from 'lucide-react';
import { Button } from './ui/button';
import { ImageModal, PhotoData } from './ImageModal';

// Mock photo data with faces
const mockPhotos: PhotoData[] = [
  { 
    id: 1, 
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=300&fit=crop&crop=face',
    faces: [
      { id: 1, url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face', confidence: 0.95 }
    ]
  },
  { 
    id: 2, 
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face',
    faces: [
      { id: 2, url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', confidence: 0.87 }
    ]
  },
  { 
    id: 3, 
    url: 'https://images.unsplash.com/photo-1494790108755-2616b612b639?w=300&h=300&fit=crop&crop=face',
    faces: [
      { id: 3, url: 'https://images.unsplash.com/photo-1494790108755-2616b612b639?w=100&h=100&fit=crop&crop=face', confidence: 0.92 }
    ]
  },
  { 
    id: 4, 
    url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&h=300&fit=crop&crop=face',
    faces: [
      { id: 4, url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop&crop=face', confidence: 0.89 }
    ]
  },
  { 
    id: 5, 
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop&crop=face',
    faces: [
      { id: 5, url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face', confidence: 0.91 }
    ]
  },
  { 
    id: 6, 
    url: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=300&h=300&fit=crop&crop=face' 
  },
  { 
    id: 7, 
    url: 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=300&h=300&fit=crop&crop=face',
    faces: [
      { id: 7, url: 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=100&h=100&fit=crop&crop=face', confidence: 0.88 }
    ]
  },
  { 
    id: 8, 
    url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face',
    faces: [
      { id: 8, url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', confidence: 0.94 }
    ]
  },
  { 
    id: 9, 
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face' 
  },
  { 
    id: 10, 
    url: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=300&h=300&fit=crop&crop=face',
    faces: [
      { id: 10, url: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&h=100&fit=crop&crop=face', confidence: 0.86 }
    ]
  },
  { 
    id: 11, 
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop&crop=face',
    faces: [
      { id: 11, url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face', confidence: 0.93 }
    ]
  },
  { 
    id: 12, 
    url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300&h=300&fit=crop&crop=face' 
  },
];

export function GalleryScreen() {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());

  const handlePhotoClick = (photo: PhotoData) => {
    if (isSelectionMode) {
      const newSelected = new Set(selectedPhotos);
      if (newSelected.has(photo.id)) {
        newSelected.delete(photo.id);
      } else {
        newSelected.add(photo.id);
      }
      setSelectedPhotos(newSelected);
    } else {
      setSelectedPhoto(photo);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPhoto(null);
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (!isSelectionMode) {
      setSelectedPhotos(new Set());
    }
  };

  const handleSelectAll = () => {
    if (selectedPhotos.size === mockPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(mockPhotos.map(photo => photo.id)));
    }
  };

  const handleDownloadSelected = () => {
    // Placeholder functionality - in a real app, this would trigger actual download
    console.log('Downloading selected photos:', Array.from(selectedPhotos));
    const selectedPhotoData = mockPhotos.filter(photo => selectedPhotos.has(photo.id));
    selectedPhotoData.forEach(photo => {
      console.log(`Downloading photo ${photo.id}:`, photo.url);
    });
  };

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-base sm:text-lg">Photos</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isSelectionMode 
                ? `${selectedPhotos.size} of ${mockPhotos.length} selected`
                : `${mockPhotos.length} photos`
              }
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {isSelectionMode && (
              <>
                <Button variant="outline" size="sm" onClick={handleSelectAll} className="text-xs sm:text-sm px-2 sm:px-3">
                  {selectedPhotos.size === mockPhotos.length ? 'Deselect' : 'Select All'}
                </Button>
                {selectedPhotos.size > 0 && (
                  <Button variant="default" size="sm" onClick={handleDownloadSelected} className="text-xs sm:text-sm px-2 sm:px-3">
                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline ml-1">Download</span>
                    <span className="ml-1">({selectedPhotos.size})</span>
                  </Button>
                )}
              </>
            )}
            <Button 
              variant={isSelectionMode ? "default" : "ghost"} 
              size="sm" 
              onClick={handleToggleSelectionMode}
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              {isSelectionMode ? 'Done' : 'Select'}
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-9 sm:h-9">
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-3 gap-1">
          {mockPhotos.map((photo) => {
            const isSelected = selectedPhotos.has(photo.id);
            return (
              <div 
                key={photo.id} 
                className="aspect-square relative group cursor-pointer"
                onClick={() => handlePhotoClick(photo)}
              >
                <ImageWithFallback
                  src={photo.url}
                  alt={`Photo ${photo.id}`}
                  className={`w-full h-full object-cover rounded-lg transition-all duration-200 group-active:scale-95 ${
                    isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                />
                
                {/* Selection checkbox */}
                {isSelectionMode && (
                  <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-10">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-primary border-primary text-white' 
                        : 'bg-white/80 border-white backdrop-blur-sm'
                    }`}>
                      {isSelected ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Square className="w-3 h-3 opacity-0" />
                      )}
                    </div>
                  </div>
                )}
                
                {/* Selection overlay */}
                <div className={`absolute inset-0 rounded-lg transition-all duration-200 ${
                  isSelectionMode 
                    ? (isSelected ? 'bg-primary/20' : 'bg-black/0 group-active:bg-black/10')
                    : 'bg-black/0 group-active:bg-black/20'
                }`}></div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Image Modal */}
      <ImageModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        photo={selectedPhoto}
      />
    </div>
  );
}