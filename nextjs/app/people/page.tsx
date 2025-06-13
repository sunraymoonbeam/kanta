'use client';
import { useState, useEffect } from 'react';
import { getClusters, findSimilarFaces, Cluster, Image } from '../../lib/api';
import { useEvents } from '../../components/EventContext';

export default function PeoplePage() {
  const { selected: eventCode } = useEvents();
  const [tab, setTab] = useState<'people' | 'search'>('people');
  const [sampleSize, setSampleSize] = useState(3);
  const [clusters, setClusters] = useState<Cluster[]>([]);
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

  useEffect(() => {
    if (tab === 'people' && eventCode) {
      loadClusters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventCode, tab]);

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
                <div className="spinner"></div>
                <p style={{ marginTop: '1rem', color: '#666' }}>Analyzing faces...</p>
              </div>
            ) : clusters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ fontSize: '1.2rem', color: '#666' }}>
                  No people clusters found. Upload some photos with faces to see them grouped here!
                </p>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '2rem' 
              }}>
                {clusters.map((cluster, index) => (
                  <div
                    key={cluster.cluster_id}
                    style={{
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                    }}
                  >
                    <h3 style={{ 
                      margin: '0 0 1rem 0', 
                      color: '#2c3e50',
                      textAlign: 'center'
                    }}>
                      Person #{cluster.cluster_id}
                    </h3>
                    <p style={{ 
                      textAlign: 'center', 
                      color: '#666', 
                      marginBottom: '1rem',
                      fontSize: '0.9rem'
                    }}>
                      Found in {cluster.face_count} photo{cluster.face_count !== 1 ? 's' : ''}
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
                            alt={`Person ${cluster.cluster_id} - ${imgIndex + 1}`}
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
                ))}
              </div>
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
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                          {image.filename || `Image.${image.file_extension}`}
                        </h4>
                        <p style={{ margin: '0', fontSize: '0.8rem', color: '#666' }}>
                          📅 {new Date(image.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchLoading && (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '1rem', color: '#666' }}>Searching for similar faces...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
