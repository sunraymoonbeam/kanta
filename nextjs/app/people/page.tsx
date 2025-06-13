'use client';
import { useState, useEffect } from 'react';
import { getClusters, findSimilarFaces } from '../../lib/api';
import { useEvents } from '../../components/EventContext';

export default function PeoplePage() {
  const { selected: eventCode } = useEvents();
  const [tab, setTab] = useState<'people' | 'search'>('people');
  const [sampleSize, setSampleSize] = useState(1);
  const [clusters, setClusters] = useState<any[]>([]);
  const [queryFile, setQueryFile] = useState<File>();
  const [results, setResults] = useState<any[]>([]);

  const loadClusters = async () => {
    if (!eventCode) return;
    const data: any = await getClusters(eventCode, sampleSize);
    const list = Array.isArray(data) ? data : data?.clusters || [];
    setClusters(list);
  };

  const runSearch = async () => {
    if (!eventCode || !queryFile) return;
    const data = await findSimilarFaces(eventCode, queryFile, 'cosine', 5);
    setResults(data);
  };

  useEffect(() => {
    if (tab === 'people' && eventCode) {
      loadClusters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventCode, tab]);

  return (
    <section>
      <h2>People</h2>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {clusters.map((c) => (
              <div key={c.cluster_id} style={{ textAlign: 'center' }}>
                {c.samples?.[0]?.sample_blob_url && (
                  <img
                    src={c.samples[0].sample_blob_url}
                    width={80}
                    height={80}
                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                  />
                )}
                <div>Person {c.cluster_id}</div>
                <small>({c.face_count} photos)</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'search' && (
        <div>
          <input type='file' onChange={(e) => setQueryFile(e.target.files?.[0])} />
          <button onClick={runSearch} disabled={!queryFile}>Search</button>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
            {results.map((r, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                {r.azure_blob_url && (
                  <img src={r.azure_blob_url} width={100} height={100} style={{ borderRadius: '8px', objectFit: 'cover' }} />
                )}
                <div>Person {r.cluster_id}</div>
                <small>distance {r.distance.toFixed(2)}</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
