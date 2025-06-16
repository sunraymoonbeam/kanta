'use client';
import Link from 'next/link';
import { useEvents } from '../events';

export default function Navbar() {
  const { events, selected, setSelected, loading, error } = useEvents();
  
  return (
    <nav style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      padding: '1rem',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link href="/" style={{ 
            color: '#fff', 
            textDecoration: 'none', 
            fontWeight: 'bold',
            fontSize: '1.2rem'
          }}>
            📸 Kanta
          </Link>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/events" style={{ color: '#fff', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: '4px', transition: 'background 0.2s' }}>Events</Link>
            <Link href="/camera" style={{ color: '#fff', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: '4px', transition: 'background 0.2s' }}>Camera</Link>
            <Link href="/gallery" style={{ color: '#fff', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: '4px', transition: 'background 0.2s' }}>Gallery</Link>
            <Link href="/people" style={{ color: '#fff', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: '4px', transition: 'background 0.2s' }}>People</Link>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {error && (
            <span style={{ color: '#ff6b6b', fontSize: '0.9rem' }}>⚠️ {error}</span>
          )}
          {loading ? (
            <span style={{ color: '#fff' }}>Loading events...</span>
          ) : (
            <select 
              value={selected} 
              onChange={(e) => setSelected(e.target.value)}
              style={{ 
                padding: '0.5rem', 
                borderRadius: '4px', 
                border: 'none',
                background: 'rgba(255,255,255,0.9)',
                minWidth: '150px'
              }}
            >
              {events.length === 0 ? (
                <option value="">No events available</option>
              ) : (
                events.map((e) => (
                  <option key={e.code} value={e.code}>
                    {e.name || e.code}
                  </option>
                ))
              )}
            </select>
          )}
        </div>
      </div>
    </nav>
  );
}
