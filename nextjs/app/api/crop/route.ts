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
    // For now, return a simple base64 SVG placeholder
    // In a real implementation, you'd use sharp or similar library to crop the actual image
    const svgData = `
      <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="55" fill="#f0f0f0" stroke="#ddd" stroke-width="2"/>
        <text x="60" y="65" text-anchor="middle" fill="#666" font-size="12">Face</text>
      </svg>
    `;
    
    const base64 = `data:image/svg+xml;base64,${Buffer.from(svgData).toString('base64')}`;
    return NextResponse.json(base64, { 
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error cropping image:', error);
    return NextResponse.json({ error: 'Failed to crop image' }, { status: 500 });
  }
}
