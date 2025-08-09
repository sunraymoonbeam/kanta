import React from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MoreVertical } from 'lucide-react';
import { Button } from './ui/button';

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

export function FaceClusteringScreen() {
  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg">Faces</h1>
            <p className="text-sm text-muted-foreground">{totalFaces} faces detected</p>
          </div>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Face Count Banner */}
      <div className="px-4 py-3 bg-accent/50">
        <div className="text-center">
          <div className="text-2xl font-medium text-foreground">{totalFaces}</div>
          <div className="text-sm text-muted-foreground">faces found</div>
        </div>
      </div>

      {/* Face Clusters */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {mockFaceClusters.map((cluster) => (
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