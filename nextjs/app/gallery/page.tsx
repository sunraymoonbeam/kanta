'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getImages, getImageDetail, Image, Face } from '../../lib/api';
import { useEvents } from '../../components/EventContext';

export default function GalleryPage() {
  const { selected: eventCode } = useEvents();
  const searchParams = useSearchParams();
  
  // Filter states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minFaces, setMinFaces] = useState(0);
  const [maxFaces, setMaxFaces] = useState(0);
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);
  const [faceFilter, setFaceFilter] = useState<number[]>([]);
  
  // Data states
  const [images, setImages] = useState<Image[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  
  // UI states
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [imageDetail, setImageDetail] = useState<Image | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const load = async () => {
    if (!eventCode) return;
    
    setLoading(true);
    try {
      const params: any = {
        event_code: eventCode,
        limit,
        offset: (page - 1) * limit,
      };
      
      if (dateFrom) params.date_from = `${dateFrom}T00:00:00`;
      if (dateTo) params.date_to = `${dateTo}T23:59:59`;
      if (minFaces > 0) params.min_faces = minFaces;
      if (maxFaces > 0) params.max_faces = maxFaces;
      if (faceFilter.length > 0) params.cluster_list_id = faceFilter;
      
      const data = await getImages(params);
      setImages(data || []);
      setTotalCount(data.length || 0); // For now, we'll use the returned count
    } catch (error) {
      console.error('Failed to load images:', error);
      setImages([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const loadImageDetail = async (uuid: string) => {
    try {
      const detail = await getImageDetail(uuid);
      setImageDetail(detail);
    } catch (error) {
      console.error('Failed to load image detail:', error);
    }
  };

  const downloadSelectedImages = async () => {
    if (selectedImages.size === 0) {
      alert('Please select images to download');
      return;
    }

    // Simple download for now - in a real app you'd create a zip
    for (const uuid of selectedImages) {
      const image = images.find(img => img.uuid === uuid);
      if (image?.azure_blob_url) {
        const link = document.createElement('a');
        link.href = image.azure_blob_url;
        link.download = `image-${uuid}.${image.file_extension || 'jpg'}`;
        link.click();
      }
    }
  };

  const toggleImageSelection = (uuid: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uuid)) {
        newSet.delete(uuid);
      } else {
        newSet.add(uuid);
      }
      return newSet;
    });
  };

  const clearFaceFilter = () => {
    setFaceFilter([]);
    setPage(1);
    load();
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventCode, page]);

  // Handle URL parameters for face filter
  useEffect(() => {
    const faceFilterParam = searchParams.get('faceFilter');
    if (faceFilterParam) {
      const clusterIds = faceFilterParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      setFaceFilter(clusterIds);
    }
  }, [searchParams]);

  if (!eventCode) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>⚠️ No Event Selected</h2>
        <p>Please select an event from the dropdown menu to view photos.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / limit);

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
        }}>🖼️ Photo Gallery</h1>

        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <span style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem'
          }}>
            Event: {eventCode} ({totalCount} photos)
          </span>
        </div>

        {faceFilter.length > 0 && (
          <div style={{ 
            background: '#e3f2fd', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Showing images for persons: {faceFilter.join(', ')}</span>
            <button
              onClick={clearFaceFilter}
              style={{
                background: '#2196f3',
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

        {/* Filters and Controls */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '1rem', 
          marginBottom: '1rem',
          padding: '1.5rem',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
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
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
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
              Min Faces
            </label>
            <input
              type="number"
              min="0"
              value={minFaces || ''}
              onChange={(e) => setMinFaces(parseInt(e.target.value) || 0)}
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
              Max Faces
            </label>
            <input
              type="number"
              min="0"
              value={maxFaces || ''}
              onChange={(e) => setMaxFaces(parseInt(e.target.value) || 0)}
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
              Photos per page
            </label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              <option value={10}>10 photos</option>
              <option value={20}>20 photos</option>
              <option value={50}>50 photos</option>
              <option value={100}>100 photos</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button
              onClick={load}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                width: '100%'
              }}
            >
              {loading ? '⏳ Loading...' : '🔍 Search'}
            </button>
          </div>
        </div>

        {/* Selection Controls */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? '#667eea' : '#f0f0f0',
                color: viewMode === 'grid' ? '#fff' : '#333',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔲 Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                background: viewMode === 'list' ? '#667eea' : '#f0f0f0',
                color: viewMode === 'list' ? '#fff' : '#333',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              📄 List
            </button>
          </div>

          <span style={{ color: '#666' }}>
            {selectedImages.size} of {images.length} selected
          </span>

          <button
            onClick={downloadSelectedImages}
            disabled={selectedImages.size === 0}
            style={{
              background: selectedImages.size > 0 ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' : '#ccc',
              color: '#fff',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: selectedImages.size > 0 ? 'pointer' : 'not-allowed',
              fontSize: '1rem'
            }}
          >
            📥 Download Selected ({selectedImages.size})
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '1.2rem', color: '#666' }}>Loading photos...</p>
          </div>
        )}

        {/* No Images */}
        {!loading && images.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '1.2rem', color: '#666' }}>
              No photos found. Try adjusting your filters or upload some photos using the camera!
            </p>
          </div>
        )}

        {/* Image Gallery */}
        {!loading && images.length > 0 && (
          <>
            <div style={{
              display: viewMode === 'grid' ? 'grid' : 'block',
              gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(200px, 1fr))' : undefined,
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              {images.map((image) => (
                <div
                  key={image.uuid}
                  style={{
                    background: '#fff',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: selectedImages.has(image.uuid) ? '0 0 0 3px #667eea' : '0 4px 15px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    display: viewMode === 'list' ? 'flex' : 'block',
                    marginBottom: viewMode === 'list' ? '1rem' : undefined,
                    position: 'relative'
                  }}
                  onClick={() => {
                    setSelectedImage(image);
                    loadImageDetail(image.uuid);
                  }}
                  onMouseEnter={(e) => {
                    if (!selectedImages.has(image.uuid)) {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedImages.has(image.uuid)) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                    }
                  }}
                >
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedImages.has(image.uuid)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleImageSelection(image.uuid);
                    }}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      left: '0.5rem',
                      zIndex: 10,
                      transform: 'scale(1.2)'
                    }}
                  />

                  <img
                    src={image.azure_blob_url}
                    alt={`Image ${image.uuid}`}
                    style={{
                      width: viewMode === 'grid' ? '100%' : '150px',
                      height: viewMode === 'grid' ? '200px' : '100px',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{ padding: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#2c3e50' }}>
                      Image {image.uuid.slice(0, 8)}...
                    </h4>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#666' }}>
                      📅 {new Date(image.created_at).toLocaleDateString()}
                    </p>
                    {image.faces && image.faces > 0 && (
                      <p style={{ margin: '0', fontSize: '0.8rem', color: '#888' }}>
                        👥 {image.faces} face{image.faces !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '2rem'
              }}>
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  style={{
                    background: page === 1 ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: page === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  ⬅️ Previous
                </button>
                
                <span style={{ margin: '0 1rem', color: '#666' }}>
                  Page {page} of {totalPages}
                </span>
                
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  style={{
                    background: page === totalPages ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next ➡️
                </button>
              </div>
            )}
          </>
        )}

        {/* Image Detail Modal */}
        {selectedImage && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '2rem'
            }}
            onClick={() => {
              setSelectedImage(null);
              setImageDetail(null);
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '90vw',
                maxHeight: '90vh',
                overflow: 'auto',
                minWidth: '500px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1rem' 
              }}>
                <h3 style={{ margin: 0, color: '#2c3e50' }}>
                  Image Details
                </h3>
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setImageDetail(null);
                  }}
                  style={{
                    background: '#e74c3c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  ✕
                </button>
              </div>
              
              <img
                src={selectedImage.azure_blob_url}
                alt="Selected image"
                style={{
                  width: '100%',
                  maxHeight: '50vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}
              />
              
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                <p><strong>UUID:</strong> {selectedImage.uuid}</p>
                <p><strong>Uploaded:</strong> {new Date(selectedImage.created_at).toLocaleString()}</p>
                <p><strong>File Type:</strong> {selectedImage.file_extension}</p>
                {selectedImage.faces && selectedImage.faces > 0 && (
                  <p><strong>Faces Detected:</strong> {selectedImage.faces}</p>
                )}
              </div>

              {/* Face detection results - placeholder for future implementation */}
              {imageDetail && imageDetail.faces && imageDetail.faces > 0 && (
                <div>
                  <h4 style={{ color: '#2c3e50', marginBottom: '1rem' }}>Detected Faces</h4>
                  <div style={{
                    background: '#f8f9fa',
                    padding: '1rem',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <p style={{ color: '#666', margin: 0 }}>
                      Face recognition data available for {imageDetail.faces} face{imageDetail.faces !== 1 ? 's' : ''}
                    </p>
                    <p style={{ color: '#888', fontSize: '0.8rem', margin: '0.5rem 0 0 0' }}>
                      Face clustering and filtering features coming soon
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
