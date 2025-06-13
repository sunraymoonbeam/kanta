'use client';
import { useState } from 'react';
import { uploadImage } from '../../lib/api';

export default function CameraPage() {
  const [file, setFile] = useState<File>();
  const [eventCode, setEventCode] = useState('');

  const handleUpload = async () => {
    if (file && eventCode) {
      await uploadImage(eventCode, file);
      alert('Uploaded');
    }
  };

  return (
    <section>
      <h2>Upload Photo</h2>
      <input placeholder="event code" value={eventCode} onChange={e => setEventCode(e.target.value)} />
      <input type="file" onChange={e => setFile(e.target.files?.[0])} />
      <button onClick={handleUpload}>Upload</button>
    </section>
  );
}
