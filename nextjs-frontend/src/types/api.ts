/**
 * API-related type definitions
 */

export interface ApiError {
  detail: string;
  status: number;
}

export interface UploadProgress {
  [key: string]: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}
