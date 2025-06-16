'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { getClusters, Cluster } from '../../api/clusters';
import { useEvents } from '../../features/events';
import { useRouter, useSearchParams } from 'next/navigation';

const CLUSTER_ID_UNASSIGNED = -1;
const CLUSTER_ID_PROCESSING = -2;
const FACE_CYCLE_INTERVAL = 2000; // 2 seconds
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const NUM_CLUSTER_SAMPLES = 5; // Number of samples to process per cluster

interface CyclingFaceState {
  [clusterId: number]: number; // Current sample index for each cluster
}

interface CacheEntry {
  data: Cluster[];
  timestamp: number;
}

export default function PeoplePage() {
  const { selected: eventCode } = useEvents();
  const router = useRouter();
  const searchParams = useSearchParams();
  
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
    const faceFilterParam = searchParams.get('faceFilter');
    if (faceFilterParam) {
      const clusterIds = faceFilterParam.split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
      if (clusterIds.length > 0) {
        setFaceFilter(clusterIds);
      }
    }
  }, [searchParams]);

  // Crop face with better error handling
  const cropFace = async (sample: any): Promise<string | null> => {
    const faceKey = sample.face_id.toString();
    
    if (cropError.has(faceKey)) {
      return null; // Don't retry failed crops
    }

    try {
      const params = new URLSearchParams({
        url: sample.sample_blob_url,
        x: String(sample.sample_bbox.x),
        y: String(sample.sample_bbox.y),
        width: String(sample.sample_bbox.width),
        height: String(sample.sample_bbox.height),
      });
      
      const res = await fetch(`/api/crop?${params.toString()}`);
      if (res.ok) {
        const base64 = await res.json();
        return base64;
      } else {
        console.warn(`Failed to crop face ${faceKey}: ${res.status}`);
        setCropError(prev => new Set([...prev, faceKey]));
        return null;
      }
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
    const now = Date.now();
    
    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_EXPIRY) {
      console.log('Using cached clusters data');
      setClusters(cached.data);
      return;
    }
    
    setLoading(true);
    try {
      console.log('Fetching fresh clusters data');
      const data = await getClusters(eventCode, NUM_CLUSTER_SAMPLES);
      setClusters(data);
      
      // Update cache
      setClustersCache(prev => ({
        ...prev,
        [cacheKey]: { data, timestamp: now }
      }));
      
      // Initialize face cycling states
      const initialStates: CyclingFaceState = {};
      data.forEach(cluster => {
        if (cluster.samples.length > 0) {
          initialStates[cluster.cluster_id] = 0;
        }
      });
      setFaceStates(initialStates);
      
      // Generate cropped faces for all samples
      const crops: { [key: string]: string } = {};
      
      for (const cluster of data) {
        // Process all samples for each cluster
        for (const sample of cluster.samples) {
          const croppedFace = await cropFace(sample);
          if (croppedFace) {
            crops[sample.face_id.toString()] = croppedFace;
          }
        }
      }
      setCroppedFaces(crops);
      
    } catch (error) {
      console.error('Failed to load clusters:', error);
      setClusters([]);
    } finally {
      setLoading(false);
    }
  }, [eventCode, clustersCache]);


  const toggleClusterSelection = useCallback((clusterId: number) => {
    setSelectedClusters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clusterId)) {
        newSet.delete(clusterId);
      } else {
        newSet.add(clusterId);
      }
      return newSet;
    });
  }, []);

  const browseSelectedPeople = useCallback(() => {
    if (selectedClusters.size === 0) {
      alert('Please select people to browse');
      return;
    }
    
    const clusterIds = Array.from(selectedClusters).join(',');
    console.log('Navigating to gallery with cluster IDs:', clusterIds);
    router.push(`/gallery?faceFilter=${clusterIds}`);
  }, [selectedClusters, router]);

  const clearFaceFilter = useCallback(() => {
    applyFaceFilter(null);
  }, [applyFaceFilter]);

  const getClusterTitle = (cluster: Cluster) => {
    if (cluster.cluster_id === CLUSTER_ID_UNASSIGNED) {
      return 'Unidentified Faces';
    }
    if (cluster.cluster_id === CLUSTER_ID_PROCESSING) {
      return 'Processing Faces';
    }
    return `Person ${cluster.cluster_id}`;
  };

  const getIdentifiedCount = () => {
    return clusters.filter(c => c.cluster_id >= 0).length;
  };

  const getProcessingCount = () => {
    const processingCluster = clusters.find(c => c.cluster_id === CLUSTER_ID_PROCESSING);
    return processingCluster ? processingCluster.face_count : 0;
  };

  // Cycle through face samples
  useEffect(() => {
    if (clusters.length === 0) return;

    const interval = setInterval(() => {
      setFaceStates(prev => {
        const newStates = { ...prev };
        clusters.forEach(cluster => {
          if (cluster.samples.length > 1) {
            const currentIndex = newStates[cluster.cluster_id] || 0;
            newStates[cluster.cluster_id] = (currentIndex + 1) % cluster.samples.length;
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

  if (!eventCode) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>No Event Selected</h2>
        <p>Please select an event from the dropdown menu to view people and search for faces.</p>
      </div>
    );
  }

  const filteredClusters = clusters.filter(cluster => 
    faceFilter === null || faceFilter.includes(cluster.cluster_id)
  );

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1400px', 
      margin: '0 auto',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh'
    }}>
      <div style={{ 
        background: '#fff', 
        borderRadius: '12px', 
        padding: '2rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '2rem',
          color: '#2c3e50',
          fontSize: '2.5rem'
        }}>
          People Recognition
        </h1>

        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <span style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem',
            marginRight: '1rem'
          }}>
            Event: {eventCode}
          </span>
          <span style={{ 
            background: '#28a745',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem',
            marginRight: '1rem'
          }}>
            {getIdentifiedCount()} Identified People
          </span>
          {getProcessingCount() > 0 && (
            <span style={{ 
              background: '#ffc107',
              color: '#000',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              fontSize: '0.9rem'
            }}>
              {getProcessingCount()} Processing
            </span>
          )}
        </div>

        {/* Controls */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          marginBottom: '2rem',
          padding: '1rem',
          background: '#f8f9fa',
          borderRadius: '8px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => loadClusters(true)}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem'
            }}
          >
            {loading ? 'Loading...' : 'Refresh People'}
          </button>

          {faceFilter !== null && (
            <div style={{
              background: '#e3f2fd',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <span style={{ color: '#1976d2', fontWeight: 'bold' }}>
                Filtering by People: {faceFilter.join(', ')}
              </span>
              <button
                onClick={clearFaceFilter}
                style={{
                  background: '#f44336',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Clear Filter
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ 
              display: 'inline-block', 
              width: '40px', 
              height: '40px', 
              border: '4px solid #f3f3f3', 
              borderTop: '4px solid #667eea', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite' 
            }}></div>
            <p style={{ marginTop: '1rem', color: '#666' }}>Analyzing faces...</p>
          </div>
        ) : clusters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '1.2rem', color: '#666' }}>
              No people clusters found. Upload some photos with faces to see them grouped here!
            </p>
          </div>
        ) : (
          <>
            {/* Selection Controls */}
            <div style={{ 
              marginBottom: '2rem',
              padding: '1rem',
              background: '#e3f2fd',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <span style={{ color: '#1976d2', fontWeight: 'bold' }}>
                {selectedClusters.size} of {getIdentifiedCount()} people selected
              </span>
              <button
                onClick={browseSelectedPeople}
                disabled={selectedClusters.size === 0}
                style={{
                  background: selectedClusters.size > 0 ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' : '#ccc',
                  color: '#fff',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '6px',
                  cursor: selectedClusters.size > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '1rem'
                }}
              >
                Browse Selected People ({selectedClusters.size})
              </button>
            </div>

            {/* People Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
              gap: '2rem' 
            }}>
              {filteredClusters.map((cluster) => {
                const isSelectable = cluster.cluster_id >= 0;
                const isSelected = selectedClusters.has(cluster.cluster_id);
                const currentSampleIndex = faceStates[cluster.cluster_id] || 0;
                const currentSample = cluster.samples[currentSampleIndex] || cluster.samples[0];
                
                // Only show cropped face if available, otherwise show nothing
                const displayImage = currentSample ? croppedFaces[currentSample.face_id?.toString()] : null;

                return (
                  <div
                    key={cluster.cluster_id}
                    style={{
                      border: isSelected ? '3px solid #007bff' : '1px solid #ddd',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      textAlign: 'center',
                      cursor: isSelectable ? 'pointer' : 'default',
                      transition: 'all 0.3s ease',
                      backgroundColor: isSelected ? '#f8f9ff' : '#fff',
                      boxShadow: isSelected ? '0 4px 12px rgba(0,123,255,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
                      transform: isSelected ? 'translateY(-2px)' : 'none'
                    }}
                    onClick={() => isSelectable && toggleClusterSelection(cluster.cluster_id)}
                  >
                    <div style={{ marginBottom: '1rem' }}>
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt={`Person ${cluster.cluster_id}`}
                          style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '3px solid #fff',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                          }}
                          onError={(e) => {
                            console.warn(`Failed to load image for cluster ${cluster.cluster_id}`);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            background: '#f0f0f0',
                            border: '3px solid #fff',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            fontSize: '0.8rem',
                            color: '#666'
                          }}
                        >
                          No Image
                        </div>
                      )}
                    </div>
                    
                    <h3 style={{ 
                      margin: '0 0 0.5rem 0', 
                      color: '#2c3e50',
                      fontSize: '1.2rem'
                    }}>
                      {getClusterTitle(cluster)}
                    </h3>
                    
                    <p style={{ 
                      margin: 0, 
                      color: '#666',
                      fontSize: '0.9rem'
                    }}>
                      {cluster.face_count} photo{cluster.face_count !== 1 ? 's' : ''}
                    </p>
                    
                    {cluster.samples.length > 1 && (
                      <div style={{
                        marginTop: '0.5rem',
                        fontSize: '0.8rem',
                        color: '#999'
                      }}>
                        {cluster.samples.length} samples
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}