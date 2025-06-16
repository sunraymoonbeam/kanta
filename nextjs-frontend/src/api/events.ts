const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/v1';

export interface Event {
  code: string;
  name: string;
  description?: string | null;
  start_date_time: string;
  end_date_time: string;
  created_at?: string;
  running?: boolean;
  event_image_url?: string | null;
  qr_code_image_url?: string | null;
}

export interface CreateEventInput {
  event_code: string;
  name?: string;
  description?: string;
  start_date_time?: string;
  end_date_time?: string;
}

export interface UpdateEventInput {
  event_code: string;
  name?: string;
  description?: string;
  start_date_time?: string;
  end_date_time?: string;
}

export async function getEvents(): Promise<Event[]> {
  const res = await fetch(`${BASE_URL}/events`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.events || [];
}

export async function createEvent(input: CreateEventInput): Promise<void> {
  const res = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function updateEvent(input: UpdateEventInput): Promise<void> {
  const res = await fetch(`${BASE_URL}/events`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function deleteEvent(eventCode: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/events`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_code: eventCode }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function uploadEventImage(eventCode: string, file: File): Promise<void> {
  const form = new FormData();
  form.append('image_file', file);
  const res = await fetch(`${BASE_URL}/events/image/${eventCode}`, {
    method: 'PUT',
    body: form,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
