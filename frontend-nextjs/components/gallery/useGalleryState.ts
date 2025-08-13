import { useState, useCallback } from 'react';

export interface PhotoData {
  id: number;
  url: string;
  faces?: Array<{
    id: number;
    url: string;
    confidence: number;
  }>;
}

export function useGalleryState(photos: PhotoData[]) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());

  const handlePhotoClick = useCallback((photo: PhotoData) => {
    if (isSelectionMode) {
      setSelectedPhotos(prev => {
        const newSet = new Set(prev);
        if (newSet.has(photo.id)) {
          newSet.delete(photo.id);
        } else {
          newSet.add(photo.id);
        }
        return newSet;
      });
    } else {
      setSelectedPhoto(photo);
      setIsModalOpen(true);
    }
  }, [isSelectionMode]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedPhoto(null);
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => !prev);
    if (isSelectionMode) {
      setSelectedPhotos(new Set());
    }
  }, [isSelectionMode]);

  const selectAll = useCallback(() => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map(p => p.id)));
    }
  }, [selectedPhotos.size, photos]);

  const downloadSelected = useCallback(() => {
    const selected = photos.filter(photo => selectedPhotos.has(photo.id));
    selected.forEach(photo => {
      const link = document.createElement('a');
      link.href = photo.url;
      link.download = `photo-${photo.id}.jpg`;
      link.click();
    });
  }, [photos, selectedPhotos]);

  return {
    selectedPhoto,
    isModalOpen,
    isSelectionMode,
    selectedPhotos,
    actions: {
      handlePhotoClick,
      handleCloseModal,
      toggleSelectionMode,
      selectAll,
      downloadSelected,
    }
  };
}