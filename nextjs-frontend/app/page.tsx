'use client';
import Link from 'next/link';
import Card from '../components/ui/Card';

const navigationItems = [
  {
    title: 'Create Events',
    description: 'Manage photo events',
    href: '/events',
    icon: '📅',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    number: 1,
  },
  {
    title: 'Upload Photos',
    description: 'Capture & upload moments',
    href: '/gallery/upload',
    icon: '📸',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    number: 2,
  },
  {
    title: 'Browse Gallery',
    description: 'Explore photos',
    href: '/gallery',
    icon: '🖼️',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    number: 3,
  },
  {
    title: 'Find People',
    description: 'AI face recognition',
    href: '/people',
    icon: '👥',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    number: 4,
  },
];

export default function HomePage() {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{ 
        maxWidth: '900px', 
        width: '100%',
        background: '#ffffff',
        borderRadius: '0',
        border: 'none',
        boxShadow: 'none'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ 
            fontSize: '4rem', 
            marginBottom: '1.5rem', 
            color: '#262626',
            fontWeight: 'bold',
            letterSpacing: '-0.02em'
          }}>
            Kanta
          </h1>
          <p style={{ 
            fontSize: '1.25rem', 
            color: '#8e8e8e', 
            marginBottom: '0',
            lineHeight: '1.5',
            fontWeight: '400'
          }}>
            AI-powered collaborative photo sharing
          </p>
        </div>        
        {/* 2x2 Grid Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '1.5rem',
          marginTop: '2rem'
        }}>
          {navigationItems.map((item) => (
            <Link 
              key={item.number}
              href={item.href} 
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #dbdbdb',
                  borderRadius: '12px',
                  height: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{
                  position: 'absolute', 
                  top: '1rem', 
                  left: '1rem', 
                  background: '#262626', 
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: '2rem',
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}>
                  {item.number}
                </div>
                
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                  {item.icon}
                </div>
                
                <h3 style={{ 
                  margin: '0 0 0.5rem 0', 
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: '#262626'
                }}>
                  {item.title}
                </h3>
                
                <p style={{ 
                  margin: 0, 
                  color: '#8e8e8e', 
                  fontSize: '0.875rem',
                  fontWeight: '400'
                }}>
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
        
        <div style={{ 
          textAlign: 'center', 
          marginTop: '4rem', 
          padding: '2rem',
          background: '#fafafa',
          borderRadius: '12px',
          border: '1px solid #dbdbdb'
        }}>
          <h3 style={{ color: '#262626', marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 'bold' }}>
            🚀 Getting Started
          </h3>
          <p style={{ color: '#8e8e8e', fontSize: '0.875rem', lineHeight: '1.6', margin: 0 }}>
            Select an event from the header dropdown, then start uploading photos or browse existing galleries. 
            Our AI will automatically detect and group faces to help you find photos of specific people.
          </p>
        </div>
      </div>
    </div>
  );
}
