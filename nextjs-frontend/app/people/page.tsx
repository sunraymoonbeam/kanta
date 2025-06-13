'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
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
  const [unidentifiedCount, setUnidentifiedCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);

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
      
      // Count special clusters
      const unidentified = data.find(cluster => cluster.cluster_id === CLUSTER_ID_UNASSIGNED);
      const processing = data.find(cluster => cluster.cluster_id === CLUSTER_ID_PROCESSING);
      
      setUnidentifiedCount(unidentified?.face_count || 0);
      setProcessingCount(processing?.face_count || 0);
      
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
      <div className="p-8 text-center">
        <Card padding="lg">
          <h2 className="text-red-500 text-xl font-semibold mb-4">No Event Selected</h2>
          <p className="text-gray-600 text-lg">
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
      minHeight: '100vh',
      background: '#ffffff',
      padding: '2rem'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto'
      }}>
        <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <h1 style={{ 
            marginBottom: '0.5rem',
            color: '#262626',
            fontSize: '2rem',
            fontWeight: 'bold',
            letterSpacing: '-0.02em'
          }}>
            People
          </h1>
          <p style={{ 
            color: '#8e8e8e', 
            fontSize: '1rem',
            margin: 0
          }}>
            AI-detected people from <strong>{eventCode}</strong>
          </p>
          
          {/* Special info */}
          {(unidentifiedCount > 0 || processingCount > 0) && (
            <div style={{ 
              marginTop: '1rem', 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '1rem', 
              fontSize: '0.875rem',
              flexWrap: 'wrap'
            }}>
              {unidentifiedCount > 0 && (
                <div style={{ 
                  background: '#fef3c7', 
                  color: '#d97706', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '20px',
                  border: '1px solid #f59e0b'
                }}>
                  {unidentifiedCount} unidentified faces
                </div>
              )}
              {processingCount > 0 && (
                <div style={{ 
                  background: '#dbeafe', 
                  color: '#2563eb', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '20px',
                  border: '1px solid #3b82f6'
                }}>
                  {processingCount} processing faces
                </div>
              )}
            </div>
          )}
        </div>

        {clusters.length === 0 ? (
        <div style={{ 
          textAlign: 'center',
          padding: '4rem 2rem',
          background: '#ffffff',
          border: '1px solid #dbdbdb',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', color: '#8e8e8e' }}>👤</div>
          <h2 style={{ color: '#262626', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>No People Detected Yet</h2>
          <p style={{ color: '#8e8e8e', marginBottom: '2rem', fontSize: '1rem' }}>
            Upload some photos with people to see AI face recognition in action
          </p>
          <Button onClick={() => window.location.href = '/gallery/upload'} size="lg">
            Upload Photos
          </Button>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div style={{
            marginBottom: '2rem',
            background: '#ffffff',
            border: '1px solid #dbdbdb',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '1rem'
            }}>
              <div>
                <h3 style={{ 
                  color: '#262626', 
                  fontWeight: 'bold', 
                  marginBottom: '0.5rem',
                  fontSize: '1.125rem'
                }}>
                  Found {clusters.length} people ({selectedClusters.size} selected)
                </h3>
                <p style={{ 
                  color: '#8e8e8e', 
                  fontSize: '0.875rem',
                  margin: 0
                }}>
                  Click on people to select them, then view their photos
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Button
                  onClick={handleSelectAll}
                  variant="secondary"
                  size="sm"
                >
                  {selectedClusters.size === clusters.length ? 'Deselect All' : 'Select All'}
                </Button>
                
                <Button
                  onClick={() => loadClusters(true)}
                  variant="secondary"
                  size="sm"
                >
                  Refresh
                </Button>
                
                {selectedClusters.size > 0 && (
                  <Button
                    onClick={handleViewPhotos}
                    variant="primary"
                  >
                    View Photos ({selectedClusters.size} people)
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* People Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '1rem'
          }}>
            {clusters.map((cluster) => {
              const currentSampleIndex = faceStates[cluster.cluster_id] || 0;
              const currentSample = cluster.samples[currentSampleIndex];
              const isSelected = selectedClusters.has(cluster.cluster_id);
              const faceKey = `${cluster.cluster_id}_${currentSample?.face_id}`;
              const croppedFace = croppedFaces[faceKey];

              return (
                <div
                  key={cluster.cluster_id}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    background: '#ffffff',
                    border: isSelected 
                      ? '2px solid #262626' 
                      : '1px solid #dbdbdb',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center',
                    boxShadow: isSelected 
                      ? '0 2px 8px rgba(0,0,0,0.15)' 
                      : '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                  onClick={() => handleClusterClick(cluster.cluster_id)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    }
                  }}
                >
                  <div>
                    {/* Face Display */}
                    <div style={{ 
                      width: '8rem', 
                      height: '8rem', 
                      margin: '0 auto 1rem auto', 
                      borderRadius: '50%', 
                      overflow: 'hidden', 
                      border: '2px solid #dbdbdb', 
                      background: '#fafafa', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center'
                    }}>
                      {croppedFace ? (
                        <Image
                          src={croppedFace}
                          alt={`Person ${cluster.cluster_id}`}
                          width={128}
                          height={128}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          unoptimized
                        />
                      ) : (
                        <div style={{ fontSize: '3rem', color: '#8e8e8e' }}>
                          👤
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <h3 style={{ 
                      color: '#262626', 
                      fontWeight: 'bold', 
                      fontSize: '1rem', 
                      marginBottom: '0.5rem'
                    }}>
                      Person {cluster.cluster_id}
                    </h3>
                    
                    <p style={{ 
                      color: '#8e8e8e', 
                      fontSize: '0.875rem', 
                      marginBottom: '0.5rem'
                    }}>
                      {cluster.face_count} photo{cluster.face_count !== 1 ? 's' : ''}
                    </p>

                    {/* Sample indicator */}
                    {cluster.samples.length > 1 && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        gap: '0.25rem', 
                        marginTop: '0.5rem'
                      }}>
                        {cluster.samples.slice(0, NUM_CLUSTER_SAMPLES).map((_, index) => (
                          <div
                            key={index}
                            style={{
                              width: '0.375rem',
                              height: '0.375rem',
                              borderRadius: '50%',
                              transition: 'background-color 0.3s',
                              background: index === currentSampleIndex ? '#262626' : '#dbdbdb'
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
                        background: '#262626', 
                        color: '#ffffff', 
                        borderRadius: '50%',
                        width: '1.5rem',
                        height: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem'
                      }}>
                        ✓
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
