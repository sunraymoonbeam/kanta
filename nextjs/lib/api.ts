import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/v1';

const api = axios.create({ 
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: any) => {
    console.error('API Error:', error.response?.data || error.message);
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
}

export interface Face {
  uuid: string;
  cluster_id: number;
  bounding_box: number[];
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
  date?: string;
  face_uuid?: string;
}

export function getImages(params: ImagesParams): Promise<Image[]> {
  return api.get<Image[]>('/pics', { params }).then((r: AxiosResponse<Image[]>) => r.data);
}

export function getImageDetail(uuid: string): Promise<Image> {
  return api.get<Image>(`/pics/${uuid}`).then((r: AxiosResponse<Image>) => r.data);
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

