/**
 * Event-related type definitions
 */

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

export interface EventFormData {
  code: string;
  name: string;
  description: string;
  start: string;
  end: string;
}
