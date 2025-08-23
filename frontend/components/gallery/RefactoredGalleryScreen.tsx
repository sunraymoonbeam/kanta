import React from 'react';
import { GalleryHeader } from './GalleryHeader';
import { GalleryGrid } from './GalleryGrid';
import { ImageModal } from '../ImageModal';
import { useGalleryState, PhotoData } from './useGalleryState';

export function RefactoredGalleryScreen() {
  const photos: PhotoData[] = [];
  
  const {
    selectedPhoto,
    isModalOpen,
    isSelectionMode,
    selectedPhotos,
    actions
  } = useGalleryState(photos);

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      <GalleryHeader
        totalPhotos={photos.length}
        selectedCount={selectedPhotos.size}
        isSelectionMode={isSelectionMode}
        onToggleSelection={actions.toggleSelectionMode}
        onSelectAll={actions.selectAll}
        onDownloadSelected={actions.downloadSelected}
      />

      <GalleryGrid
        photos={photos}
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