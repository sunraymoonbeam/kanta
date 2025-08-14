import React from 'react';
import { Button } from '../ui/button';
import { Download, MoreVertical } from 'lucide-react';

interface GalleryHeaderProps {
  totalPhotos: number;
  selectedCount: number;
  isSelectionMode: boolean;
  onToggleSelection: () => void;
  onSelectAll: () => void;
  onDownloadSelected: () => void;
}

export function GalleryHeader({
  totalPhotos,
  selectedCount,
  isSelectionMode,
  onToggleSelection,
  onSelectAll,
  onDownloadSelected,
}: GalleryHeaderProps) {
  return (
    <div className="px-3 py-2 border-b border-border bg-background flex-shrink-0">
      <div className="flex items-center justify-between">
        <HeaderInfo 
          totalPhotos={totalPhotos}
          selectedCount={selectedCount}
          isSelectionMode={isSelectionMode}
        />
        <HeaderActions
          isSelectionMode={isSelectionMode}
          selectedCount={selectedCount}
          totalPhotos={totalPhotos}
          onToggleSelection={onToggleSelection}
          onSelectAll={onSelectAll}
          onDownloadSelected={onDownloadSelected}
        />
      </div>
    </div>
  );
}

interface HeaderInfoProps {
  totalPhotos: number;
  selectedCount: number;
  isSelectionMode: boolean;
}

function HeaderInfo({ totalPhotos, selectedCount, isSelectionMode }: HeaderInfoProps) {
  return (
    <div className="flex-1">
      <h1 className="text-base sm:text-lg">Photos</h1>
      <p className="text-xs sm:text-sm text-muted-foreground">
        {isSelectionMode
          ? `${selectedCount} of ${totalPhotos} selected`
          : `${totalPhotos} photos`}
      </p>
    </div>
  );
}

interface HeaderActionsProps {
  isSelectionMode: boolean;
  selectedCount: number;
  totalPhotos: number;
  onToggleSelection: () => void;
  onSelectAll: () => void;
  onDownloadSelected: () => void;
}

function HeaderActions({
  isSelectionMode,
  selectedCount,
  totalPhotos,
  onToggleSelection,
  onSelectAll,
  onDownloadSelected,
}: HeaderActionsProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {isSelectionMode && (
        <>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSelectAll}
            className="text-xs sm:text-sm px-2 sm:px-3"
          >
            {selectedCount === totalPhotos ? 'Deselect' : 'Select All'}
          </Button>
          {selectedCount > 0 && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={onDownloadSelected}
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline ml-1">Download</span>
              <span className="ml-1">({selectedCount})</span>
            </Button>
          )}
        </>
      )}
      <Button
        variant={isSelectionMode ? "default" : "ghost"}
        size="sm"
        onClick={onToggleSelection}
        className="text-xs sm:text-sm px-2 sm:px-3"
      >
        {isSelectionMode ? 'Done' : 'Select'}
      </Button>
      <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-9 sm:h-9">
        <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
      </Button>
    </div>
  );
}