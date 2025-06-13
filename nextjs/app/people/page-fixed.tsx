'use client';
import { useState, useEffect } from 'react';
import { getClusters, findSimilarFaces, Cluster, Image } from '../../lib/api';
import { useEvents } from '../../components/EventContext';
import { useRouter } from 'next/navigation';

const CLUSTER_ID_UNASSIGNED = -1;
const CLUSTER_ID_PROCESSING = -2;

export default function PeoplePage() {
  const { selected: eventCode } = useEvents();
  const router = useRouter();
  const [tab, setTab] = useState<'people' | 'search'>('people');
  const [sampleSize, setSampleSize] = useState(3);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedClusters, setSelectedClusters] = useState<Set<number>>(new Set());
  const [queryFile, setQueryFile] = useState<File>();
  const [results, setResults] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const loadClusters = async () => {
    if (!eventCode) return;
    
    setLoading(true);
    try {
      const data = await getClusters(eventCode, sampleSize);
      setClusters(data);
    } catch (error) {
      console.error('Failed to load clusters:', error);
      setClusters([]);
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async () => {
    if (!eventCode || !queryFile) return;
    
    setSearchLoading(true);
    try {
      const data = await findSimilarFaces(eventCode, queryFile, 'cosine', 10);
      setResults(data);
    } catch (error) {
      console.error('Failed to search for similar faces:', error);
      setResults([]);
    } finally {
      setSearchLoading(false);
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

  const getClusterTitle = (cluster: Cluster) => {
    if (cluster.cluster_id === CLUSTER_ID_UNASSIGNED) {
      return '❓ Unidentified Faces';
    }
    if (cluster.cluster_id === CLUSTER_ID_PROCESSING) {
      return '⏳ Processing Faces';
    }
    return `👤 Person ${cluster.cluster_id}`;
  };

  const getClusterDescription = (cluster: Cluster) => {
    if (cluster.cluster_id === CLUSTER_ID_UNASSIGNED) {
      return 'Faces that could not be grouped with others';
    }
    if (cluster.cluster_id === CLUSTER_ID_PROCESSING) {
      return 'Faces currently being analyzed';
    }
    return `${cluster.face_count} face${cluster.face_count !== 1 ? 's' : ''} grouped together`;
  };

  useEffect(() => {
    if (tab === 'people' && eventCode) {
      loadClusters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventCode, tab, sampleSize]);

  if (!eventCode) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>⚠️ No Event Selected</h2>
        <p>Please select an event from the dropdown menu to view people and search for faces.</p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1200px', 
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
        }}>👥 People & Face Recognition</h1>

        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <span style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem'
          }}>
            Event: {eventCode}
          </span>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          borderBottom: '2px solid #eee',
          paddingBottom: '1rem'
        }}>
          {[
            { key: 'people', label: '👥 Identified People' },
            { key: 'search', label: '🔍 Face Search' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              style={{
                background: tab === key 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : '#f8f9fa',
                color: tab === key ? '#fff' : '#333',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: tab === key ? 'bold' : 'normal',
                transition: 'all 0.3s ease'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* People Clusters Tab */}
        {tab === 'people' && (
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              marginBottom: '2rem',
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <label style={{ fontWeight: 'bold' }}>
                Sample photos per person:
              </label>
              <select
                value={sampleSize}
                onChange={(e) => setSampleSize(parseInt(e.target.value))}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value={1}>1 photo</option>
                <option value={3}>3 photos</option>
                <option value={5}>5 photos</option>
              </select>
              <button
                onClick={loadClusters}
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '⏳ Loading...' : '🔄 Refresh'}
              </button>
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
                    {selectedClusters.size} of {clusters.filter(c => c.cluster_id >= 0).length} people selected
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
                    🖼️ Browse Selected People ({selectedClusters.size})
                  </button>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                  gap: '2rem' 
                }}>
                  {clusters.map((cluster) => {
                    const isSelectable = cluster.cluster_id >= 0;
                    const isSelected = selectedClusters.has(cluster.cluster_id);

                    return (
                      <div
                        key={cluster.cluster_id}
                        style={{
                          background: '#fff',
                          border: isSelected ? '2px solid #667eea' : '1px solid #ddd',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          boxShadow: isSelected ? '0 8px 25px rgba(102, 126, 234, 0.15)' : '0 4px 15px rgba(0,0,0,0.1)',
                          cursor: isSelectable ? 'pointer' : 'default',
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => isSelectable && toggleClusterSelection(cluster.cluster_id)}
                      >
                        {/* Selection Checkbox for valid clusters */}
                        {isSelectable && (
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '1rem'
                          }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleClusterSelection(cluster.cluster_id)}
                              style={{ transform: 'scale(1.2)' }}
                            />
                          </div>
                        )}

                        <h3 style={{ 
                          margin: '0 0 1rem 0', 
                          color: '#2c3e50',
                          textAlign: 'center'
                        }}>
                          {getClusterTitle(cluster)}
                        </h3>
                        
                        <p style={{ 
                          textAlign: 'center', 
                          color: '#666', 
                          marginBottom: '1rem',
                          fontSize: '0.9rem'
                        }}>
                          {getClusterDescription(cluster)}
                        </p>
                        
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: `repeat(${Math.min(cluster.samples.length, 3)}, 1fr)`, 
                          gap: '0.5rem' 
                        }}>
                          {cluster.samples.map((sample, imgIndex) => (
                            <div key={sample.face_id} style={{ textAlign: 'center' }}>
                              <img
                                src={sample.sample_blob_url}
                                alt={`${getClusterTitle(cluster)} - ${imgIndex + 1}`}
                                style={{
                                  width: '100%',
                                  height: '120px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  border: '2px solid #eee'
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Face Search Tab */}
        {tab === 'search' && (
          <div>
            <div style={{ 
              marginBottom: '2rem',
              padding: '1.5rem',
              background: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>
                🔍 Find Similar Faces
              </h3>
              <p style={{ marginBottom: '1.5rem', color: '#666' }}>
                Upload a photo to find similar faces in the event photos.
              </p>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Upload a photo to search for:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setQueryFile(e.target.files?.[0])}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px dashed #ddd',
                    borderRadius: '8px',
                    background: '#fff'
                  }}
                />
              </div>
              
              <button
                onClick={runSearch}
                disabled={!queryFile || searchLoading}
                style={{
                  background: (!queryFile || searchLoading) 
                    ? '#ccc' 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: (!queryFile || searchLoading) ? 'not-allowed' : 'pointer'
                }}
              >
                {searchLoading ? '⏳ Searching...' : '🔍 Find Similar Faces'}
              </button>
            </div>

            {/* Search Results */}
            {results.length > 0 && (
              <div>
                <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>
                  Search Results ({results.length} matches found)
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                  gap: '1rem' 
                }}>
                  {results.map((image, index) => (
                    <div
                      key={image.uuid}
                      style={{
                        background: '#fff',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <img
                        src={image.azure_blob_url}
                        alt={`Match ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{ padding: '1rem' }}>
                        <p style={{ margin: '0', fontSize: '0.8rem', color: '#666' }}>
                          📅 {new Date(image.created_at).toLocaleDateString()}
                        </p>
                        {image.faces && image.faces > 0 && (
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#888' }}>
                            👥 {image.faces} face{image.faces !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchLoading && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #667eea', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ marginTop: '1rem', color: '#666' }}>Searching for similar faces...</p>
              </div>
            )}
          </div>
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
