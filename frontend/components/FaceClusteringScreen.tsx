import React, { useState, useEffect, useCallback } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MoreVertical, RefreshCw, AlertCircle, Users } from 'lucide-react';
import { Button } from './ui/button';
import { eventsApi, handleApiError, type ClusterInfo } from '../lib/api';

// Mock face clustering data
const mockFaceClusters = [
  {
    id: 1,
    personName: 'Person 1',
    faceCount: 12,
    faces: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face&sat=20',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face&blur=1',
    ]
  },
  {
    id: 2,
    personName: 'Person 2',
    faceCount: 8,
    faces: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face&sat=20',
    ]
  },
  {
    id: 3,
    personName: 'Person 3',
    faceCount: 15,
    faces: [
      'https://images.unsplash.com/photo-1494790108755-2616b612b639?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1494790108755-2616b612b639?w=100&h=100&fit=crop&crop=face&sat=20',
      'https://images.unsplash.com/photo-1494790108755-2616b612b639?w=100&h=100&fit=crop&crop=face&blur=1',
    ]
  },
  {
    id: 4,
    personName: 'Person 4',
    faceCount: 22,
    faces: [
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop&crop=face&sat=20',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop&crop=face&blur=1',
    ]
  },
  {
    id: 5,
    personName: 'Person 5',
    faceCount: 6,
    faces: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face&sat=20',
    ]
  },
  {
    id: 6,
    personName: 'Person 6',
    faceCount: 18,
    faces: [
      'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=100&h=100&fit=crop&crop=face&sat=20',
      'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=100&h=100&fit=crop&crop=face&blur=1',
    ]
  },
  {
    id: 7,
    personName: 'Person 7',
    faceCount: 11,
    faces: [
      'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=100&h=100&fit=crop&crop=face&sat=20',
    ]
  },
  {
    id: 8,
    personName: 'Person 8',
    faceCount: 8,
    faces: [
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face&sat=20',
    ]
  }
];

const totalFaces = mockFaceClusters.reduce((sum, cluster) => sum + cluster.faceCount, 0);

interface FaceClusteringScreenProps {
  eventCode: string;
}

export function FaceClusteringScreen({ eventCode }: FaceClusteringScreenProps) {
  // Backend integration state
  const [backendClusters, setBackendClusters] = useState<ClusterInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [useMockData, setUseMockData] = useState(false);

  // Fetch clusters from backend
  const fetchClusters = useCallback(async () => {
    if (!eventCode) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const clusters = await eventsApi.getClusters(eventCode);
      setBackendClusters(clusters);
      setUseMockData(false);
    } catch (err) {
      console.error('Failed to fetch clusters:', err);
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      // Fall back to mock data if backend is not available
      setUseMockData(true);
    } finally {
      setIsLoading(false);
    }
  }, [eventCode]);

  // Load clusters on component mount and when event code changes
  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  // Use either backend data or mock data
  const displayClusters = useMockData ? mockFaceClusters : backendClusters.map(cluster => ({
    id: cluster.cluster_id,
    personName: `Person ${cluster.cluster_id}`,
    faceCount: cluster.face_count,
    faces: cluster.samples?.slice(0, 3).map(sample => sample.sample_blob_url) || []
  }));

  const totalFacesCount = displayClusters.reduce((sum, cluster) => sum + cluster.faceCount, 0);

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-background">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg">Faces</h1>
              {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-sm text-muted-foreground">
              {error ? (
                <span className="text-red-500">{error}</span>
              ) : (
                `${totalFacesCount} faces detected${useMockData ? ' (demo)' : ''}`
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={fetchClusters}
              disabled={isLoading}
              title="Refresh clusters"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Face Count Banner */}
      <div className="px-4 py-3 bg-accent/50">
        <div className="text-center">
          <div className="text-2xl font-medium text-foreground">{totalFacesCount}</div>
          <div className="text-sm text-muted-foreground">faces found</div>
        </div>
      </div>

      {/* Face Clusters */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && !useMockData && (
          <div className="flex items-center justify-center h-32 text-center">
            <div className="text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={fetchClusters}>
                Try Again
              </Button>
            </div>
          </div>
        )}
        {displayClusters.length === 0 && !isLoading && !error && (
          <div className="flex items-center justify-center h-32 text-center text-muted-foreground">
            <div>
              <Users className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">No face clusters yet</p>
              <p className="text-xs">Faces will appear here after photos are processed</p>
            </div>
          </div>
        )}
        <div className="space-y-6">
          {displayClusters.map((cluster) => (
            <div key={cluster.id} className="space-y-3">
              {/* Cluster Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{cluster.personName}</p>
                  <p className="text-xs text-muted-foreground">{cluster.faceCount} photos</p>
                </div>
              </div>

              {/* Face Thumbnails */}
              <div className="flex items-center space-x-2">
                {cluster.faces.map((faceUrl, index) => (
                  <div key={index} className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border bg-muted">
                      <ImageWithFallback
                        src={faceUrl}
                        alt={`${cluster.personName} face ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ))}
                
                {/* Show more indicator if there are more faces */}
                {cluster.faceCount > cluster.faces.length && (
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-border bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">
                      +{cluster.faceCount - cluster.faces.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}