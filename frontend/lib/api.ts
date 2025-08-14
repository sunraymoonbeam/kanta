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
      throw new ApiError(
        response.status,
        errorData?.detail || response.statusText
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

  async uploadPhoto(eventCode: string, photo: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', photo);

    const response = await fetch(`${API_BASE_URL}/events/${eventCode}/photos`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ApiError(
        response.status,
        errorData?.detail || response.statusText
      );
    }

    const result = await response.json();
    return fixAzuriteUrlsInObject(result);
  }

  async getEventPhotos(eventCode: string): Promise<any> {
    const response = await this.fetchApi<any>(`/events/${eventCode}/photos`);
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