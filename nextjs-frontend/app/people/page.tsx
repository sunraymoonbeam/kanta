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
    <div className="p-8 max-w-7xl mx-auto bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <div className="mb-8">
        <h1 className="text-center text-4xl font-bold text-gray-800 mb-4">
          People Recognition
        </h1>
        <p className="text-center text-gray-600 text-lg">
          AI-detected people from <strong>{eventCode}</strong>
        </p>
      </div>

      {clusters.length === 0 ? (
        <Card padding="lg" className="text-center">
          <div className="py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-gray-500 text-xl mb-4">No People Detected Yet</h2>
            <p className="text-gray-400 mb-8 text-lg">
              Upload some photos with people to see AI face recognition in action
            </p>
            <Button onClick={() => window.location.href = '/gallery/upload'} size="lg">
              Upload Photos
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Controls */}
          <Card className="mb-8" padding="lg">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-gray-700 font-semibold mb-2">
                  Found {clusters.length} people ({selectedClusters.size} selected)
                </h3>
                <p className="text-gray-600 text-sm">
                  Click on people to select them, then view their photos
                </p>
              </div>
              
              <div className="flex gap-3">
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
          </Card>

          {/* People Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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
                  className={`cursor-pointer transition-all duration-300 relative ${
                    isSelected 
                      ? 'border-2 border-indigo-500 bg-indigo-50' 
                      : 'border border-gray-200 bg-white hover:shadow-lg'
                  }`}
                  onClick={() => handleClusterClick(cluster.cluster_id)}
                >
                  <div className="text-center p-4">
                    {/* Face Display */}
                    <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center">
                      {croppedFace ? (
                        <img
                          src={croppedFace}
                          alt={`Person ${cluster.cluster_id}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-5xl text-gray-400">
                          👤
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <h3 className="text-gray-800 font-semibold text-lg mb-2">
                      Person {cluster.cluster_id}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-2">
                      {cluster.face_count} photo{cluster.face_count !== 1 ? 's' : ''}
                    </p>

                    {/* Sample indicator */}
                    {cluster.samples.length > 1 && (
                      <div className="flex justify-center gap-1 mt-2">
                        {cluster.samples.slice(0, NUM_CLUSTER_SAMPLES).map((_, index) => (
                          <div
                            key={index}
                            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                              index === currentSampleIndex ? 'bg-indigo-500' : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-4 right-4 bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
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
