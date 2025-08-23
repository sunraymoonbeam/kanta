import { fixAzuriteUrlsInObject } from './utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface EventInfo {
  code: string;
  name?: string;
  description?: string;
  running: boolean;
  start_date_time?: string;
  end_date_time?: string;
  created_at?: string;
  qr_code_image_url?: string;
}

export interface EventsResponse {
  events: EventInfo[];
}

export interface CreateEventRequest {
  event_code?: string;
  name?: string;
  description?: string;
  start_date_time?: string;
  end_date_time?: string;
}

export type CreateEventInput = CreateEventRequest;

export interface UpdateEventRequest extends CreateEventRequest {
  running?: boolean;
}

// Image API types based on backend schemas
export interface UploadImageResponse {
  uuid: string;
  blob_url: string;
  faces: number;
  boxes: number[][];
  embeddings: number[][];
}

export interface ImageListItem {
  uuid: string;
  azure_blob_url: string;
  file_extension: string;
  faces: number;
  created_at: string;
  last_modified: string;
}

export interface FaceSummary {
  face_id: number;
  cluster_id: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ImageDetailResponse {
  image: ImageListItem;
  faces: FaceSummary[];
}

// Clusters API types
export interface ClusterSample {
  face_id: number;
  sample_blob_url: string;
  sample_bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ClusterInfo {
  cluster_id: number;
  face_count: number;
  samples: ClusterSample[];
}

class EventsApi {
  private async fetchApi<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      let errorMessage = response.statusText;
      
      // Handle different error detail formats from backend
      if (errorData?.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail) && errorData.detail.length > 0) {
          // Handle validation errors array format
          errorMessage = errorData.detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join(', ');
        } else if (typeof errorData.detail === 'object') {
          errorMessage = JSON.stringify(errorData.detail);
        }
      }
      
      throw new ApiError(
        response.status,
        errorMessage
      );
    }

    return response.json();
  }

  async getEvents(): Promise<EventsResponse> {
    const response = await this.fetchApi<EventsResponse>('/events');
    return fixAzuriteUrlsInObject(response);
  }

  async getEvent(code: string): Promise<EventInfo> {
    const response = await this.fetchApi<EventsResponse>(`/events?event_code=${code}`);
    const fixedResponse = fixAzuriteUrlsInObject(response);
    if (fixedResponse.events && fixedResponse.events.length > 0) {
      return fixedResponse.events[0];
    }
    throw new ApiError(404, 'Event not found');
  }

  async createEvent(data: CreateEventRequest): Promise<EventInfo> {
    const response = await this.fetchApi<EventInfo>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return fixAzuriteUrlsInObject(response);
  }

  async updateEvent(code: string, data: UpdateEventRequest): Promise<EventInfo> {
    const response = await this.fetchApi<EventInfo>('/events', {
      method: 'PUT',
      body: JSON.stringify({ ...data, event_code: code }),
    });
    return fixAzuriteUrlsInObject(response);
  }

  async deleteEvent(code: string): Promise<void> {
    await this.fetchApi<void>('/events', {
      method: 'DELETE',
      body: JSON.stringify({ event_code: code }),
    });
  }

  // Image API methods
  async uploadImage(eventCode: string, imageFile: File): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append('image_file', imageFile);

    const response = await fetch(`${API_BASE_URL}/pics/${eventCode}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      let errorMessage = response.statusText;
      
      // Handle different error detail formats from backend
      if (errorData?.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail) && errorData.detail.length > 0) {
          // Handle validation errors array format
          errorMessage = errorData.detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join(', ');
        } else if (typeof errorData.detail === 'object') {
          errorMessage = JSON.stringify(errorData.detail);
        }
      }
      
      throw new ApiError(
        response.status,
        errorMessage
      );
    }

    const result = await response.json();
    return fixAzuriteUrlsInObject(result);
  }

  async getImages(
    eventCode: string,
    options?: {
      limit?: number;
      offset?: number;
      date_from?: string;
      date_to?: string;
      min_faces?: number;
      max_faces?: number;
      cluster_list_id?: number[];
    }
  ): Promise<ImageListItem[]> {
    const params = new URLSearchParams({ event_code: eventCode });
    
    if (options?.limit !== undefined) params.set('limit', options.limit.toString());
    if (options?.offset !== undefined) params.set('offset', options.offset.toString());
    if (options?.date_from) params.set('date_from', options.date_from);
    if (options?.date_to) params.set('date_to', options.date_to);
    if (options?.min_faces !== undefined) params.set('min_faces', options.min_faces.toString());
    if (options?.max_faces !== undefined) params.set('max_faces', options.max_faces.toString());
    if (options?.cluster_list_id) {
      options.cluster_list_id.forEach(id => params.append('cluster_list_id', id.toString()));
    }

    const response = await this.fetchApi<ImageListItem[]>(`/pics?${params.toString()}`);
    return fixAzuriteUrlsInObject(response);
  }

  async getImageDetail(imageUuid: string): Promise<ImageDetailResponse> {
    const response = await this.fetchApi<ImageDetailResponse>(`/pics/${imageUuid}`);
    return fixAzuriteUrlsInObject(response);
  }

  async deleteImage(eventCode: string, imageUuid: string): Promise<void> {
    await this.fetchApi<void>(`/pics/${eventCode}/${imageUuid}`, {
      method: 'DELETE',
    });
  }

  async getClusters(eventCode: string, sampleSize: number = 5): Promise<ClusterInfo[]> {
    const response = await this.fetchApi<ClusterInfo[]>(`/clusters?event_code=${eventCode}&sample_size=${sampleSize}`);
    return fixAzuriteUrlsInObject(response);
  }
}

class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

export const eventsApi = new EventsApi();

export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return 'Event not found';
    }
    if (error.status === 422) {
      // Validation error - show the actual validation message
      return error.detail || 'Invalid request data';
    }
    if (error.status === 500) {
      return 'Server error. Please try again later.';
    }
    return error.detail || 'An error occurred';
  }
  
  if (error instanceof Error) {
    if (error.message.includes('fetch')) {
      return 'Unable to connect to server. Please check your internet connection.';
    }
    return error.message;
  }
  
  return 'An unexpected error occurred';
}