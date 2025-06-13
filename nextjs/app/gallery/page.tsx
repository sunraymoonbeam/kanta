'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getImages, getImageDetail, deleteImage, Image, Face } from '../../lib/api';
import { useEvents } from '../../components/EventContext';

export default function GalleryPage() {
  const { selected: eventCode } = useEvents();
  const searchParams = useSearchParams();
  
  // Data states
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  
  // UI states
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [imageDetail, setImageDetail] = useState<any | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);

  const load = async () => {
    if (!eventCode) return;
    
    setLoading(true);
    try {
      const faceFilterParam = searchParams.get('faceFilter');
      const params: any = {
        event_code: eventCode,
        limit: 200,
        offset: 0,
      };
      
      if (faceFilterParam) {
        const clusterIds = faceFilterParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        if (clusterIds.length > 0) {
          params.cluster_list_id = clusterIds;
        }
      }
      
      const data = await getImages(params);
      setImages(data || []);
    } catch (error) {
      console.error('Failed to load images:', error);
      setImages([]);
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

  const deleteSelectedImages = async () => {
    if (selectedImages.size === 0) {
      alert('Please select images to delete');
      return;
    }

    const expectedPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'password123';
    
    if (adminPassword !== expectedPassword) {
      alert('Invalid admin password');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedImages.size} selected image(s)? This action cannot be undone.`)) {
      return;
    }

    for (const uuid of selectedImages) {
      try {
        await deleteImage(eventCode, uuid);
      } catch (error) {
        console.error(`Failed to delete image ${uuid}:`, error);
      }
    }

    alert(`Deleted ${selectedImages.size} image(s)`);
    setSelectedImages(new Set());
    setAdminPassword('');
    setDeleteMode(false);
    load(); // Reload images
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventCode, searchParams]);

  if (!eventCode) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>No Event Selected</h2>
        <p>Please select an event from the dropdown menu to view photos.</p>
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
        }}>Photo Gallery</h1>

        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <span style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem'
          }}>
            Event: {eventCode} ({images.length} photos)
          </span>
        </div>

        {/* Controls */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <span style={{ color: '#666', fontWeight: 'bold' }}>
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
            Download Selected ({selectedImages.size})
          </button>

          <button
            onClick={() => setDeleteMode(!deleteMode)}
            disabled={selectedImages.size === 0}
            style={{
              background: selectedImages.size > 0 ? '#e74c3c' : '#ccc',
              color: '#fff',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: selectedImages.size > 0 ? 'pointer' : 'not-allowed',
              fontSize: '1rem'
            }}
          >
            Delete Selected ({selectedImages.size})
          </button>
        </div>

        {/* Delete confirmation */}
        {deleteMode && selectedImages.size > 0 && (
          <div style={{ 
            background: '#fee', 
            border: '1px solid #fcc',
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <p style={{ color: '#c33', marginBottom: '1rem' }}>
              Warning: You are about to delete {selectedImages.size} image(s). This action cannot be undone!
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                style={{
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
              <button
                onClick={deleteSelectedImages}
                disabled={!adminPassword}
                style={{
                  background: adminPassword ? '#e74c3c' : '#ccc',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: adminPassword ? 'pointer' : 'not-allowed'
                }}
              >
                Confirm Delete
              </button>
              <button
                onClick={() => {
                  setDeleteMode(false);
                  setAdminPassword('');
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
                Cancel
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
              Default password: password123
            </p>
          </div>
        )}

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
              No photos found. Upload some photos using the camera!
            </p>
          </div>
        )}

        {/* Image Gallery - Simple Grid */}
        {!loading && images.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
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
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover'
                  }}
                />
              </div>
            ))}
          </div>
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
                minWidth: '600px'
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

              {/* Detected Faces */}
              {imageDetail && imageDetail.face_crops && imageDetail.face_crops.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ color: '#2c3e50', marginBottom: '1rem' }}>Detected Faces</h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    {imageDetail.face_crops.map((face: any, index: number) => (
                      <div
                        key={index}
                        style={{
                          textAlign: 'center',
                          cursor: 'pointer',
                          padding: '0.5rem',
                          border: '2px solid transparent',
                          borderRadius: '8px',
                          transition: 'border-color 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#667eea';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'transparent';
                        }}
                        onClick={() => {
                          // Filter by this face cluster
                          const url = new URL(window.location.href);
                          url.searchParams.set('faceFilter', face.cluster_id.toString());
                          window.location.href = url.toString();
                        }}
                      >
                        <img
                          src={face.azure_blob_url}
                          alt={`Face ${index + 1}`}
                          style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '50%',
                            marginBottom: '0.25rem'
                          }}
                        />
                        <div style={{ fontSize: '0.7rem', color: '#666' }}>
                          Person {face.cluster_id}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic' }}>
                    Click on a face to filter the gallery by that person
                  </p>
                </div>
              )}
              
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                <p><strong>Uploaded:</strong> {new Date(selectedImage.created_at).toLocaleString()}</p>
                <p><strong>File Type:</strong> {selectedImage.file_extension}</p>
                {imageDetail && imageDetail.face_crops && (
                  <p><strong>Faces Detected:</strong> {imageDetail.face_crops.length}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
