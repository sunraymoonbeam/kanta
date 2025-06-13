'use client';
import { useEffect, useState } from 'react';
import { getImages, Image } from '../../lib/api';
import { useEvents } from '../../components/EventContext';

export default function GalleryPage() {
  const { selected: eventCode } = useEvents();
  const [dateFilter, setDateFilter] = useState('');
  const [minFaces, setMinFaces] = useState('');
  const [maxFaces, setMaxFaces] = useState('');
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);
  const [images, setImages] = useState<Image[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const load = async () => {
    if (!eventCode) return;
    
    setLoading(true);
    try {
      const data = await getImages({
        event_code: eventCode,
        limit,
        offset: (page - 1) * limit,
        date: dateFilter || undefined,
      });
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventCode, page]);

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

        {/* Filters and Controls */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginBottom: '2rem',
          padding: '1.5rem',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Filter by Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
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
              <option value={20}>20 photos</option>
              <option value={50}>50 photos</option>
              <option value={100}>100 photos</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              View Mode
            </label>
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
          </div>

          <div style={{ display: 'flex', alignItems: 'end', gap: '0.5rem' }}>
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
                fontSize: '1rem'
              }}
            >
              {loading ? '⏳ Loading...' : '🔍 Search'}
            </button>
          </div>
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
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    display: viewMode === 'list' ? 'flex' : 'block',
                    marginBottom: viewMode === 'list' ? '1rem' : undefined
                  }}
                  onClick={() => setSelectedImage(image)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                  }}
                >
                  <img
                    src={image.azure_blob_url}
                    alt={image.filename || 'Image'}
                    style={{
                      width: viewMode === 'grid' ? '100%' : '150px',
                      height: viewMode === 'grid' ? '200px' : '100px',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{ padding: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#2c3e50' }}>
                      {image.filename || `Image.${image.file_extension}`}
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

        {/* Image Modal */}
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
            onClick={() => setSelectedImage(null)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '90vw',
                maxHeight: '90vh',
                overflow: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#2c3e50' }}>{selectedImage.filename || `Image.${selectedImage.file_extension}`}</h3>
                <button
                  onClick={() => setSelectedImage(null)}
                  style={{
                    background: '#e74c3c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    marginLeft: '1rem'
                  }}
                >
                  ✕
                </button>
              </div>
              <img
                src={selectedImage.azure_blob_url}
                alt={selectedImage.filename || 'Image'}
                style={{
                  width: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
              <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                <p>📅 Uploaded: {new Date(selectedImage.created_at).toLocaleString()}</p>
                {selectedImage.faces && selectedImage.faces > 0 && (
                  <p>👥 {selectedImage.faces} face{selectedImage.faces !== 1 ? 's' : ''} detected</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
