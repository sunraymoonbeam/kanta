'use client';
import { useState } from 'react';
import { getImages } from '../../lib/api';

export default function GalleryPage() {
  const [eventCode, setEventCode] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minFaces, setMinFaces] = useState('');
  const [maxFaces, setMaxFaces] = useState('');
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const [images, setImages] = useState<any[]>([]);

  const load = async () => {
    if (!eventCode) return;
    const data = await getImages({
      event_code: eventCode,
      limit,
      offset: (page - 1) * limit,
      date_from: dateFrom ? `${dateFrom}T00:00:00` : undefined,
      date_to: dateTo ? `${dateTo}T23:59:59` : undefined,
      min_faces: minFaces ? parseInt(minFaces) : undefined,
      max_faces: maxFaces ? parseInt(maxFaces) : undefined,
    });
    setImages(Array.isArray(data) ? data : data.images || []);
  };

  return (
    <section>
      <h2>Gallery</h2>
      <div>
        <input placeholder='event code' value={eventCode} onChange={e=>setEventCode(e.target.value)} />
        <input type='date' value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
        <input type='date' value={dateTo} onChange={e=>setDateTo(e.target.value)} />
        <input className='small-input' placeholder='min faces' value={minFaces} onChange={e=>setMinFaces(e.target.value)} />
        <input className='small-input' placeholder='max faces' value={maxFaces} onChange={e=>setMaxFaces(e.target.value)} />
        <input className='small-input' type='number' value={limit} onChange={e=>setLimit(parseInt(e.target.value))} />
        <input className='small-input' type='number' value={page} onChange={e=>setPage(parseInt(e.target.value))} />
        <button onClick={load}>Load</button>
      </div>
      <div className='gallery-grid'>
        {images.map(img => (
          <img key={img.uuid} src={img.azure_blob_url} />
        ))}
      </div>
    </section>
  );
}
