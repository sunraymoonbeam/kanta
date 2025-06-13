'use client';
import { useState } from 'react';
import { uploadImage } from '../../lib/api';
import { useEvents } from '../../components/EventContext';

export default function CameraPage() {
  const { selected: eventCode } = useEvents();
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>('');
  const [filter, setFilter] = useState('Normal');

  const filterStyle: Record<string, string> = {
    'Normal': 'none',
    'Black & White': 'grayscale(100%)',
    'Warm': 'sepia(0.3) saturate(120%)',
    'Cool': 'contrast(90%) hue-rotate(180deg)',
    'Sepia': 'sepia(100%)',
  };

  const handleUpload = async () => {
    if (file && eventCode) {
      await uploadImage(eventCode, file);
      alert('Uploaded');
      setFile(undefined);
      setPreview('');
    }
  };

  return (
    <section>
      <h2>Upload Photo</h2>
      <input type="file" accept="image/*" capture="environment" onChange={e => {
        const f = e.target.files?.[0];
        setFile(f);
        if (f) setPreview(URL.createObjectURL(f));
      }} />
      <div>
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          {['Normal','Black & White','Warm','Cool','Sepia'].map(f => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </div>
      {preview && (
        <div>
          <img src={preview} width={250} style={{ filter: filterStyle[filter] }} />
        </div>
      )}
      <button onClick={handleUpload}>Upload</button>
    </section>
  );
}
