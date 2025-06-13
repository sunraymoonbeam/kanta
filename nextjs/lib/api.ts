import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/v1')  // Client-side
  : 'http://backend:8000/api/v1';  // Server-side

console.log('API Base URL:', API_BASE_URL);

const api = axios.create({ 
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: any) => {
    console.error('API Error:', error.response?.data || error.message);
    console.error('Request URL:', error.config?.url);
    console.error('Base URL:', error.config?.baseURL);
    return Promise.reject(error);
  }
);

export interface Event {
  code: string;
  name: string;
  description: string;
  start_date_time: string;
  end_date_time: string;
  event_image_url?: string;
  qr_code_image_url?: string;
}

export interface EventsResponse {
  events: Event[];
}

export interface EventPayload {
  event_code: string;
  name: string;
  description: string;
  start_date_time: string;
  end_date_time: string;
}

export interface Image {
  uuid: string;
  azure_blob_url: string;
  file_extension: string;
  faces: number;
  created_at: string;
  last_modified: string;
  filename?: string; // For compatibility
  url?: string; // For compatibility 
  thumbnail_url?: string; // For compatibility
  upload_date_time?: string; // For compatibility
  face_details?: Face[]; // Detailed face information
}

export interface Face {
  face_id: number;
  cluster_id: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ImageDetail {
  image: Image;
  faces: Face[];
}

export interface ImagesResponse {
  images: Image[];
  total_count: number;
}

export interface SampleFace {
  face_id: number;
  sample_blob_url: string;
  sample_bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Cluster {
  cluster_id: number;
  face_count: number;
  samples: SampleFace[];
}

export function getEvents(params?: { event_code?: string }): Promise<Event[]> {
  return api.get<EventsResponse>('/events', { params }).then((r: AxiosResponse<EventsResponse>) => r.data.events);
}

export function createEvent(payload: EventPayload): Promise<Event> {
  return api.post<Event>('/events', payload).then((r: AxiosResponse<Event>) => r.data);
}

export function updateEvent(payload: EventPayload): Promise<Event> {
  return api.put<Event>('/events', payload).then((r: AxiosResponse<Event>) => r.data);
}

export function deleteEvent(event_code: string): Promise<void> {
  return api.delete('/events', { data: { event_code } }).then(() => {});
}

export function uploadEventImage(event_code: string, file: File): Promise<any> {
  const form = new FormData();
  form.append('image_file', file);
  return api.put(`/events/image/${event_code}`, form).then((r: AxiosResponse) => r.data);
}

export interface ImagesParams {
  event_code: string;
  limit?: number;
  offset?: number;
  date_from?: string;
  date_to?: string;
  min_faces?: number;
  max_faces?: number;
  cluster_list_id?: number[];
}

export function getImages(params: ImagesParams): Promise<ImagesResponse> {
  // Build query parameters - axios will handle array serialization correctly
  const queryParams: any = {};
  
  // Add all non-array parameters
  Object.entries(params).forEach(([key, value]) => {
    if (key !== 'cluster_list_id' && value !== undefined && value !== null) {
      queryParams[key] = value;
    }
  });
  
  // Handle cluster_list_id array parameter - axios will serialize array as multiple params
  if (params.cluster_list_id && params.cluster_list_id.length > 0) {
    queryParams.cluster_list_id = params.cluster_list_id;
  }
  
  return api.get<Image[]>('/pics', { 
    params: queryParams,
    paramsSerializer: {
      // This ensures arrays are serialized as multiple params with the same name
      indexes: null // This makes cluster_list_id=1&cluster_list_id=2 instead of cluster_list_id[0]=1&cluster_list_id[1]=2
    }
  }).then((r: AxiosResponse<Image[]>) => {
    // Backend returns a simple array, not wrapped in ImagesResponse
    // We need to create the wrapper structure that the frontend expects
    return {
      images: r.data,
      total_count: r.data.length // This is approximate, real pagination would need a separate call
    };
  });
}

export function getImageDetail(uuid: string): Promise<ImageDetail> {
  return api.get<ImageDetail>(`/pics/${uuid}`).then((r: AxiosResponse<ImageDetail>) => r.data);
}

export function uploadImage(event_code: string, file: File): Promise<Image> {
  const form = new FormData();
  form.append('image_file', file);
  return api.post<Image>(`/pics/${event_code}`, form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }).then((r: AxiosResponse<Image>) => r.data);
}

export function deleteImage(event_code: string, uuid: string): Promise<void> {
  return api.delete(`/pics/${event_code}/${uuid}`).then(() => {});
}

export function getClusters(event_code: string, sample_size = 5): Promise<Cluster[]> {
  return api.get<Cluster[]>('/clusters', { 
    params: { event_code, sample_size } 
  }).then((r: AxiosResponse<Cluster[]>) => r.data);
}

export function findSimilarFaces(event_code: string, file: File, metric = 'cosine', top_k = 10): Promise<Image[]> {
  const form = new FormData();
  form.append('image', file);
  return api.post<Image[]>('/find-similar', form, { 
    params: { event_code, metric, top_k },
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }).then((r: AxiosResponse<Image[]>) => r.data);
}

// Utility function to crop face from image
export function cropFaceFromImage(imageUrl: string, bbox: Face['bbox'], padding = 0.3): string {
  // This would ideally be done server-side, but for now we'll use CSS clipping
  // In production, you'd want to implement server-side cropping
  return imageUrl; // Placeholder - actual cropping would need server support
}

// Utility function to generate base64 cropped face (client-side)
export async function generateCroppedFace(
  imageUrl: string, 
  bbox: Face['bbox'], 
  targetSize = { width: 150, height: 150 }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Add padding
      const padX = bbox.width * 0.3;
      const padY = bbox.height * 0.3;
      
      const cropX = Math.max(0, bbox.x - padX);
      const cropY = Math.max(0, bbox.y - padY);
      const cropWidth = Math.min(img.width - cropX, bbox.width + 2 * padX);
      const cropHeight = Math.min(img.height - cropY, bbox.height + 2 * padY);
      
      canvas.width = targetSize.width;
      canvas.height = targetSize.height;
      
      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, targetSize.width, targetSize.height
      );
      
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

