import React, { useState, useEffect } from 'react';
import { Cluster, SampleFace } from '../../../types/people';
import Card from '../../ui/Card';
import { FACE_CYCLE_INTERVAL } from '../../../lib/constants';

interface PersonClusterCardProps {
  cluster: Cluster;
  isSelected?: boolean;
  onSelect?: (cluster: Cluster) => void;
  onClick?: (cluster: Cluster) => void;
}

export default function PersonClusterCard({
  cluster,
  isSelected = false,
  onSelect,
  onClick
}: PersonClusterCardProps) {
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);

  // Cycle through faces
  useEffect(() => {
    if (!cluster.samples || cluster.samples.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentFaceIndex(prev => (prev + 1) % cluster.samples.length);
    }, FACE_CYCLE_INTERVAL);

    return () => clearInterval(interval);
  }, [cluster.samples]);

  const handleClick = () => {
    if (onSelect) {
      onSelect(cluster);
    } else if (onClick) {
      onClick(cluster);
    }
  };

  const currentFace = cluster.samples?.[currentFaceIndex];

  return (
    <Card
      hoverable
      style={{
        cursor: 'pointer',
        border: isSelected ? '3px solid #007AFF' : '2px solid transparent',
        background: isSelected ? '#f0f8ff' : 'white',
        transition: 'all 0.3s ease'
      }}
      onClick={handleClick}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        textAlign: 'center'
      }}>
        {/* Face Image */}
        <div style={{
          position: 'relative',
          width: '120px',
          height: '120px'
        }}>
          {currentFace?.sample_blob_url ? (
            <img
              src={currentFace.sample_blob_url}
              alt={`Person ${cluster.cluster_id}`}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid #f0f0f0',
                transition: 'opacity 0.5s ease'
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '2rem',
              fontWeight: 'bold'
            }}>
              👤
            </div>
          )}

          {/* Face cycle indicator */}
          {cluster.samples && cluster.samples.length > 1 && (
            <div style={{
              position: 'absolute',
              bottom: '5px',
              right: '5px',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              borderRadius: '12px',
              padding: '2px 6px',
              fontSize: '0.7rem',
              fontWeight: 'bold'
            }}>
              {currentFaceIndex + 1}/{cluster.samples.length}
            </div>
          )}
        </div>

        {/* Cluster Info */}
        <div style={{ width: '100%' }}>
          <h3 style={{
            margin: 0,
            fontSize: '1.1rem',
            color: '#1a1a1a',
            fontWeight: 'bold'
          }}>
            Person {cluster.cluster_id}
          </h3>
          
          <div style={{
            marginTop: '0.5rem',
            padding: '0.5rem',
            background: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '0.9rem',
            color: '#666'
          }}>
            <div>{cluster.face_count} photo{cluster.face_count !== 1 ? 's' : ''}</div>
            {cluster.samples && (
              <div style={{ marginTop: '0.25rem' }}>
                {cluster.samples.length} sample{cluster.samples.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: '#007AFF',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ✓
          </div>
        )}
      </div>
    </Card>
  );
}
