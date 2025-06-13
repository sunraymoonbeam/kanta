import React from 'react';
import Image from 'next/image';
import { Image as ImageType } from '../../types/images';

interface ImageGridProps {
  images: ImageType[];
  onImageClick: (image: ImageType) => void;
  selectedImages?: Set<string>;
  loading?: boolean;
  emptyMessage?: string;
  columns?: number;
}

export default function ImageGrid({
  images,
  onImageClick,
  selectedImages = new Set(),
  loading = false,
  emptyMessage = 'No images found.',
  columns = 4,
}: ImageGridProps) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-10 h-10 border-4 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
        <p className="mt-4 text-gray-600">Loading images...</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-xl text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4 py-4"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
    >
      {images.map((image) => (
        <div
          key={image.uuid}
          className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105 ${
            selectedImages.has(image.uuid) 
              ? 'border-2 border-indigo-500' 
              : 'border border-gray-300'
          }`}
          onClick={() => onImageClick(image)}
        >
          <Image
            src={image.azure_blob_url}
            alt={`Image ${image.uuid}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            unoptimized
          />
          
          {/* Face count indicator */}
          {image.faces > 0 && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white rounded-xl px-2 py-1 text-xs flex items-center gap-1">
              {image.faces} faces
            </div>
          )}

          {/* Selection indicator */}
          {selectedImages.has(image.uuid) && (
            <div className="absolute top-2 left-2 bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
              ✓
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
