'use client';
import { useEffect, useState } from 'react';
import { getImages } from '../../lib/api';
import { useEvents } from '../../components/EventContext';

export default function GalleryPage() {
  const { selected: eventCode } = useEvents();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minFaces, setMinFaces] = useState('');
  const [maxFaces, setMaxFaces] = useState('');
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const [images, setImages] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventCode]);

  return (
    <section>
      <h2>Gallery</h2>
      <div>
        <input type='date' value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
        <input type='date' value={dateTo} onChange={e=>setDateTo(e.target.value)} />
        <input className='small-input' placeholder='min faces' value={minFaces} onChange={e=>setMinFaces(e.target.value)} />
        <input className='small-input' placeholder='max faces' value={maxFaces} onChange={e=>setMaxFaces(e.target.value)} />
        <input className='small-input' type='number' value={limit} onChange={e=>setLimit(parseInt(e.target.value))} />
        <input className='small-input' type='number' value={page} onChange={e=>setPage(parseInt(e.target.value))} />
        <button onClick={load}>Load</button>
        {selectedIds.length > 0 && (
          <span style={{ marginLeft: '1rem' }}>{selectedIds.length} selected</span>
        )}
      </div>
      <div className='gallery-grid'>
        {images.map(img => (
          <div key={img.uuid} style={{ position: 'relative' }}>
            <img src={img.azure_blob_url} />
            <input
              type='checkbox'
              style={{ position: 'absolute', top: 4, left: 4 }}
              checked={selectedIds.includes(img.uuid)}
              onChange={(e) => {
                setSelectedIds((prev) =>
                  e.target.checked
                    ? [...prev, img.uuid]
                    : prev.filter((id) => id !== img.uuid)
                );
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
