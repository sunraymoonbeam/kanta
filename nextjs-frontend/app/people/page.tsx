'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { getClusters } from '../../lib/api';
import { useEvents } from '../../hooks/useEvents';
import { Cluster, CyclingFaceState, CacheEntry } from '../../types/people';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { cropFaceImage } from '../../lib/imageCrop';
import { 
  CLUSTER_ID_UNASSIGNED, 
  CLUSTER_ID_PROCESSING, 
  FACE_CYCLE_INTERVAL, 
  CACHE_EXPIRY, 
  NUM_CLUSTER_SAMPLES 
} from '../../lib/constants';

export default function PeoplePage() {
  const { selected: eventCode } = useEvents();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedClusters, setSelectedClusters] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [faceStates, setFaceStates] = useState<CyclingFaceState>({});
  const [faceFilter, setFaceFilter] = useState<number[] | null>(null);
  const [croppedFaces, setCroppedFaces] = useState<{ [key: string]: string }>({});
  const [clustersCache, setClustersCache] = useState<{ [key: string]: CacheEntry }>({});
  const [cropError, setCropError] = useState<Set<string>>(new Set());

  // Memoized function to apply face filter
  const applyFaceFilter = useCallback((ids: number[] | null) => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (ids && ids.length > 0) {
        params.set('faceFilter', ids.join(','));
      } else {
        params.delete('faceFilter');
      }
      const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
      window.history.replaceState({}, '', newUrl);
    }
    setFaceFilter(ids && ids.length > 0 ? ids : null);
  }, []);

  // Check for face filter from URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const faceFilterParam = params.get('faceFilter');
      if (faceFilterParam) {
        const clusterIds = faceFilterParam.split(',')
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id));
        if (clusterIds.length > 0) {
          setFaceFilter(clusterIds);
        }
      }
    }
  }, []);

  // Crop face with better error handling
  const cropFace = async (sample: any): Promise<string | null> => {
    const faceKey = sample.face_id.toString();
    
    if (cropError.has(faceKey)) {
      return null; // Don't retry failed crops
    }

    try {
      const croppedImage = await cropFaceImage(sample.sample_blob_url, sample.sample_bbox);
      return croppedImage;
    } catch (error) {
      console.error('Error cropping face:', error);
      setCropError(prev => new Set([...prev, faceKey]));
      return null;
    }
  };

  const loadClusters = useCallback(async (forceRefresh = false) => {
    if (!eventCode) return;
    
    // Check cache first
    const cacheKey = `${eventCode}_${NUM_CLUSTER_SAMPLES}`;
    const cached = clustersCache[cacheKey];
    
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      setClusters(cached.data);
      return;
    }
    
    setLoading(true);
    try {
      const data = await getClusters(eventCode, NUM_CLUSTER_SAMPLES);
      
      // Filter out special clusters and sort by face count
      const validClusters = data
        .filter(cluster => 
          cluster.cluster_id !== CLUSTER_ID_UNASSIGNED && 
          cluster.cluster_id !== CLUSTER_ID_PROCESSING
        )
        .sort((a, b) => b.face_count - a.face_count);
      
      setClusters(validClusters);
      
      // Update cache
      setClustersCache(prev => ({
        ...prev,
        [cacheKey]: {
          data: validClusters,
          timestamp: Date.now()
        }
      }));
      
      // Initialize face cycling states
      const initialStates: CyclingFaceState = {};
      validClusters.forEach(cluster => {
        if (cluster.samples.length > 0) {
          initialStates[cluster.cluster_id] = 0;
        }
      });
      setFaceStates(initialStates);
      
      // Preload cropped faces for visible samples
      const cropPromises: Promise<void>[] = [];
      validClusters.forEach(cluster => {
        if (cluster.samples.length > 0) {
          const sample = cluster.samples[0];
          cropPromises.push(
            cropFace(sample).then(result => {
              if (result) {
                setCroppedFaces(prev => ({
                  ...prev,
                  [`${cluster.cluster_id}_${sample.face_id}`]: result
                }));
              }
            })
          );
        }
      });
      
      // Wait for initial crops to complete
      await Promise.allSettled(cropPromises);
      
    } catch (error) {
      console.error('Failed to load clusters:', error);
    } finally {
      setLoading(false);
    }
  }, [eventCode, clustersCache]);

  // Cycle through face samples
  useEffect(() => {
    if (clusters.length === 0) return;

    const interval = setInterval(() => {
      setFaceStates(prevStates => {
        const newStates = { ...prevStates };
        
        clusters.forEach(cluster => {
          if (cluster.samples.length > 1) {
            const currentIndex = newStates[cluster.cluster_id] || 0;
            const nextIndex = (currentIndex + 1) % Math.min(cluster.samples.length, NUM_CLUSTER_SAMPLES);
            newStates[cluster.cluster_id] = nextIndex;
            
            // Preload next face crop
            const nextSample = cluster.samples[nextIndex];
            cropFace(nextSample).then(result => {
              if (result) {
                setCroppedFaces(prev => ({
                  ...prev,
                  [`${cluster.cluster_id}_${nextSample.face_id}`]: result
                }));
              }
            });
          }
        });
        
        return newStates;
      });
    }, FACE_CYCLE_INTERVAL);

    return () => clearInterval(interval);
  }, [clusters]);

  useEffect(() => {
    loadClusters();
  }, [loadClusters]);

  const handleClusterClick = (clusterId: number) => {
    setSelectedClusters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clusterId)) {
        newSet.delete(clusterId);
      } else {
        newSet.add(clusterId);
      }
      return newSet;
    });
  };

  const handleViewPhotos = () => {
    if (selectedClusters.size === 0) return;
    
    const clusterIds = Array.from(selectedClusters);
    applyFaceFilter(clusterIds);
    
    // Navigate to gallery with face filter
    const params = new URLSearchParams();
    params.set('faceFilter', clusterIds.join(','));
    window.location.href = `/gallery?${params.toString()}`;
  };

  const handleSelectAll = () => {
    if (selectedClusters.size === clusters.length) {
      setSelectedClusters(new Set());
    } else {
      setSelectedClusters(new Set(clusters.map(c => c.cluster_id)));
    }
  };

  if (!eventCode) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Card padding="lg">
          <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>No Event Selected</h2>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Please select an event from the header dropdown to view people.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading people..." />;
  }

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1400px', 
      margin: '0 auto',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh'
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '1rem',
          color: '#2c3e50',
          fontSize: '2.5rem'
        }}>
          👥 People Recognition
        </h1>
        <p style={{ 
          textAlign: 'center', 
          color: '#666', 
          fontSize: '1.1rem' 
        }}>
          AI-detected people from <strong>{eventCode}</strong>
        </p>
      </div>

      {clusters.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <div style={{ padding: '3rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🤖</div>
            <h2 style={{ color: '#6b7280', marginBottom: '1rem' }}>No People Detected Yet</h2>
            <p style={{ color: '#9ca3af', marginBottom: '2rem', fontSize: '1.1rem' }}>
              Upload some photos with people to see AI face recognition in action
            </p>
            <Button onClick={() => window.location.href = '/gallery/upload'} size="lg">
              📸 Upload Photos
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Controls */}
          <Card style={{ marginBottom: '2rem' }} padding="lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>
                  Found {clusters.length} people ({selectedClusters.size} selected)
                </h3>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
                  Click on people to select them, then view their photos
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Button
                  onClick={handleSelectAll}
                  variant="secondary"
                  size="sm"
                >
                  {selectedClusters.size === clusters.length ? '❌ Deselect All' : '☑️ Select All'}
                </Button>
                
                <Button
                  onClick={() => loadClusters(true)}
                  variant="secondary"
                  size="sm"
                >
                  🔄 Refresh
                </Button>
                
                {selectedClusters.size > 0 && (
                  <Button
                    onClick={handleViewPhotos}
                    variant="primary"
                  >
                    🖼️ View Photos ({selectedClusters.size} people)
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* People Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {clusters.map((cluster) => {
              const currentSampleIndex = faceStates[cluster.cluster_id] || 0;
              const currentSample = cluster.samples[currentSampleIndex];
              const isSelected = selectedClusters.has(cluster.cluster_id);
              const faceKey = `${cluster.cluster_id}_${currentSample?.face_id}`;
              const croppedFace = croppedFaces[faceKey];

              return (
                <Card
                  key={cluster.cluster_id}
                  hoverable
                  style={{
                    cursor: 'pointer',
                    border: isSelected ? '3px solid #667eea' : '1px solid #e5e7eb',
                    background: isSelected ? '#f8faff' : '#fff',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => handleClusterClick(cluster.cluster_id)}
                >
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    {/* Face Display */}
                    <div style={{ 
                      width: '120px', 
                      height: '120px', 
                      margin: '0 auto 1rem',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '3px solid #e5e7eb',
                      background: '#f9fafb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {croppedFace ? (
                        <img
                          src={croppedFace}
                          alt={`Person ${cluster.cluster_id}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          fontSize: '3rem',
                          color: '#9ca3af'
                        }}>
                          👤
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <h3 style={{ 
                      margin: '0 0 0.5rem 0', 
                      color: '#1f2937',
                      fontSize: '1.1rem'
                    }}>
                      Person {cluster.cluster_id}
                    </h3>
                    
                    <p style={{ 
                      margin: '0 0 0.5rem 0', 
                      color: '#6b7280',
                      fontSize: '0.9rem'
                    }}>
                      {cluster.face_count} photo{cluster.face_count !== 1 ? 's' : ''}
                    </p>

                    {/* Sample indicator */}
                    {cluster.samples.length > 1 && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        gap: '4px',
                        marginTop: '0.5rem'
                      }}>
                        {cluster.samples.slice(0, NUM_CLUSTER_SAMPLES).map((_, index) => (
                          <div
                            key={index}
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: index === currentSampleIndex ? '#667eea' : '#d1d5db',
                              transition: 'background 0.3s ease'
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Selection indicator */}
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: '#667eea',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem'
                      }}>
                        ✓
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
