'use client';
import { useState } from 'react';
import { getClusters, findSimilarFaces } from '../../lib/api';

export default function PeoplePage() {
  const [eventCode, setEventCode] = useState('');
  const [tab, setTab] = useState<'people' | 'search'>('people');
  const [sampleSize, setSampleSize] = useState(1);
  const [clusters, setClusters] = useState<any[]>([]);
  const [queryFile, setQueryFile] = useState<File>();
  const [results, setResults] = useState<any[]>([]);

  const loadClusters = async () => {
    if (!eventCode) return;
    const data = await getClusters(eventCode, sampleSize);
    setClusters(data);
  };

  const runSearch = async () => {
    if (!eventCode || !queryFile) return;
    const data = await findSimilarFaces(eventCode, queryFile, 'cosine', 5);
    setResults(data);
  };

  return (
    <section>
      <h2>People</h2>
      <input
        placeholder='event code'
        value={eventCode}
        onChange={(e) => setEventCode(e.target.value)}
      />{' '}
      <button onClick={() => setTab('people')}>Identified People</button>{' '}
      <button onClick={() => setTab('search')}>Similarity Search</button>

      {tab === 'people' && (
        <div>
          <label>sample size:</label>
          <input
            type='number'
            value={sampleSize}
            min={1}
            max={5}
            onChange={(e) => setSampleSize(parseInt(e.target.value))}
          />
          <button onClick={loadClusters}>Load</button>
          <ul>
            {clusters.map((c) => (
              <li key={c.cluster_id}>
                Person {c.cluster_id} ({c.face_count} photos)
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'search' && (
        <div>
          <input type='file' onChange={(e) => setQueryFile(e.target.files?.[0])} />
          <button onClick={runSearch} disabled={!queryFile}>Search</button>
          <ul>
            {results.map((r, idx) => (
              <li key={idx}>Person {r.cluster_id} dist {r.distance}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
