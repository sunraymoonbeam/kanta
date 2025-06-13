import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import axios from 'axios';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const x = parseInt(searchParams.get('x') || '0', 10);
  const y = parseInt(searchParams.get('y') || '0', 10);
  const width = parseInt(searchParams.get('width') || '0', 10);
  const height = parseInt(searchParams.get('height') || '0', 10);
  const size = parseInt(searchParams.get('size') || '120', 10);
  const padXRatio = parseFloat(searchParams.get('padx') || '0.15');
  const padYRatio = parseFloat(searchParams.get('pady') || '0.15');

  if (!url) {
    return new NextResponse('Missing url', { status: 400 });
  }

  try {
    const resp = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
    const imgBuffer = Buffer.from(resp.data);

    const padX = Math.round(width * padXRatio);
    const padY = Math.round(height * padYRatio);
    const left = Math.max(0, x - padX);
    const top = Math.max(0, y - padY);
    const cropWidth = width + padX * 2;
    const cropHeight = height + padY * 2;

    const cropped = await sharp(imgBuffer)
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .png()
      .toBuffer();

    const base64 = cropped.toString('base64');
    return new NextResponse(`data:image/png;base64,${base64}`);
  } catch (err) {
    console.error('Crop API error:', err);
    return new NextResponse('Error', { status: 500 });
  }
}
