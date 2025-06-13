import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const x = parseInt(searchParams.get('x') || '0');
  const y = parseInt(searchParams.get('y') || '0');
  const width = parseInt(searchParams.get('width') || '100');
  const height = parseInt(searchParams.get('height') || '100');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // Fetch the image from the URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const imageBuffer = await response.arrayBuffer();
    const sharpImage = sharp(Buffer.from(imageBuffer));
    
    // Get image metadata to check dimensions
    const metadata = await sharpImage.metadata();
    const imgWidth = metadata.width || 0;
    const imgHeight = metadata.height || 0;
    
    // Calculate cropping parameters with padding
    const padding = 0.3;
    const padX = Math.floor(width * padding);
    const padY = Math.floor(height * padding);
    
    // Calculate crop area with bounds checking
    const cropX = Math.max(0, x - padX);
    const cropY = Math.max(0, y - padY);
    const cropWidth = Math.min(width + 2 * padX, imgWidth - cropX);
    const cropHeight = Math.min(height + 2 * padY, imgHeight - cropY);
    
    // Ensure crop dimensions are positive
    if (cropWidth <= 0 || cropHeight <= 0) {
      throw new Error('Invalid crop dimensions');
    }

    // Use sharp to crop and resize the image
    const croppedImageBuffer = await sharpImage
      .extract({
        left: cropX,
        top: cropY,
        width: cropWidth,
        height: cropHeight
      })
      .resize(150, 150, { 
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toBuffer();

    // Convert to base64
    const base64 = `data:image/png;base64,${croppedImageBuffer.toString('base64')}`;
    
    return NextResponse.json(base64, { 
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error cropping image:', error);
    
    // Fallback to a simple placeholder if anything fails
    const svgData = `
      <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
        <circle cx="75" cy="75" r="70" fill="#f0f0f0" stroke="#ddd" stroke-width="2"/>
        <text x="75" y="80" text-anchor="middle" fill="#666" font-size="14">Face</text>
      </svg>
    `;
    
    const base64 = `data:image/svg+xml;base64,${Buffer.from(svgData).toString('base64')}`;
    return NextResponse.json(base64, { 
      headers: { 'Content-Type': 'application/json' },
    });
  }
}