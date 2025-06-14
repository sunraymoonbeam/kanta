'use client';
import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
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
      <div className="p-8 text-center">
        <Card padding="lg">
          <h2 className="text-red-500 text-xl font-semibold mb-4">No Event Selected</h2>
          <p className="text-gray-600 text-lg">
            Please select an event from the header dropdown to view photos.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <div className="mb-8">
        <h1 className="text-center text-4xl font-bold text-gray-800 mb-4">
          Photo Gallery
        </h1>
        <p className="text-center text-gray-600 text-lg">
          Browse photos from <strong>{selected}</strong>
        </p>
      </div>      {/* Filters */}
      <Card className="mb-8" padding="lg">
        <h3 className="mb-4 text-gray-700 text-lg font-semibold">Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block mb-2 font-semibold text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block mb-2 font-semibold text-gray-700">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block mb-2 font-semibold text-gray-700">
              Min Faces
            </label>
            <input
              type="number"
              min="0"
              value={filters.minFaces}
              onChange={(e) => setFilters({ ...filters, minFaces: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block mb-2 font-semibold text-gray-700">
              Max Faces
            </label>
            <input
              type="number"
              min="0"
              value={filters.maxFaces}
              onChange={(e) => setFilters({ ...filters, maxFaces: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-3">
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
                Download Selected ({selectedImages.size})
              </Button>
              <Button
                onClick={() => setShowDeleteModal(true)}
                variant="danger"
              >
                Delete Selected ({selectedImages.size})
              </Button>
            </>
          )}
        </div>
      </Card>

      {error && (
        <Card className="mb-8 bg-red-50 border-red-200">
          <div className="text-red-600 text-center">
            {error}
          </div>
        </Card>
      )}

      {/* Images Grid */}
      <Card>
        {images.length === 0 && !loading ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-gray-500 text-xl mb-4">No photos found</h3>
            <p className="text-gray-400">
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
              <div className="flex justify-center items-center gap-4 mt-8 pt-4">
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  variant="secondary"
                  size="sm"
                >
                  ← Previous
                </Button>
                
                <span className="text-gray-500">
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
        title="Photo Details"
        size="xl"
      >
        {selectedImage && imageDetail && (
          <div className="grid gap-8">
            {/* Main Image */}
            <div className="text-center">
              <img
                src={imageDetail.image.azure_blob_url}
                alt="Selected"
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-lg mx-auto"
              />
            </div>

            {/* Image Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-blue-50">
                <h4 className="text-gray-700 font-semibold mb-2">Details</h4>
                <p className="text-gray-600 mb-1">
                  <strong>Faces:</strong> {imageDetail.image.faces}
                </p>
                <p className="text-gray-600 mb-1">
                  <strong>Created:</strong> {formatDateTime(imageDetail.image.created_at)}
                </p>
                <p className="text-gray-600">
                  <strong>Format:</strong> {imageDetail.image.file_extension?.toUpperCase()}
                </p>
              </Card>
            </div>

            {/* Detected Faces */}
            {imageDetail.faces && imageDetail.faces.length > 0 && (
              <Card>
                <h4 className="text-gray-700 font-semibold mb-4">
                  Detected Faces ({imageDetail.faces.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {imageDetail.faces.map((face) => (
                    <div key={face.face_id} className="text-center">
                      <div className="w-24 h-24 mx-auto mb-2 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center">
                        {croppedFaces[face.face_id.toString()] ? (
                          <img
                            src={croppedFaces[face.face_id.toString()]}
                            alt={`Face ${face.face_id}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-2xl text-gray-400">
                            👤
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
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
        title="Delete Selected Photos"
        size="md"
      >
        <div className="grid gap-6">
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
            ⚠️ Warning: This action cannot be undone!
          </div>
          
          <p className="text-center text-gray-700">
            You are about to delete <strong>{selectedImages.size}</strong> selected photos.
          </p>
          
          <div>
            <label className="block mb-2 font-semibold text-gray-700">
              Admin Password *
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-4">
            <Button
              onClick={() => {
                setShowDeleteModal(false);
                setAdminPassword('');
              }}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteSelected}
              isLoading={loading}
              disabled={!adminPassword}
              variant="danger"
              className="flex-1"
            >
              Delete Photos
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}