'use client';
import React, { useState, useEffect } from 'react';
import { getClusters, Cluster } from '../../lib/api';
import { useEvents } from '../../components/EventContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { cropAndEncodeFace } from '../../utils/imageCrop';


const CLUSTER_ID_UNASSIGNED = -1;
const CLUSTER_ID_PROCESSING = -2;
const FACE_CYCLE_INTERVAL = 2000; // 2 seconds

interface CyclingFaceState {
  [clusterId: number]: number; // Current sample index for each cluster
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
  const [clustersCache, setClustersCache] = useState<{ [key: string]: { data: Cluster[], timestamp: number } }>({});

  const applyFaceFilter = (ids: number[] | null) => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (ids && ids.length > 0) {
        params.set('faceFilter', ids.join(','));
        setFaceFilter(ids);
      } else {
        params.delete('faceFilter');
        setFaceFilter(null);
      }
      const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
      window.history.replaceState({}, '', newUrl);
    } else {
      setFaceFilter(ids && ids.length > 0 ? ids : null);
    }
  };

  // Check for face filter from URL params
  useEffect(() => {
    const faceFilterParam = searchParams.get('faceFilter');
    if (faceFilterParam) {
      const clusterIds = faceFilterParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (clusterIds.length > 0) {
        setFaceFilter(clusterIds);
      }
    }
  }, [searchParams]);

  const loadClusters = async (forceRefresh = false) => {
    if (!eventCode) return;
    
    // Check cache first (5 minutes expiry)
    const cacheKey = `${eventCode}_5`;
    const cached = clustersCache[cacheKey];
    const now = Date.now();
    const cacheExpiry = 5 * 60 * 1000; // 5 minutes
    
    if (!forceRefresh && cached && (now - cached.timestamp) < cacheExpiry) {
      console.log('Using cached clusters data');
      setClusters(cached.data);
      return;
    }
    
    setLoading(true);
    try {
      console.log('Fetching fresh clusters data');
      const data = await getClusters(eventCode, 5); // Get 5 samples for cycling
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
      
      // Generate cropped faces for all samples (simplified approach for performance)
      const crops: { [key: string]: string } = {};
      let processedCount = 0;
      const maxProcessing = 20; // Limit to prevent page freezing
      
      for (const cluster of data) {
        if (processedCount >= maxProcessing) break;
        
        for (const sample of cluster.samples.slice(0, 2)) { // Only process first 2 samples per cluster
          if (processedCount >= maxProcessing) break;
          
          // For now, use a simple placeholder approach for better performance
          // In production, you'd want to implement efficient server-side cropping
          const placeholderColor = `hsl(${(sample.face_id * 137.5) % 360}, 70%, 80%)`;
          const svgPlaceholder = `data:image/svg+xml;base64,${btoa(`
            <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="55" fill="${placeholderColor}" stroke="#ddd" stroke-width="2"/>
              <text x="60" y="65" text-anchor="middle" fill="#fff" font-size="16" font-weight="bold">${cluster.cluster_id}</text>
            </svg>
          `)}`;
          crops[sample.face_id.toString()] = svgPlaceholder;
          processedCount++;
        }
      }
      setCroppedFaces(crops);
      
    } catch (error) {
      console.error('Failed to load clusters:', error);
      setClusters([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleClusterSelection = (clusterId: number) => {
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

  const browseSelectedPeople = () => {
    if (selectedClusters.size === 0) {
      alert('Please select people to browse');
      return;
    }
    
    // Navigate to gallery with face filter
    const clusterIds = Array.from(selectedClusters).join(',');
    router.push(`/gallery?faceFilter=${clusterIds}`);
  };

  const clearFaceFilter = () => {
    applyFaceFilter(null);
  };

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

  // Cycle through face samples every few seconds
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventCode]);

  if (!eventCode) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>No Event Selected</h2>
        <p>Please select an event from the dropdown menu to view people and search for faces.</p>
      </div>
    );
  }

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
        }}>People Recognition</h1>

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
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #667eea', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
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

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
              gap: '2rem' 
            }}>
              {clusters.filter(cluster => faceFilter === null || faceFilter.includes(cluster.cluster_id)).map((cluster) => {
                const isSelectable = cluster.cluster_id >= 0;
                const isSelected = selectedClusters.has(cluster.cluster_id);
                const currentSampleIndex = faceStates[cluster.cluster_id] || 0;
                const currentSample = cluster.samples[currentSampleIndex] || cluster.samples[0];
                
                // Use a colorful placeholder for better visual representation
                const placeholderColor = `hsl(${(cluster.cluster_id * 137.5) % 360}, 70%, 80%)`;
                const displayImage = croppedFaces[currentSample?.face_id?.toString()] || 
                  `data:image/svg+xml;base64,${btoa(`
                    <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="60" cy="60" r="55" fill="${placeholderColor}" stroke="#ddd" stroke-width="2"/>
                      <text x="60" y="65" text-anchor="middle" fill="#fff" font-size="16" font-weight="bold">${cluster.cluster_id}</text>
                    </svg>
                  `)}`;

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
                      <img
                        src={displayImage}
                        alt={`Person ${cluster.cluster_id}`}
                        style={{
                          width: '100px',
                          height: '100px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid #fff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}
                      />
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

