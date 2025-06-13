import { useState, useEffect, useCallback } from 'react';
import { Image, ImagesParams, ImagesResponse } from '../types/images';
import { getImages, deleteImage } from '../lib/api';

interface UseImagesOptions {
  autoLoad?: boolean;
  initialParams?: Partial<ImagesParams>;
}

interface UseImagesReturn {
  images: Image[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  loadImages: (params: ImagesParams) => Promise<void>;
  deleteImageById: (eventCode: string, uuid: string) => Promise<void>;
  refresh: () => Promise<void>;
  clearImages: () => void;
}

export function useImages(options: UseImagesOptions = {}): UseImagesReturn {
  const { autoLoad = false, initialParams = {} } = options;
  
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [lastParams, setLastParams] = useState<ImagesParams | null>(null);

  const loadImages = useCallback(async (params: ImagesParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const response: ImagesResponse = await getImages(params);
      setImages(response.images);
      setTotalCount(response.total_count);
      setLastParams(params);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load images';
      setError(errorMessage);
      console.error('Error loading images:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteImageById = useCallback(async (eventCode: string, uuid: string) => {
    try {
      await deleteImage(eventCode, uuid);
      
      // Remove the deleted image from local state
      setImages(prev => prev.filter(img => img.uuid !== uuid));
      setTotalCount(prev => Math.max(0, prev - 1));
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete image';
      setError(errorMessage);
      console.error('Error deleting image:', err);
      throw err; // Re-throw so the caller can handle it
    }
  }, []);

  const refresh = useCallback(async () => {
    if (lastParams) {
      await loadImages(lastParams);
    }
  }, [loadImages, lastParams]);

  const clearImages = useCallback(() => {
    setImages([]);
    setTotalCount(0);
    setError(null);
    setLastParams(null);
  }, []);

  // Auto-load with initial params if specified
  useEffect(() => {
    if (autoLoad && Object.keys(initialParams).length > 0) {
      const defaultParams: ImagesParams = {
        event_code: '',
        limit: 20,
        offset: 0,
        ...initialParams
      };
      loadImages(defaultParams);
    }
  }, [autoLoad, initialParams, loadImages]);

  return {
    images,
    loading,
    error,
    totalCount,
    loadImages,
    deleteImageById,
    refresh,
    clearImages
  };
}
