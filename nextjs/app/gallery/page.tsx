'use client';
import { useState, useEffect } from 'react';
import { getImages, getImageDetail, deleteImage, generateCroppedFace, Image, ImagesParams } from '../../lib/api';
import { useEvents } from '../../components/EventContext';

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
  const [imageDetail, setImageDetail] = useState<Image | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [croppedFaces, setCroppedFaces] = useState<{ [key: string]: string }>({});
  const [faceFilter, setFaceFilter] = useState<number | null>(null);
  
  // Filter states - comprehensive filters like Streamlit
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minFaces: '',
    maxFaces: '',
    limit: 20,
    offset: 0,
    page: 1
  });
  
  // Additional filter states for face filtering
  const [peopleFilter, setPeopleFilter] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  const fetchImages = async () => {
    if (!selected) return;
    
    setLoading(true);
    setError('');
    
    try {
      const params: ImagesParams = {
        event_code: selected,
        limit: filters.limit,
        offset: (filters.page - 1) * filters.limit,
      };
      
      if (filters.startDate) params.date_from = new Date(filters.startDate).toISOString();
      if (filters.endDate) params.date_to = new Date(filters.endDate).toISOString();
      if (filters.minFaces) params.min_faces = parseInt(filters.minFaces);
      if (filters.maxFaces) params.max_faces = parseInt(filters.maxFaces);
      if (faceFilter !== null) params.cluster_list_id = [faceFilter];
      if (peopleFilter.length > 0) params.cluster_list_id = peopleFilter;
      
      const response = await getImages(params);
      setImages(response.images || response);
      setTotalCount(response.total_count || (response as any).length || 0);
    } catch (err: any) {
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
      if (detail.face_details && detail.face_details.length > 0) {
        const crops: { [key: string]: string } = {};
        for (const face of detail.face_details) {
          try {
            const croppedFace = await generateCroppedFace(detail.azure_blob_url, face.bounding_box);
            crops[face.uuid] = croppedFace;
          } catch (err) {
            console.error('Failed to crop face:', err);
          }
        }
        setCroppedFaces(crops);
      }
      
      setShowDetailModal(true);
    } catch (err: any) {
      console.error('Failed to fetch image detail:', err);
      setError('Failed to load image details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    const expectedPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'password123';
    
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
    } catch (err: any) {
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

  const clearFaceFilter = () => {
    setFaceFilter(null);
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

        {/* Comprehensive Filters - Like Streamlit */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: '#2c3e50' }}>Filters</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                background: 'none',
                border: '1px solid #ddd',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
          
          {showFilters && (
            <div style={{ 
              background: '#f8f9fa', 
              padding: '1.5rem', 
              borderRadius: '8px',
              border: '1px solid #ddd'
            }}>
              {/* Date Filters */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    From Date:
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
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
                    To Date:
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
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
                    onChange={(e) => setFilters(prev => ({ ...prev, minFaces: e.target.value, page: 1 }))}
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
                    onChange={(e) => setFilters(prev => ({ ...prev, maxFaces: e.target.value, page: 1 }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
              
              {/* Pagination Controls */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Images per page:
                  </label>
                  <select
                    value={filters.limit}
                    onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Page:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={filters.page}
                    onChange={(e) => setFilters(prev => ({ ...prev, page: parseInt(e.target.value) || 1 }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
              
              {/* Filter Actions */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setFilters({
                      startDate: '',
                      endDate: '',
                      minFaces: '',
                      maxFaces: '',
                      limit: 20,
                      offset: 0,
                      page: 1
                    });
                    setFaceFilter(null);
                    setPeopleFilter([]);
                  }}
                  style={{
                    background: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Clear All Filters
                </button>
                
                {faceFilter !== null && (
                  <button
                    onClick={() => setFaceFilter(null)}
                    style={{
                      background: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear Face Filter (Person {faceFilter})
                  </button>
                )}
                
                {peopleFilter.length > 0 && (
                  <button
                    onClick={() => setPeopleFilter([])}
                    style={{
                      background: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear People Filter ({peopleFilter.length} selected)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Face Filter Display */}
        {faceFilter !== null && (
          <div style={{
            background: '#e3f2fd',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Filtering by face cluster: {faceFilter}</span>
            <button
              onClick={clearFaceFilter}
              style={{
                background: '#f44336',
                color: '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear Face Filter
            </button>
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
              Showing {((filters.page - 1) * filters.limit) + 1}-{Math.min(filters.page * filters.limit, totalCount)} of {totalCount} (Page {filters.page} of {Math.ceil(totalCount / filters.limit)})
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={filters.page <= 1}
                style={{
                  background: filters.page <= 1 ? '#ccc' : '#6c757d',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: filters.page <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={filters.page >= Math.ceil(totalCount / filters.limit)}
                style={{
                  background: filters.page >= Math.ceil(totalCount / filters.limit) ? '#ccc' : '#6c757d',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: filters.page >= Math.ceil(totalCount / filters.limit) ? 'not-allowed' : 'pointer'
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
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #667eea', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
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
                  src={imageDetail.azure_blob_url}
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
                <strong>Faces detected: {imageDetail.faces}</strong>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>
                  Created: {new Date(imageDetail.created_at).toLocaleString()}
                </p>
              </div>

              {imageDetail.face_details && imageDetail.face_details.length > 0 && (
                <div>
                  <h3>Detected Faces:</h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    {imageDetail.face_details.map((face) => (
                      <div 
                        key={face.uuid}
                        onClick={() => setFaceFilter(face.cluster_id)}
                        style={{
                          textAlign: 'center',
                          cursor: 'pointer',
                          padding: '0.5rem',
                          border: faceFilter === face.cluster_id ? '2px solid #007bff' : '1px solid #ddd',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {croppedFaces[face.uuid] ? (
                          <img 
                            src={croppedFaces[face.uuid]}
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
                            marginBottom: '0.5rem'
                          }}>
                            Loading...
                          </div>
                        )}
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                          Cluster {face.cluster_id}
                        </div>
                      </div>
                    ))}
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
