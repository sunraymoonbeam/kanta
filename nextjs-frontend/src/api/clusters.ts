const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/v1';

export interface ClusterSample {
  face_id: number;
  sample_blob_url: string;
  sample_bbox: { [k: string]: number };
}

export interface Cluster {
  cluster_id: number;
  face_count: number;
  samples: ClusterSample[];
}

export async function getClusters(eventCode: string, sampleSize: number): Promise<Cluster[]> {
  const qs = new URLSearchParams({ event_code: eventCode, sample_size: String(sampleSize) }).toString();
  const res = await fetch(`${BASE_URL}/clusters?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
