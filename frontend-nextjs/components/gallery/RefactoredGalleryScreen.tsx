import React from 'react';
import { GalleryHeader } from './GalleryHeader';
import { GalleryGrid } from './GalleryGrid';
import { ImageModal } from '../ImageModal';
import { useGalleryState, PhotoData } from './useGalleryState';

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
];

export function RefactoredGalleryScreen() {
  const {
    selectedPhoto,
    isModalOpen,
    isSelectionMode,
    selectedPhotos,
    actions
  } = useGalleryState(mockPhotos);

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      <GalleryHeader
        totalPhotos={mockPhotos.length}
        selectedCount={selectedPhotos.size}
        isSelectionMode={isSelectionMode}
        onToggleSelection={actions.toggleSelectionMode}
        onSelectAll={actions.selectAll}
        onDownloadSelected={actions.downloadSelected}
      />

      <GalleryGrid
        photos={mockPhotos}
        selectedPhotos={selectedPhotos}
        isSelectionMode={isSelectionMode}
        onPhotoClick={actions.handlePhotoClick}
      />

      <ImageModal
        isOpen={isModalOpen}
        onClose={actions.handleCloseModal}
        photo={selectedPhoto}
      />
    </div>
  );
}