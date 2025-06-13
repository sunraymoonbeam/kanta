/**
 * Image and gallery-related type definitions
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Face {
  face_id: number;
  cluster_id: number;
  bbox: BoundingBox;
}

export interface Image {
  uuid: string;
  azure_blob_url: string;
  file_extension: string;
  faces: number;
  created_at: string;
  last_modified: string;
  filename?: string;
  url?: string;
  thumbnail_url?: string;
  upload_date_time?: string;
  face_details?: Face[];
}

export interface ImageDetail {
  image: Image;
  faces: Face[];
}

export interface ImagesResponse {
  images: Image[];
  total_count: number;
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

export interface CapturedShot {
  id: string;
  dataUrl: string;
  file: File;
  filter: string;
  timestamp: number;
}

export type ImageFilter = 
  | 'Normal'
  | 'Black & White'
  | 'Warm'
  | 'Cool'
  | 'Sepia'
  | 'Vintage'
  | 'Dramatic';
