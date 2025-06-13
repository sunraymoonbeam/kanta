/**
 * People and face clustering type definitions
 */

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

export interface CyclingFaceState {
  [clusterId: number]: number; // Current sample index for each cluster
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}
