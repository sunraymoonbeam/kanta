import { useState, useCallback } from 'react';
import { Cluster } from '../types/people';
import { getClusters } from '../lib/api';

interface UsePeopleReturn {
  clusters: Cluster[];
  loading: boolean;
  error: string | null;
  loadClusters: (eventCode: string, sampleSize?: number, forceRefresh?: boolean) => Promise<void>;
  clearClusters: () => void;
  getClusterById: (clusterId: number) => Cluster | undefined;
}

export function usePeople(): UsePeopleReturn {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClusters = useCallback(async (
    eventCode: string, 
    sampleSize: number = 5,
    forceRefresh: boolean = false
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const clustersData = await getClusters(eventCode, sampleSize);
      setClusters(clustersData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load people clusters';
      setError(errorMessage);
      console.error('Error loading clusters:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearClusters = useCallback(() => {
    setClusters([]);
    setError(null);
  }, []);

  const getClusterById = useCallback((clusterId: number): Cluster | undefined => {
    return clusters.find(cluster => cluster.cluster_id === clusterId);
  }, [clusters]);

  return {
    clusters,
    loading,
    error,
    loadClusters,
    clearClusters,
    getClusterById
  };
}
