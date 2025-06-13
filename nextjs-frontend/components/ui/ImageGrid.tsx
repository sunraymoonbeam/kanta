import React from 'react';
import { Image } from '../../types/images';

interface ImageGridProps {
  images: Image[];
  onImageClick: (image: Image) => void;
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
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div
          style={{
            display: 'inline-block',
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ marginTop: '1rem', color: '#666' }}>Loading images...</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ fontSize: '1.2rem', color: '#666' }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '1rem',
        padding: '1rem 0',
      }}
    >
      {images.map((image) => (
        <div
          key={image.uuid}
          style={{
            position: 'relative',
            aspectRatio: '1',
            borderRadius: '8px',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            border: selectedImages.has(image.uuid) ? '3px solid #667eea' : '1px solid #ddd',
          }}
          onClick={() => onImageClick(image)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <img
            src={image.azure_blob_url}
            alt={`Image ${image.uuid}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            loading="lazy"
          />
          
          {/* Face count indicator */}
          {image.faces > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(0, 0, 0, 0.7)',
                color: '#fff',
                borderRadius: '12px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              👥 {image.faces}
            </div>
          )}

          {/* Selection indicator */}
          {selectedImages.has(image.uuid) && (
            <div
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                background: '#667eea',
                color: '#fff',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
              }}
            >
              ✓
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
