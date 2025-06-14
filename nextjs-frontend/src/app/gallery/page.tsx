'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import { getImages, getImageDetail, deleteImage } from '@/lib/api';
import { useEvents } from '@/hooks/useEvents';
import { Image, ImageDetail, ImagesParams } from '@/types/images';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ImageGrid from '@/components/ui/ImageGrid';
import { cropFaceImage } from '@/lib/imageCrop';
import { formatDateTime, debounce } from '@/lib/utils';
import { DEFAULT_ADMIN_PASSWORD } from '@/lib/constants';
import { effects } from '@/config/kanta.config';
import styles from './GalleryPage.module.css';

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
  const [isDownloading, setIsDownloading] = useState(false);

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

  const downloadSelectedImages = async () => {
    if (selectedImages.size === 0) {
      alert('Please select images to download');
      return;
    }

    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const imagesToDownload = images.filter(img => selectedImages.has(img.uuid));

      // Create a progress indicator
      let processed = 0;
      const total = imagesToDownload.length;

      for (const image of imagesToDownload) {
        try {
          const response = await fetch(image.azure_blob_url);
          const blob = await response.blob();
          
          // Get file extension from the URL or default to jpg
          const extension = image.file_extension || 'jpg';
          const filename = `${image.uuid}.${extension}`;
          
          zip.file(filename, blob);
          processed++;
          
          // Update progress (you could show this to user)
          console.log(`Downloaded ${processed}/${total} images`);
        } catch (error) {
          console.error(`Failed to download image ${image.uuid}:`, error);
        }
      }

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selected}_photos_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`Successfully downloaded ${processed} images`);
    } catch (error) {
      console.error('Failed to create zip file:', error);
      alert('Failed to download images. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (!selected) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Card padding="lg">
          <h2 style={{ color: '#e74c3c', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>No Event Selected</h2>
          <p style={{ color: '#666', fontSize: '1.125rem' }}>
            Please select an event from the header dropdown to view photos.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Background Effects */}
      <div className={styles.backgroundEffects}>
        {effects.dots.display && (
          <div 
            className={styles.dots}
            style={{
              opacity: Number(effects.dots.opacity) / 100,
              backgroundSize: `${Number(effects.dots.size) * 10}px ${Number(effects.dots.size) * 10}px`
            }}
          />
        )}
        {effects.gradient.display && (
          <div 
            className={styles.gradientOrb}
            style={{
              opacity: Number(effects.gradient.opacity) / 100,
              left: `${effects.gradient.x}%`,
              top: `${effects.gradient.y}%`,
              width: `${effects.gradient.width}%`,
              height: `${effects.gradient.height}%`,
              transform: `rotate(${effects.gradient.tilt}deg)`
            }}
          />
        )}
      </div>

      <div className={styles.content}>
        <motion.div 
          className={styles.header}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1 
            className={`${styles.title} ${styles.titleGradient}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <span className={styles.titleIcon}>📷</span>
            Photo Gallery
          </motion.h1>
          <motion.p 
            className={styles.subtitle}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Browse photos from <strong>{selected}</strong>
          </motion.p>
        </motion.div>

      {/* Filters */}
      <Card style={{ marginBottom: '2rem' }} padding="lg">
        <h3 style={{ marginBottom: '1rem', color: '#374151', fontSize: '1.125rem', fontWeight: 'bold' }}>Filters</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem' 
        }}>
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
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
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
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
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
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
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
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>
        
        <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <Button
            onClick={() => {
              setCurrentPage(1);
              fetchImages();
            }}
            variant="primary"
          >
            Apply Filters
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
            Clear Filters
          </Button>
          
          <Button
            onClick={() => setSelectMode(!selectMode)}
            variant={selectMode ? "warning" : "secondary"}
          >
            {selectMode ? 'Cancel Selection' : 'Select Mode'}
          </Button>

          {selectMode && selectedImages.size > 0 && (
            <>
              <Button
                onClick={downloadSelectedImages}
                variant="primary"
                isLoading={isDownloading}
                disabled={isDownloading}
              >
                📥 Download Selected ({selectedImages.size})
              </Button>
              <Button
                onClick={() => setShowDeleteModal(true)}
                variant="danger"
              >
                🗑️ Delete Selected ({selectedImages.size})
              </Button>
            </>
          )}
        </div>

        {faceFilter && faceFilter.length > 0 && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            background: '#dbeafe', 
            border: '1px solid #3b82f6', 
            borderRadius: '0.5rem' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#1e40af', fontWeight: 'bold' }}>
                🔍 Filtered by people: {faceFilter.join(', ')}
              </span>
              <Button
                onClick={() => applyFaceFilter(null)}
                variant="secondary"
                size="sm"
              >
                Clear Face Filter
              </Button>
            </div>
          </div>
        )}
      </Card>

      {error && (
        <Card style={{ marginBottom: '2rem', background: '#fee2e2', border: '1px solid #fca5a5' }}>
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
            <h3 style={{ color: '#6b7280', fontSize: '1.25rem', marginBottom: '1rem' }}>No photos found</h3>
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
                paddingTop: '1rem' 
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
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  margin: '0 auto'
                }}
              />
            </div>

            {/* Image Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <Card style={{ background: '#e3f2fd' }}>
                <h4 style={{ color: '#374151', fontWeight: 'bold', marginBottom: '0.5rem' }}>Details</h4>
                <p style={{ color: '#6b7280', marginBottom: '0.25rem' }}>
                  <strong>Faces:</strong> {imageDetail.image.faces}
                </p>
                <p style={{ color: '#6b7280', marginBottom: '0.25rem' }}>
                  <strong>Created:</strong> {formatDateTime(imageDetail.image.created_at)}
                </p>
                <p style={{ color: '#6b7280' }}>
                  <strong>Format:</strong> {imageDetail.image.file_extension?.toUpperCase()}
                </p>
              </Card>
            </div>

            {/* Detected Faces */}
            {imageDetail.faces && imageDetail.faces.length > 0 && (
              <Card>
                <h4 style={{ color: '#374151', fontWeight: 'bold', marginBottom: '1rem' }}>
                  👥 Detected Faces ({imageDetail.faces.length})
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                  gap: '1rem' 
                }}>
                  {imageDetail.faces.map((face) => (
                    <div key={face.face_id} style={{ textAlign: 'center' }}>
                      <div 
                        style={{ 
                          width: '96px', 
                          height: '96px', 
                          margin: '0 auto 0.5rem', 
                          borderRadius: '8px', 
                          overflow: 'hidden', 
                          border: '2px solid #e5e7eb', 
                          background: '#f9fafb', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          cursor: face.cluster_id >= 0 ? 'pointer' : 'default'
                        }}
                        onClick={() => {
                          if (face.cluster_id >= 0) {
                            applyFaceFilter([face.cluster_id]);
                            setShowDetailModal(false);
                          }
                        }}
                        title={face.cluster_id >= 0 ? `Click to filter by this person (Cluster ${face.cluster_id})` : 'Unassigned face'}
                      >
                        {croppedFaces[face.face_id.toString()] ? (
                          <img
                            src={croppedFaces[face.face_id.toString()]}
                            alt={`Face ${face.face_id}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ fontSize: '2rem', color: '#9ca3af' }}>
                            👤
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Face {face.face_id}
                        {face.cluster_id >= 0 && (
                          <>
                            <br />
                            <span style={{ color: '#3b82f6', cursor: 'pointer' }}>
                              Person {face.cluster_id}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
                {imageDetail.faces.some(face => face.cluster_id >= 0) && (
                  <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>
                    💡 Click on a face to filter photos by that person
                  </p>
                )}
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
            background: '#fef2f2', 
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
    </div>
  );
}
