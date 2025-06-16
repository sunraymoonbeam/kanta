'use client';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ 
      padding: '2rem', 
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.95)', 
        padding: '3rem', 
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h1 style={{ 
          fontSize: '3rem', 
          marginBottom: '1rem', 
          color: '#2c3e50',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Welcome to Kanta
        </h1>
        <p style={{ 
          fontSize: '1.5rem', 
          color: '#666', 
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          Your AI-powered photo sharing platform
        </p>
        
        {/* 2x2 Grid Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gridTemplateRows: '1fr 1fr',
          gap: '1.5rem',
          marginTop: '2rem',
          minHeight: '300px'
        }}>
          <Link 
            href="/events" 
            style={{ 
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              padding: '2rem',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              transition: 'transform 0.3s ease',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
              position: 'relative'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ 
              position: 'absolute', 
              top: '1rem', 
              left: '1rem', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '50%',
              width: '2rem',
              height: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}>1</div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>📅</h3>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>Create Events</h4>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>Manage photo events</p>
          </Link>
          
          <Link 
            href="/camera" 
            style={{ 
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: '#fff',
              padding: '2rem',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              transition: 'transform 0.3s ease',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
              position: 'relative'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ 
              position: 'absolute', 
              top: '1rem', 
              left: '1rem', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '50%',
              width: '2rem',
              height: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}>2</div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>📸</h3>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>Capture Moments</h4>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>Upload photos</p>
          </Link>
          
          <Link 
            href="/gallery" 
            style={{ 
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: '#fff',
              padding: '2rem',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              transition: 'transform 0.3s ease',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
              position: 'relative'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ 
              position: 'absolute', 
              top: '1rem', 
              left: '1rem', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '50%',
              width: '2rem',
              height: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}>3</div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>🖼️</h3>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>Explore Gallery</h4>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>Browse photos</p>
          </Link>
          
          <Link 
            href="/people" 
            style={{ 
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              color: '#fff',
              padding: '2rem',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              transition: 'transform 0.3s ease',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
              position: 'relative'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ 
              position: 'absolute', 
              top: '1rem', 
              left: '1rem', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '50%',
              width: '2rem',
              height: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}>4</div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>👥</h3>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>Browse People</h4>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>AI face recognition</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
