'use client';
import Link from 'next/link';
import { useEvents } from '../../hooks/useEvents';

export default function Header() {
  const { events, selected, setSelected, loading, error } = useEvents();
  
  return (
    <header style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      padding: '1rem',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        maxWidth: '1200px', 
        margin: '0 auto' 
      }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link href="/" style={{ 
            color: '#fff', 
            textDecoration: 'none', 
            fontWeight: 'bold',
            fontSize: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            📸 Kanta
          </Link>
          
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <Link 
              href="/events" 
              style={{ 
                color: '#fff', 
                textDecoration: 'none', 
                padding: '0.5rem 1rem', 
                borderRadius: '6px', 
                transition: 'background 0.2s',
                fontSize: '1rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Events
            </Link>
            <Link 
              href="/gallery/upload" 
              style={{ 
                color: '#fff', 
                textDecoration: 'none', 
                padding: '0.5rem 1rem', 
                borderRadius: '6px', 
                transition: 'background 0.2s',
                fontSize: '1rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Upload
            </Link>
            <Link 
              href="/gallery" 
              style={{ 
                color: '#fff', 
                textDecoration: 'none', 
                padding: '0.5rem 1rem', 
                borderRadius: '6px', 
                transition: 'background 0.2s',
                fontSize: '1rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Gallery
            </Link>
            <Link 
              href="/people" 
              style={{ 
                color: '#fff', 
                textDecoration: 'none', 
                padding: '0.5rem 1rem', 
                borderRadius: '6px', 
                transition: 'background 0.2s',
                fontSize: '1rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              People
            </Link>
          </nav>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {error && (
            <span style={{ 
              color: '#ff6b6b', 
              fontSize: '0.9rem',
              background: 'rgba(255,255,255,0.1)',
              padding: '0.25rem 0.75rem',
              borderRadius: '4px'
            }}>
              ⚠️ {error}
            </span>
          )}
          
          {loading ? (
            <span style={{ color: '#fff', fontSize: '0.9rem' }}>Loading events...</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <label style={{ color: '#fff', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                Selected Event:
              </label>
              <select 
                value={selected} 
                onChange={(e) => setSelected(e.target.value)}
                style={{ 
                  padding: '0.5rem', 
                  borderRadius: '6px', 
                  border: 'none',
                  background: 'rgba(255,255,255,0.95)',
                  minWidth: '180px',
                  fontSize: '0.9rem',
                  fontWeight: '500'
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
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
