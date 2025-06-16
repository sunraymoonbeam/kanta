const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/v1';

export interface Image {
  uuid: string;
  azure_blob_url: string;
  file_extension: string;
  faces: number;
  created_at: string;
  last_modified: string;
}

export interface ImageDetail {
  image: Image;
  faces: {
    face_id: number;
    cluster_id: number;
    bbox: { [k: string]: number };
  }[];
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

export interface ImageListResponse {
  images: Image[];
  total_count: number;
}

export async function getImages(params: ImagesParams): Promise<ImageListResponse> {
  const qs = new URLSearchParams(params as any).toString();
  const res = await fetch(`${BASE_URL}/pics?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getImageDetail(uuid: string): Promise<ImageDetail> {
  const res = await fetch(`${BASE_URL}/pics/${uuid}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function deleteImage(eventCode: string, uuid: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/pics/${eventCode}/${uuid}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function uploadImage(eventCode: string, file: File): Promise<void> {
  const form = new FormData();
  form.append('image_file', file);
  const res = await fetch(`${BASE_URL}/pics/${eventCode}`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
