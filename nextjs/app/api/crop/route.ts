import { NextRequest, NextResponse } from 'next/server';

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
    // For now, let's use a more reliable placeholder approach
    // In production, you'd want to use a server-side image processing library like Sharp
    
    // Calculate cropping parameters with padding
    const padding = 0.3;
    const padX = width * padding;
    const padY = height * padding;
    
    const cropX = Math.max(0, x - padX);
    const cropY = Math.max(0, y - padY);
    const cropWidth = width + 2 * padX;
    const cropHeight = height + 2 * padY;

    // For now, create a more sophisticated placeholder that includes the actual image URL
    // This could be enhanced to do actual server-side cropping
    const svgData = `
      <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="faceClip">
            <circle cx="75" cy="75" r="70"/>
          </clipPath>
          <pattern id="imagePattern" patternUnits="userSpaceOnUse" width="150" height="150">
            <image href="${url}" 
                   x="${-cropX/cropWidth * 150}" 
                   y="${-cropY/cropHeight * 150}" 
                   width="${150 * (cropWidth > 0 ? 1 : 1)}" 
                   height="${150 * (cropHeight > 0 ? 1 : 1)}" 
                   preserveAspectRatio="xMidYMid slice"/>
          </pattern>
        </defs>
        <circle cx="75" cy="75" r="70" fill="url(#imagePattern)" clip-path="url(#faceClip)" stroke="#ddd" stroke-width="2"/>
        <circle cx="75" cy="75" r="70" fill="none" stroke="#fff" stroke-width="1"/>
      </svg>
    `;
    
    const base64 = `data:image/svg+xml;base64,${Buffer.from(svgData).toString('base64')}`;
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
