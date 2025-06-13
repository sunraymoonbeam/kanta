'use client';
import { useState } from 'react';
import { uploadImage } from '../../lib/api';
import { useEvents } from '../../components/EventContext';

export default function CameraPage() {
  const { selected: eventCode } = useEvents();
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>('');

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
      <input type="file" accept="image/*" onChange={e => {
        const f = e.target.files?.[0];
        setFile(f);
        if (f) setPreview(URL.createObjectURL(f));
      }} />
      {preview && <div><img src={preview} width={250} /></div>}
      <button onClick={handleUpload}>Upload</button>
    </section>
  );
}
