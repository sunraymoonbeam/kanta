'use client';
import React, { useState, useEffect } from 'react';
import { getImages, getImageDetail, deleteImage } from '../../lib/api';
import { useEvents } from '../../hooks/useEvents';
import { Image, ImageDetail, ImagesParams } from '../../types/images';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ImageGrid from '../../components/ui/ImageGrid';
import { cropFaceImage } from '../../lib/imageCrop';
import { formatDateTime, debounce } from '../../lib/utils';
import { DEFAULT_ADMIN_PASSWORD } from '../../lib/constants';

export default function GalleryPage() {
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

  // Filter states
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minFaces: '',
    maxFaces: '',
    limit: 50,
    offset: 0
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

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

  const fetchImages = async () => {
    if (!selected) return;
    
    setLoading(true);
    setError('');
    
    try {
      const params: ImagesParams = {
        event_code: selected,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
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
  }, [selected, filters, faceFilter, currentPage]);

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
      
      // Generate cropped faces using our utility function
      if (detail.faces && detail.faces.length > 0) {
        const crops: { [key: string]: string } = {};
        for (const face of detail.faces) {
          try {
            const croppedImage = await cropFaceImage(detail.image.azure_blob_url, face.bbox);
            crops[face.face_id.toString()] = croppedImage;
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
    if (!selected || selectedImages.size === 0) return;

    const expectedPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
    
    if (adminPassword !== expectedPassword) {
      alert('Invalid admin password');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedImages.size} selected images?`)) {
      return;
    }

    setLoading(true);
    try {
      for (const imageId of selectedImages) {
        await deleteImage(selected, imageId);
      }
      
      setSelectedImages(new Set());
      setSelectMode(false);
      setShowDeleteModal(false);
      setAdminPassword('');
      await fetchImages();
      alert(`Successfully deleted ${selectedImages.size} images`);
    } catch (err) {
      console.error('Failed to delete images:', err);
      alert('Failed to delete some images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (!selected) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Card padding="lg">
          <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>No Event Selected</h2>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Please select an event from the header dropdown to view photos.
          </p>
        </Card>
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
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '1rem',
          color: '#2c3e50',
          fontSize: '2.5rem'
        }}>
          🖼️ Photo Gallery
        </h1>
        <p style={{ 
          textAlign: 'center', 
          color: '#666', 
          fontSize: '1.1rem' 
        }}>
          Browse photos from <strong>{selected}</strong>
        </p>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '2rem' }} padding="lg">
        <h3 style={{ marginBottom: '1rem', color: '#374151' }}>🔍 Filters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#374151' }}>
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#374151' }}>
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#374151' }}>
              Min Faces
            </label>
            <input
              type="number"
              min="0"
              value={filters.minFaces}
              onChange={(e) => setFilters({ ...filters, minFaces: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#374151' }}>
              Max Faces
            </label>
            <input
              type="number"
              min="0"
              value={filters.maxFaces}
              onChange={(e) => setFilters({ ...filters, maxFaces: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </div>
        </div>
        
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          <Button
            onClick={() => {
              setCurrentPage(1);
              fetchImages();
            }}
            variant="primary"
          >
            🔍 Apply Filters
          </Button>
          
          <Button
            onClick={() => {
              setFilters({
                startDate: '',
                endDate: '',
                minFaces: '',
                maxFaces: '',
                limit: 50,
                offset: 0
              });
              setFaceFilter(null);
              setCurrentPage(1);
            }}
            variant="secondary"
          >
            🗑️ Clear Filters
          </Button>
          
          <Button
            onClick={() => setSelectMode(!selectMode)}
            variant={selectMode ? "warning" : "secondary"}
          >
            {selectMode ? '❌ Cancel Selection' : '☑️ Select Mode'}
          </Button>
          
          {selectMode && selectedImages.size > 0 && (
            <Button
              onClick={() => setShowDeleteModal(true)}
              variant="danger"
            >
              🗑️ Delete Selected ({selectedImages.size})
            </Button>
          )}
        </div>
      </Card>

      {error && (
        <Card style={{ marginBottom: '2rem', background: '#fee2e2' }}>
          <div style={{ color: '#dc2626', textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        </Card>
      )}

      {/* Images Grid */}
      <Card>
        {images.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📸</div>
            <h3 style={{ color: '#6b7280', marginBottom: '1rem' }}>No photos found</h3>
            <p style={{ color: '#9ca3af' }}>
              {faceFilter ? 'No photos found with the selected face filter.' : 'Upload some photos to get started!'}
            </p>
          </div>
        ) : (
          <>
            <ImageGrid
              images={images}
              onImageClick={handleImageClick}
              selectedImages={selectedImages}
              loading={loading}
              columns={6}
            />
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '1rem',
                marginTop: '2rem',
                padding: '1rem 0'
              }}>
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  variant="secondary"
                  size="sm"
                >
                  ← Previous
                </Button>
                
                <span style={{ color: '#6b7280' }}>
                  Page {currentPage} of {totalPages} ({totalCount} total photos)
                </span>
                
                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                  variant="secondary"
                  size="sm"
                >
                  Next →
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Image Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedImage(null);
          setImageDetail(null);
          setCroppedFaces({});
        }}
        title="📷 Photo Details"
        size="xl"
      >
        {selectedImage && imageDetail && (
          <div style={{ display: 'grid', gap: '2rem' }}>
            {/* Main Image */}
            <div style={{ textAlign: 'center' }}>
              <img
                src={imageDetail.image.azure_blob_url}
                alt="Selected"
                style={{
                  maxWidth: '100%',
                  maxHeight: '60vh',
                  objectFit: 'contain',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                }}
              />
            </div>

            {/* Image Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <Card style={{ background: '#f8faff' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>📊 Details</h4>
                <p style={{ margin: '0 0 0.25rem 0', color: '#6b7280' }}>
                  <strong>Faces:</strong> {imageDetail.image.faces}
                </p>
                <p style={{ margin: '0 0 0.25rem 0', color: '#6b7280' }}>
                  <strong>Created:</strong> {formatDateTime(imageDetail.image.created_at)}
                </p>
                <p style={{ margin: 0, color: '#6b7280' }}>
                  <strong>Format:</strong> {imageDetail.image.file_extension?.toUpperCase()}
                </p>
              </Card>
            </div>

            {/* Detected Faces */}
            {imageDetail.faces && imageDetail.faces.length > 0 && (
              <Card>
                <h4 style={{ marginBottom: '1rem', color: '#374151' }}>
                  👥 Detected Faces ({imageDetail.faces.length})
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                  gap: '1rem' 
                }}>
                  {imageDetail.faces.map((face) => (
                    <div key={face.face_id} style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          width: '100px',
                          height: '100px',
                          margin: '0 auto 0.5rem',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '2px solid #e5e7eb',
                          background: '#f9fafb'
                        }}
                      >
                        {croppedFaces[face.face_id.toString()] ? (
                          <img
                            src={croppedFaces[face.face_id.toString()]}
                            alt={`Face ${face.face_id}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9ca3af'
                          }}>
                            👤
                          </div>
                        )}
                      </div>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '0.8rem', 
                        color: '#6b7280' 
                      }}>
                        Face {face.face_id}
                        {face.cluster_id >= 0 && (
                          <><br />Cluster {face.cluster_id}</>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setAdminPassword('');
        }}
        title="🗑️ Delete Selected Photos"
        size="md"
      >
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ 
            background: '#fee2e2', 
            color: '#dc2626', 
            padding: '1rem', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            ⚠️ Warning: This action cannot be undone!
          </div>
          
          <p style={{ textAlign: 'center', color: '#374151' }}>
            You are about to delete <strong>{selectedImages.size}</strong> selected photos.
          </p>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#374151' }}>
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
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button
              onClick={() => {
                setShowDeleteModal(false);
                setAdminPassword('');
              }}
              variant="secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteSelected}
              isLoading={loading}
              disabled={!adminPassword}
              variant="danger"
              style={{ flex: 1 }}
            >
              Delete Photos
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}