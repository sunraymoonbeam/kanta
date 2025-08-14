import React, { memo } from 'react';
import { Check, Square } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { PhotoData } from './useGalleryState';

interface GalleryGridProps {
  photos: PhotoData[];
  selectedPhotos: Set<number>;
  isSelectionMode: boolean;
  onPhotoClick: (photo: PhotoData) => void;
}

export const GalleryGrid = memo(function GalleryGrid({
  photos,
  selectedPhotos,
  isSelectionMode,
  onPhotoClick,
}: GalleryGridProps) {
  return (
    <div className="flex-1 overflow-y-auto p-2">
      <div className="grid grid-cols-3 gap-1">
        {photos.map(photo => (
          <PhotoTile
            key={photo.id}
            photo={photo}
            isSelected={selectedPhotos.has(photo.id)}
            isSelectionMode={isSelectionMode}
            onClick={() => onPhotoClick(photo)}
          />
        ))}
      </div>
    </div>
  );
});

interface PhotoTileProps {
  photo: PhotoData;
  isSelected: boolean;
  isSelectionMode: boolean;
  onClick: () => void;
}

const PhotoTile = memo(function PhotoTile({
  photo,
  isSelected,
  isSelectionMode,
  onClick,
}: PhotoTileProps) {
  return (
    <div
      className="aspect-square relative group cursor-pointer"
      onClick={onClick}
    >
      <ImageWithFallback
        src={photo.url}
        alt={`Photo ${photo.id}`}
        className={`w-full h-full object-cover rounded-lg transition-all duration-200 group-active:scale-95 ${
          isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
        }`}
      />
      
      {isSelectionMode && (
        <SelectionCheckbox isSelected={isSelected} />
      )}
      
      <SelectionOverlay isSelected={isSelected} isSelectionMode={isSelectionMode} />
    </div>
  );
});

interface SelectionCheckboxProps {
  isSelected: boolean;
}

function SelectionCheckbox({ isSelected }: SelectionCheckboxProps) {
  return (
    <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-10">
      <div
        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected
            ? 'bg-primary border-primary text-white'
            : 'bg-white/80 border-white backdrop-blur-sm'
        }`}
      >
        {isSelected ? (
          <Check className="w-3 h-3" />
        ) : (
          <Square className="w-3 h-3 opacity-0" />
        )}
      </div>
    </div>
  );
}

interface SelectionOverlayProps {
  isSelected: boolean;
  isSelectionMode: boolean;
}

function SelectionOverlay({ isSelected, isSelectionMode }: SelectionOverlayProps) {
  return (
    <div
      className={`absolute inset-0 rounded-lg transition-all duration-200 ${
        isSelectionMode
          ? isSelected
            ? 'bg-primary/20'
            : 'bg-black/0 group-active:bg-black/10'
          : 'bg-black/0 group-active:bg-black/20'
      }`}
    />
  );
}