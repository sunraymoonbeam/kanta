'use client';
import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { getImages, getImageDetail, deleteImage } from '../../lib/api';
import { useEvents } from '../../hooks/useEvents';
import { Image as ImageType, ImageDetail, ImagesParams } from '../../types/images';
import Modal from '../../components/ui/Modal';
import { cropFaceImage } from '../../lib/imageCrop';
import { formatDateTime } from '../../lib/utils';
import { DEFAULT_ADMIN_PASSWORD } from '../../lib/constants';

export default function GalleryPage() {
  const { selected } = useEvents();
  const [images, setImages] = useState<ImageType[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImageType | null>(null);
  const [imageDetail, setImageDetail] = useState<ImageDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [croppedFaces, setCroppedFaces] = useState<{ [key: string]: string }>({});
  const [faceFilter, setFaceFilter] = useState<number[] | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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
  const [itemsPerPage, setItemsPerPage] = useState(30);
  const itemsPerPageOptions = [20, 30, 40, 50, 100];

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
  }, [selected, filters, faceFilter, currentPage, itemsPerPage]);

  const handleImageClick = async (image: ImageType) => {
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
      
      // Get all images that match the selected IDs
      let imagesToDownload: ImageType[] = [];
      
      for (const selectedId of Array.from(selectedImages)) {
        const currentPageImage = images.find(img => img.uuid === selectedId);
        if (currentPageImage) {
          imagesToDownload.push(currentPageImage);
        } else {
          try {
            const imageDetail = await getImageDetail(selectedId);
            imagesToDownload.push(imageDetail.image);
          } catch (error) {
            console.error(`Failed to fetch details for image ${selectedId}:`, error);
          }
        }
      }

      if (imagesToDownload.length === 0) {
        alert('No selected images found. Please try selecting images again.');
        setIsDownloading(false);
        return;
      }

      let processed = 0;
      const total = imagesToDownload.length;

      for (const image of imagesToDownload) {
        try {
          let response;
          try {
            response = await fetch(image.azure_blob_url, {
              mode: 'cors',
              cache: 'no-cache',
              headers: { 'Accept': 'image/*' }
            });
          } catch (corsError) {
            response = await fetch(`/api/proxy-image?url=${encodeURIComponent(image.azure_blob_url)}`);
          }
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const blob = await response.blob();
          
          if (blob.size === 0) {
            throw new Error('Empty file downloaded');
          }
          
          const extension = image.file_extension || 'jpg';
          const filename = `${image.uuid}.${extension}`;
          
          zip.file(filename, blob);
          processed++;
        } catch (error) {
          console.error(`Failed to download image ${image.uuid}:`, error);
        }
      }

      if (processed === 0) {
        alert('Failed to download any images. This might be due to CORS restrictions.');
        setIsDownloading(false);
        return;
      }

      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selected}_photos_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`Successfully downloaded ${processed} out of ${total} images`);
      setSelectedImages(new Set());
    } catch (error) {
      console.error('Failed to create zip file:', error);
      alert('Failed to download images. Please try again or contact support.');
    } finally {
      setIsDownloading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (!selected) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📷</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Event Selected</h2>
          <p className="text-gray-600">
            Please select an event to view photos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Instagram-style Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">Gallery</h1>
              {selected && (
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {selected}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-full transition-colors ${
                  showFilters 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
              </button>
              
              {/* Upload Button */}
              <button
                onClick={() => window.location.href = '/gallery/upload'}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Collapsible Filter Bar */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* Date Range */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => {
                      setFilters({ ...filters, startDate: e.target.value });
                      setCurrentPage(1);
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => {
                      setFilters({ ...filters, endDate: e.target.value });
                      setCurrentPage(1);
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                  />
                </div>

                {/* Face Count */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min Faces</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.minFaces}
                    onChange={(e) => {
                      setFilters({ ...filters, minFaces: e.target.value });
                      setCurrentPage(1);
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                    placeholder="Any"
                  />
                </div>

                {/* Items per page */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Per Page</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                  >
                    {itemsPerPageOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {/* Page Navigation */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Page</label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                      className="p-1 text-xs border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
                    >
                      ←
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={Math.ceil(totalCount / itemsPerPage)}
                      value={currentPage}
                      onChange={(e) => {
                        const page = Math.max(1, Math.min(Math.ceil(totalCount / itemsPerPage), Number(e.target.value)));
                        setCurrentPage(page);
                      }}
                      className="w-12 px-1 py-1 text-xs text-center border border-gray-300 rounded focus:ring-1 focus:ring-gray-900"
                    />
                    <button
                      onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / itemsPerPage), currentPage + 1))}
                      disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                      className="p-1 text-xs border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
                    >
                      →
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stats</label>
                  <div className="text-xs text-gray-500">
                    {totalCount} photos
                    <br />
                    Page {currentPage} of {Math.ceil(totalCount / itemsPerPage)}
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              <div className="mt-3 flex justify-end">
                <button
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
                  className="text-xs text-gray-600 hover:text-gray-900"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Selection Action Bar */}
      {(selectedImages.size > 0 || selectMode) && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {selectedImages.size} selected
                </span>
                <button
                  onClick={() => {
                    setSelectedImages(new Set());
                    setSelectMode(false);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear selection
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadSelectedImages}
                  disabled={selectedImages.size === 0 || isDownloading}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDownloading ? 'Downloading...' : `Download (${selectedImages.size})`}
                </button>
                
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={selectedImages.size === 0}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instagram-style Grid */}
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📷</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
            <p className="text-gray-500 mb-6">Upload some photos to get started</p>
            <button
              onClick={() => window.location.href = '/gallery/upload'}
              className="px-6 py-3 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800"
            >
              Upload Photos
            </button>
          </div>
        ) : (
          <>
            {/* 5-Column Grid */}
            <div className="grid grid-cols-5 gap-0.5">
              {images.map((image) => (
                <div
                  key={image.uuid}
                  className="relative aspect-square cursor-pointer group overflow-hidden bg-gray-100"
                  onClick={() => handleImageClick(image)}
                >
                  <img
                    src={image.azure_blob_url}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-between p-2">
                    <div className="flex items-center gap-1 text-white text-xs font-medium">
                      {image.faces > 0 && (
                        <span className="flex items-center gap-1 bg-black/30 rounded-full px-2 py-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          {image.faces}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-white text-xs opacity-70">
                      {new Date(image.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Selection indicator */}
                  {selectedImages.has(image.uuid) && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* Select mode overlay */}
                  {selectMode && !selectedImages.has(image.uuid) && (
                    <div className="absolute top-1 right-1 w-5 h-5 border-2 border-white rounded-full bg-black/20"></div>
                  )}
                </div>
              ))}
            </div>

            {/* Instagram-style Pagination */}
            {totalPages > 1 && (
              <div className="py-8 flex justify-center">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-1">
                    {(() => {
                      const maxVisible = 7;
                      const startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                      const endPage = Math.min(totalPages, startPage + maxVisible - 1);
                      const pages = [];

                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`w-8 h-8 text-sm rounded-md transition-colors ${
                              i === currentPage
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }

                      return pages;
                    })()}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <div className="text-center pb-8 text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} photos
            </div>
          </>
        )}
      </div>

      {/* Floating Select Mode Button */}
      {!selectMode && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setSelectMode(true)}
            className="bg-gray-900 hover:bg-gray-800 text-white p-4 rounded-full shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Enhanced Image Detail Modal with Person Selection */}
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
          <div className="grid gap-6">
            {/* Main Image */}
            <div className="text-center">
              <img
                src={imageDetail.image.azure_blob_url}
                alt="Selected photo"
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-lg mx-auto"
              />
            </div>

            {/* Image Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-500">People</p>
                  <p className="text-lg font-semibold text-gray-900">{imageDetail.image.faces}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(imageDetail.image.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Format</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {imageDetail.image.file_extension?.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>

            {/* Detected People with Filter Option */}
            {imageDetail.faces && imageDetail.faces.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    People in this photo ({imageDetail.faces.length})
                  </h4>
                  <button
                    onClick={() => {
                      const clusterIds = imageDetail.faces
                        .filter(face => face.cluster_id >= 0)
                        .map(face => face.cluster_id);
                      if (clusterIds.length > 0) {
                        applyFaceFilter(clusterIds);
                        setShowDetailModal(false);
                      }
                    }}
                    className="text-sm bg-gray-900 text-white px-3 py-1 rounded-md hover:bg-gray-800"
                  >
                    Filter by these people
                  </button>
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {imageDetail.faces.map((face) => (
                    <div 
                      key={face.face_id} 
                      className="text-center cursor-pointer group"
                      onClick={() => {
                        if (face.cluster_id >= 0) {
                          applyFaceFilter([face.cluster_id]);
                          setShowDetailModal(false);
                        }
                      }}
                    >
                      <div className="w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center group-hover:border-gray-900 transition-colors">
                        {croppedFaces[face.face_id.toString()] ? (
                          <img
                            src={croppedFaces[face.face_id.toString()]}
                            alt="Person"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-xl text-gray-400">👤</div>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
                        {face.cluster_id >= 0 ? `Person ${face.cluster_id}` : 'Unknown'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
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
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-md text-center">
            <p className="text-red-800 font-medium">
              ⚠️ This action cannot be undone!
            </p>
            <p className="text-red-700 mt-1">
              You are about to delete {selectedImages.size} selected photos.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Password
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter admin password"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setAdminPassword('');
              }}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={!adminPassword || loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting...' : 'Delete Photos'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
