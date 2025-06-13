// Frontend face cropping utility to replicate the Python crop_and_encode_face functionality

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function cropAndEncodeFace(
  imageUrl: string,
  bbox: BoundingBox,
  targetSize: [number, number] = [60, 60],
  padXRatio: number = 0.3,
  padYRatio: number = 0.3
): Promise<string | null> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const imageBlob = await response.blob();
    
    // Create an image element
    const img = new Image();
    const imageLoadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
    
    img.src = URL.createObjectURL(imageBlob);
    await imageLoadPromise;
    
    // Create a canvas for cropping
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Calculate padding in pixels
    const padXPixels = Math.floor(bbox.width * padXRatio);
    const padYPixels = Math.floor(bbox.height * padYRatio);
    
    // Calculate expanded bounding box, ensuring it's within image bounds
    const x1 = Math.max(0, bbox.x - padXPixels);
    const y1 = Math.max(0, bbox.y - padYPixels);
    const x2 = Math.min(img.width, bbox.x + bbox.width + padXPixels);
    const y2 = Math.min(img.height, bbox.y + bbox.height + padYPixels);
    
    // Calculate crop dimensions
    const cropWidth = x2 - x1;
    const cropHeight = y2 - y1;
    
    // Set canvas size to target size
    canvas.width = targetSize[0];
    canvas.height = targetSize[1];
    
    // Calculate scale to fit the cropped area into target size while maintaining aspect ratio
    const scaleX = targetSize[0] / cropWidth;
    const scaleY = targetSize[1] / cropHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate final dimensions after scaling
    const finalWidth = cropWidth * scale;
    const finalHeight = cropHeight * scale;
    
    // Calculate positioning to center the image
    const offsetX = (targetSize[0] - finalWidth) / 2;
    const offsetY = (targetSize[1] - finalHeight) / 2;
    
    // Fill canvas with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, targetSize[0], targetSize[1]);
    
    // Draw the cropped and scaled image
    ctx.drawImage(
      img,
      x1, y1, cropWidth, cropHeight,  // Source rectangle (crop area)
      offsetX, offsetY, finalWidth, finalHeight  // Destination rectangle (scaled and centered)
    );
    
    // Convert to base64
    const dataUrl = canvas.toDataURL('image/png');
    
    // Clean up
    URL.revokeObjectURL(img.src);
    
    return dataUrl;
    
  } catch (error) {
    console.error('Failed to crop face:', error);
    return null;
  }
}

export async function fetchImageBytesFromUrl(url: string, timeout: number = 15000): Promise<ArrayBuffer | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.arrayBuffer();
  } catch (error) {
    console.error('Failed to fetch image bytes:', error);
    return null;
  }
}
