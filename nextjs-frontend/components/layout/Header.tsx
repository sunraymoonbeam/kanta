'use client';
import Link from 'next/link';
import { useEvents } from '../../hooks/useEvents';

export default function Header() {
  const { events, selected, setSelected, loading, error } = useEvents();
  
  return (
    <header style={{ 
      background: '#ffffff', 
      padding: '1rem', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      borderBottom: '1px solid #dbdbdb',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        maxWidth: '1200px', 
        margin: '0 auto'
      }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link 
            href="/" 
            style={{ 
              color: '#262626', 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              textDecoration: 'none',
              letterSpacing: '-0.02em'
            }}
          >
            Kanta
          </Link>
          
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <Link 
              href="/events" 
              style={{ 
                color: '#262626', 
                padding: '0.5rem 1rem', 
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Events
            </Link>
            <Link 
              href="/gallery/upload"
              style={{ 
                color: '#262626', 
                padding: '0.5rem 1rem', 
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Upload
            </Link>
            <Link 
              href="/gallery" 
              style={{ 
                color: '#262626', 
                padding: '0.5rem 1rem', 
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Gallery
            </Link>
            <Link 
              href="/people" 
              style={{ 
                color: '#262626', 
                padding: '0.5rem 1rem', 
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              People
            </Link>
          </nav>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {error && (
            <span style={{ 
              color: '#ed4956', 
              fontSize: '0.875rem', 
              background: '#fef2f2', 
              padding: '0.5rem 0.75rem', 
              borderRadius: '6px',
              border: '1px solid #fecaca'
            }}>
              {error}
            </span>
          )}
          
          {loading ? (
            <span style={{ color: '#8e8e8e', fontSize: '0.875rem' }}>Loading events...</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <label style={{ 
                color: '#8e8e8e', 
                fontSize: '0.75rem', 
                marginBottom: '0.25rem'
              }}>
                Selected Event:
              </label>
              <select 
                value={selected} 
                onChange={(e) => setSelected(e.target.value)}
                style={{ 
                  padding: '0.5rem', 
                  borderRadius: '6px', 
                  border: '1px solid #dbdbdb', 
                  background: '#ffffff',
                  minWidth: '12rem',
                  fontSize: '0.875rem', 
                  fontWeight: '500',
                  color: '#262626'
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
