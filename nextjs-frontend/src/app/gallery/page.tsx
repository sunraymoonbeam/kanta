'use client';
import React, { useState, useEffect } from 'react';
import { getImages, getImageDetail, deleteImage, Image, ImagesParams, ImageDetail } from '../../api/images';
import { useEvents } from '../../features/events';

// Modal component
function Modal({ isOpen, onClose, title, children }: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode; 
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '90vw',
        maxHeight: '90vh',
        width: '800px',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
              padding: '0.5rem',
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function GalleryPage() {
  const { selected } = useEvents();
  const [images, setImages] = useState<Image[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [imageDetail, setImageDetail] = useState<ImageDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [croppedFaces, setCroppedFaces] = useState<{ [key: string]: string }>({});
  const [faceFilter, setFaceFilter] = useState<number[] | null>(null);

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
  
  // Initialize search params on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      
      // Check for face filter from URL params
      const faceFilterParam = params.get('faceFilter');
      if (faceFilterParam) {
        const clusterIds = faceFilterParam
          .split(',')
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id));
        if (clusterIds.length > 0) {
          setFaceFilter(clusterIds);
        }
      }
    }
  }, []);
  
  // Filter states
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minFaces: '',
    maxFaces: '',
    limit: 50,
    offset: 0
  });

  const fetchImages = async () => {
    if (!selected) return;
    
    setLoading(true);
    setError('');
    
    try {
      const params: ImagesParams = {
        event_code: selected,
        limit: filters.limit,
        offset: filters.offset,
      };
      
      if (filters.startDate) params.date_from = filters.startDate;
      if (filters.endDate) params.date_to = filters.endDate;
      if (filters.minFaces) params.min_faces = parseInt(filters.minFaces);
      if (filters.maxFaces) params.max_faces = parseInt(filters.maxFaces);
      if (faceFilter && faceFilter.length > 0) {
        params.cluster_list_id = faceFilter;
      }
      
      const response = await getImages(params);
      setImages(response.images);
      setTotalCount(response.total_count);
    } catch (err) {
      console.error('Failed to fetch images:', err);
      setError('Failed to load images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [selected, filters, faceFilter]);

  const handleImageClick = async (image: Image) => {
    if (selectMode) {
      const newSelected = new Set(selectedImages);
      if (newSelected.has(image.uuid)) {
        newSelected.delete(image.uuid);
      } else {
        newSelected.add(image.uuid);
      }
      setSelectedImages(newSelected);
      return;
    }

    setSelectedImage(image);
    setLoading(true);
    
    try {
      const detail = await getImageDetail(image.uuid);
      setImageDetail(detail);
      
      // Generate cropped faces
      if (detail.faces && detail.faces.length > 0) {
        const crops: { [key: string]: string } = {};
        for (const face of detail.faces) {
          try {
            const params = new URLSearchParams({
              url: detail.image.azure_blob_url,
              x: String(face.bbox.x),
              y: String(face.bbox.y),
              width: String(face.bbox.width),
              height: String(face.bbox.height),
            });
            const res = await fetch(`/api/crop?${params.toString()}`);
            if (res.ok) {
              const b64 = await res.json();
              crops[face.face_id.toString()] = b64;
            }
          } catch (err) {
            console.error('Failed to crop face:', face.face_id, err);
          }
        }
        setCroppedFaces(crops);
      }
      
      setShowDetailModal(true);
    } catch (err) {
      console.error('Failed to fetch image detail:', err);
      setError('Failed to load image details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    // Get admin password from environment variable
    const expectedPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    
    if (!expectedPassword) {
      alert('Admin password not configured');
      return;
    }
    
    if (adminPassword !== expectedPassword) {
      alert('Invalid admin password');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedImages.size} selected images? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    
    try {
      const deletePromises = Array.from(selectedImages).map(uuid => 
        deleteImage(selected!, uuid)
      );
      
      await Promise.all(deletePromises);
      setSelectedImages(new Set());
      setSelectMode(false);
      setShowDeleteModal(false);
      setAdminPassword('');
      await fetchImages();
      alert('Selected images deleted successfully!');
    } catch (err) {
      console.error('Failed to delete images:', err);
      alert('Failed to delete some images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadSelectedImages = () => {
    selectedImages.forEach(uuid => {
      const image = images.find(img => img.uuid === uuid);
      if (image) {
        const link = document.createElement('a');
        link.href = image.azure_blob_url;
        link.download = `image-${uuid}.${image.file_extension}`;
        link.click();
      }
    });
  };

  const nextPage = () => {
    setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }));
  };

  const prevPage = () => {
    setFilters(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }));
  };

  const clearFaceFilter = () => {
    applyFaceFilter(null);
  };

  const addToFaceFilter = (clusterId: number) => {
    const currentFilter = faceFilter || [];
    if (!currentFilter.includes(clusterId)) {
      const newFilter = [...currentFilter, clusterId].sort((a, b) => a - b);
      applyFaceFilter(newFilter);
    }
  };

  const removeFromFaceFilter = (clusterId: number) => {
    const currentFilter = faceFilter || [];
    const newFilter = currentFilter.filter(id => id !== clusterId);
    applyFaceFilter(newFilter.length > 0 ? newFilter : null);
  };

  const toggleFaceFilter = (clusterId: number) => {
    const currentFilter = faceFilter || [];
    if (currentFilter.includes(clusterId)) {
      removeFromFaceFilter(clusterId);
    } else {
      addToFaceFilter(clusterId);
    }
  };

  if (!selected) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Gallery</h1>
        <p style={{ color: '#666', fontSize: '1.2rem' }}>
          Please select an event first to view the gallery.
        </p>
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
      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
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
        }}>Gallery - {selected}</h1>

        {/* Filters */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Start Date:
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              End Date:
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Min Faces:
            </label>
            <input
              type="number"
              min="0"
              value={filters.minFaces}
              onChange={(e) => setFilters(prev => ({ ...prev, minFaces: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Max Faces:
            </label>
            <input
              type="number"
              min="0"
              value={filters.maxFaces}
              onChange={(e) => setFilters(prev => ({ ...prev, maxFaces: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Images per page:
            </label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value), offset: 0 }))}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Face Filter Display */}
        {faceFilter && faceFilter.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            border: '2px solid #2196f3',
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, color: '#1565c0', fontSize: '1.1rem' }}>
                🔍 People Filter Active
              </h3>
              <button
                onClick={clearFaceFilter}
                style={{
                  background: '#f44336',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}
              >
                Clear Filter
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ color: '#1976d2', fontWeight: 'bold' }}>Showing images with:</span>
              {faceFilter.map((clusterId) => (
                <span
                  key={clusterId}
                  style={{
                    background: '#2196f3',
                    color: '#fff',
                    padding: '0.3rem 0.8rem',
                    borderRadius: '15px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold'
                  }}
                >
                  Person {clusterId}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setSelectMode(!selectMode)}
              style={{
                background: selectMode ? '#28a745' : '#6c757d',
                color: '#fff',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              {selectMode ? 'Exit Select Mode' : 'Select Mode'}
            </button>
            
            {selectMode && selectedImages.size > 0 && (
              <>
                <span style={{ color: '#666' }}>
                  {selectedImages.size} selected
                </span>
                <button
                  onClick={downloadSelectedImages}
                  style={{
                    background: '#007bff',
                    color: '#fff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Download
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  style={{
                    background: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: '#666' }}>
              Showing {filters.offset + 1}-{Math.min(filters.offset + filters.limit, totalCount)} of {totalCount}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={prevPage}
                disabled={filters.offset === 0}
                style={{
                  background: filters.offset === 0 ? '#ccc' : '#6c757d',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: filters.offset === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              <button
                onClick={nextPage}
                disabled={filters.offset + filters.limit >= totalCount}
                style={{
                  background: filters.offset + filters.limit >= totalCount ? '#ccc' : '#6c757d',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: filters.offset + filters.limit >= totalCount ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ 
            background: '#fee', 
            color: '#c33', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ 
              display: 'inline-block', 
              width: '40px', 
              height: '40px', 
              border: '4px solid #f3f3f3', 
              borderTop: '4px solid #667eea', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite' 
            }}></div>
            <p style={{ marginTop: '1rem', color: '#666' }}>Loading images...</p>
          </div>
        ) : images.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ fontSize: '1.2rem', color: '#666' }}>
              No images found. Try adjusting your filters or upload some images first.
            </p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}>
            {images.map((image) => (
              <div 
                key={image.uuid}
                onClick={() => handleImageClick(image)}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: selectedImages.has(image.uuid) ? '3px solid #007bff' : '1px solid #ddd',
                  transition: 'all 0.3s ease'
                }}
              >
                <img 
                  src={image.azure_blob_url}
                  alt="Gallery"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  color: '#fff',
                  padding: '0.5rem',
                  fontSize: '0.8rem'
                }}>
                  {image.faces} faces
                </div>
                {selectMode && selectedImages.has(image.uuid) && (
                  <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: '#007bff',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px'
                  }}>
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Image Detail Modal */}
        <Modal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setImageDetail(null);
            setSelectedImage(null);
            setCroppedFaces({});
          }}
          title="Image Details"
        >
          {imageDetail && (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <img 
                  src={imageDetail.image.azure_blob_url}
                  alt="Full size"
                  style={{
                    width: '100%',
                    maxHeight: '400px',
                    objectFit: 'contain',
                    borderRadius: '8px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <strong>Faces detected: {imageDetail.image.faces}</strong>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>
                  Created: {new Date(imageDetail.image.created_at).toLocaleString()}
                </p>
              </div>

              {imageDetail.faces && imageDetail.faces.length > 0 && (
                <div>
                  <h3>Detected Faces:</h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    {imageDetail.faces.map((face) => {
                      const isInFilter = faceFilter?.includes(face.cluster_id) || false;
                      return (
                        <div
                          key={face.face_id}
                          style={{
                            textAlign: 'center',
                            padding: '0.75rem',
                            border: isInFilter ? '3px solid #007bff' : '2px solid #ddd',
                            borderRadius: '12px',
                            transition: 'all 0.3s ease',
                            background: isInFilter ? '#f8f9ff' : '#fff',
                            cursor: 'pointer',
                            transform: isInFilter ? 'scale(1.02)' : 'scale(1)',
                            boxShadow: isInFilter ? '0 4px 12px rgba(0,123,255,0.2)' : '0 2px 6px rgba(0,0,0,0.1)'
                          }}
                          onClick={() => toggleFaceFilter(face.cluster_id)}
                        >
                          {croppedFaces[face.face_id.toString()] ? (
                            <img 
                              src={croppedFaces[face.face_id.toString()]}
                              alt="Cropped face"
                              style={{
                                width: '100px',
                                height: '100px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                marginBottom: '0.5rem'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '100px',
                              height: '100px',
                              background: '#f0f0f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '8px',
                              marginBottom: '0.5rem',
                              fontSize: '0.8rem',
                              color: '#666'
                            }}>
                              Loading...
                            </div>
                          )}
                          <div style={{ 
                            fontSize: '0.9rem', 
                            fontWeight: 'bold',
                            color: isInFilter ? '#007bff' : '#333',
                            marginBottom: '0.2rem'
                          }}>
                            Person {face.cluster_id}
                          </div>
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: isInFilter ? '#007bff' : '#666'
                          }}>
                            {isInFilter ? 'In Filter' : 'Click to Filter'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: '0.9rem', color: '#666', fontStyle: 'italic' }}>
                    Click on a face to filter gallery by similar faces
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Delete Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setAdminPassword('');
          }}
          title="Delete Selected Images"
        >
          <div>
            <div style={{ 
              background: '#fee', 
              color: '#c33', 
              padding: '1rem', 
              borderRadius: '8px', 
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              Warning: This action cannot be undone!
            </div>
            
            <p style={{ marginBottom: '1rem' }}>
              You are about to delete <strong>{selectedImages.size}</strong> selected images.
            </p>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Admin Password *
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>
            
            <button
              onClick={handleDeleteSelected}
              disabled={loading || !adminPassword}
              style={{
                background: (!loading && adminPassword) 
                  ? '#e74c3c' 
                  : '#ccc',
                color: '#fff',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '8px',
                fontSize: '1.1rem',
                cursor: (!loading && adminPassword) ? 'pointer' : 'not-allowed',
                width: '100%'
              }}
            >
              {loading ? 'Deleting...' : 'Delete Selected Images'}
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default GalleryPage;