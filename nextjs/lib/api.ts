import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/v1';

const api = axios.create({ baseURL: API_BASE_URL });

export interface EventPayload {
  event_code: string;
  name?: string;
  description?: string;
  start_date_time: string;
  end_date_time: string;
}

export function getEvents(params?: { event_code?: string }): Promise<any[]> {
  return api.get('/events', { params }).then(r => r.data.events);
}

export function createEvent(payload: EventPayload): Promise<any> {
  return api.post('/events', payload).then(r => r.data);
}

export function updateEvent(payload: EventPayload): Promise<any> {
  return api.put('/events', payload).then(r => r.data);
}

export function deleteEvent(event_code: string): Promise<void> {
  return api.delete('/events', { data: { event_code } }).then(() => {});
}

export function uploadEventImage(event_code: string, file: File): Promise<any> {
  const form = new FormData();
  form.append('image_file', file);
  return api.put(`/events/image/${event_code}`, form).then(r => r.data);
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

export function getImages(params: ImagesParams): Promise<any> {
  return api.get('/pics', { params }).then(r => r.data);
}

export function getImageDetail(uuid: string): Promise<any> {
  return api.get(`/pics/${uuid}`).then(r => r.data);
}

export function uploadImage(event_code: string, file: File): Promise<any> {
  const form = new FormData();
  form.append('image_file', file);
  return api.post(`/pics/${event_code}`, form).then(r => r.data);
}

export function deleteImage(event_code: string, uuid: string): Promise<void> {
  return api.delete(`/pics/${event_code}/${uuid}`).then(() => {});
}

export function getClusters(event_code: string, sample_size = 1): Promise<any[]> {
  return api.get('/clusters', { params: { event_code, sample_size } }).then(r => r.data);
}

export function findSimilarFaces(event_code: string, file: File, metric = 'cosine', top_k = 10): Promise<any[]> {
  const form = new FormData();
  form.append('image', file);
  return api.post('/find-similar', form, { params: { event_code, metric, top_k } }).then(r => r.data);
}

