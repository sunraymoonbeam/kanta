import React from 'react';
import { Image } from '../../../types/images';

interface ImageThumbnailProps {
  image: Image;
  isSelected?: boolean;
  onSelect?: (image: Image) => void;
  onClick?: (image: Image) => void;
  showFaceCount?: boolean;
}

export default function ImageThumbnail({
  image,
  isSelected = false,
  onSelect,
  onClick,
  showFaceCount = true
}: ImageThumbnailProps) {
  const handleClick = () => {
    if (onSelect) {
      onSelect(image);
    } else if (onClick) {
      onClick(image);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'relative',
        cursor: 'pointer',
        borderRadius: '12px',
        overflow: 'hidden',
        border: isSelected ? '3px solid #007AFF' : '2px solid transparent',
        transition: 'all 0.3s ease',
        background: '#f8f9fa'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: '#007AFF',
          color: 'white',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 2
        }}>
          ✓
        </div>
      )}

      {/* Image */}
      <img
        src={image.url}
        alt={`Image ${image.uuid}`}
        style={{
          width: '100%',
          height: '200px',
          objectFit: 'cover',
          display: 'block'
        }}
        loading="lazy"
      />

      {/* Image info overlay */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
        color: 'white',
        padding: '1rem 0.75rem 0.75rem',
        fontSize: '0.85rem'
      }}>
        {showFaceCount && image.faces !== undefined && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '0.25rem'
          }}>
            <span>👤</span>
            <span>{image.faces} face{image.faces !== 1 ? 's' : ''}</span>
          </div>
        )}
        <div style={{ 
          fontSize: '0.75rem', 
          opacity: 0.9 
        }}>
          {new Date(image.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
