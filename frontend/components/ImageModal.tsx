import React from 'react';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from './ui/dialog';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Button } from './ui/button';
import { Download } from 'lucide-react';

export interface PhotoData {
  id: number;
  uuid?: string;
  url: string;
  faces?: Array<{
    id: number;
    url: string;
    confidence?: number;
  }>;
}

export interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: PhotoData | null;
}

export function ImageModal({ isOpen, onClose, photo }: ImageModalProps) {
  if (!photo) return null;

  const handleDownload = () => {
    // Placeholder functionality - in a real app, this would trigger actual download
    console.log(`Downloading image ${photo.id}:`, photo.url);
    // You could implement actual download by creating a temporary link
    // const link = document.createElement('a');
    // link.href = photo.url;
    // link.download = `photo-${photo.id}.jpg`;
    // link.click();
  };

  // Get higher resolution version of the image for modal
  const highResUrl = photo.url.replace('w=300&h=300', 'w=800&h=800');

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="max-w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl">
      <DialogHeader onClose={onClose}>
        <h2 className="text-lg font-semibold">Photo {photo.id}</h2>
      </DialogHeader>
      
      <DialogContent className="p-0 max-h-[85vh] overflow-y-auto">
        <div className="flex flex-col space-y-4 p-4">
          {/* Main Image */}
          <div className="w-full">
            <div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center" style={{ maxHeight: '40vh' }}>
              <ImageWithFallback
                src={highResUrl}
                alt={`Photo ${photo.id}`}
                className="w-full h-full object-contain"
                style={{ maxHeight: '40vh' }}
              />
            </div>
          </div>
          
          {/* Faces section */}
          <div className="w-full space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Identified Faces {photo.faces?.length ? `(${photo.faces.length})` : ''}
              </h3>
              
              {photo.faces && photo.faces.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {photo.faces.map((face) => (
                    <div key={face.id} className="relative">
                      <ImageWithFallback
                        src={face.url}
                        alt={`Face ${face.id}`}
                        className="w-full aspect-square object-cover rounded-md"
                      />
                      {face.confidence && (
                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">
                          {Math.round(face.confidence * 100)}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed border-border rounded-lg">
                  No faces detected in this image
                </div>
              )}
            </div>
            
            {/* Image Info */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Image ID:</span>
                <span>{photo.id}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      
      <DialogFooter className="flex-row gap-2 p-4">
        <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
          Close
        </Button>
        <Button onClick={handleDownload} className="flex-1 sm:flex-none">
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </DialogFooter>
    </Dialog>
  );
}