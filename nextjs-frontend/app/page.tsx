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
      padding: '2rem', 
      minHeight: 'calc(100vh - 80px)',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Card variant="elevated" padding="lg" style={{ maxWidth: '800px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ 
            fontSize: '3.5rem', 
            marginBottom: '1rem', 
            color: '#2c3e50',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            Welcome to Kanta
          </h1>
          <p style={{ 
            fontSize: '1.5rem', 
            color: '#666', 
            marginBottom: '0',
            lineHeight: '1.6'
          }}>
            Your AI-powered collaborative photo sharing platform
          </p>
        </div>
        
        {/* 2x2 Grid Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem',
          marginTop: '2rem'
        }}>
          {navigationItems.map((item) => (
            <Link 
              key={item.number}
              href={item.href} 
              style={{ textDecoration: 'none' }}
            >
              <Card
                hoverable
                style={{
                  background: item.gradient,
                  color: '#fff',
                  height: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ 
                  position: 'absolute', 
                  top: '1rem', 
                  left: '1rem', 
                  background: 'rgba(255,255,255,0.25)', 
                  borderRadius: '50%',
                  width: '2.5rem',
                  height: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 'bold'
                }}>
                  {item.number}
                </div>
                
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                  {item.icon}
                </div>
                
                <h3 style={{ 
                  margin: '0 0 0.5rem 0', 
                  fontSize: '1.5rem',
                  fontWeight: 'bold'
                }}>
                  {item.title}
                </h3>
                
                <p style={{ 
                  margin: 0, 
                  opacity: 0.9, 
                  fontSize: '1rem',
                  fontWeight: '500'
                }}>
                  {item.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
        
        <div style={{ 
          textAlign: 'center', 
          marginTop: '3rem', 
          padding: '2rem',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderRadius: '12px'
        }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '1rem' }}>
            🚀 Getting Started
          </h3>
          <p style={{ color: '#666', fontSize: '1.1rem', lineHeight: '1.6', margin: 0 }}>
            Select an event from the header dropdown, then start uploading photos or browse existing galleries. 
            Our AI will automatically detect and group faces to help you find photos of specific people.
          </p>
        </div>
      </Card>
    </div>
  );
}
