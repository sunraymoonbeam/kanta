'use client';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1000px', 
      margin: '0 auto',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh'
    }}>
      <div style={{ 
        background: '#fff', 
        borderRadius: '12px', 
        padding: '3rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '3rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '1rem'
        }}>
          📸 Kanta
        </h1>
        
        <h2 style={{ 
          color: '#2c3e50',
          fontSize: '1.8rem',
          marginBottom: '2rem',
          fontWeight: 'normal'
        }}>
          Collaborative Event Photos
        </h2>
        
        <p style={{ 
          fontSize: '1.2rem',
          color: '#666',
          marginBottom: '3rem',
          lineHeight: '1.6'
        }}>
          Transform your event into a live, shared photo album where everyone can contribute and explore memories together.
        </p>

        {/* Feature Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          <Link href='/events' style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              padding: '2rem',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎭</div>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem' }}>Create Events</h3>
              <p style={{ margin: 0, opacity: 0.9 }}>
                Set up your event and generate QR codes for easy sharing
              </p>
            </div>
          </Link>

          <Link href='/camera' style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)',
              color: '#fff',
              padding: '2rem',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📸</div>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem' }}>Capture Moments</h3>
              <p style={{ margin: 0, opacity: 0.9 }}>
                Take photos with your camera or upload existing ones with filters
              </p>
            </div>
          </Link>

          <Link href='/gallery' style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
              color: '#fff',
              padding: '2rem',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖼️</div>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem' }}>Explore Gallery</h3>
              <p style={{ margin: 0, opacity: 0.9 }}>
                Browse all event photos in a beautiful grid or list view
              </p>
            </div>
          </Link>

          <Link href='/people' style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
              color: '#333',
              padding: '2rem',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem' }}>Find People</h3>
              <p style={{ margin: 0, opacity: 0.8 }}>
                AI-powered face recognition to group photos by people
              </p>
            </div>
          </Link>
        </div>

        {/* How it Works */}
        <div style={{ marginTop: '3rem' }}>
          <h3 style={{ 
            fontSize: '1.8rem',
            color: '#2c3e50',
            marginBottom: '2rem'
          }}>
            How it Works
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1.5rem',
            textAlign: 'left'
          }}>
            <div style={{ 
              padding: '1.5rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '2px solid #eee'
            }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}>
                1
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>Create Event</h4>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                Set up your event with details and generate a shareable QR code
              </p>
            </div>

            <div style={{ 
              padding: '1.5rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '2px solid #eee'
            }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)',
                color: '#fff',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}>
                2
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>Share & Upload</h4>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                Guests scan QR code and upload photos directly to the event
              </p>
            </div>

            <div style={{ 
              padding: '1.5rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '2px solid #eee'
            }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
                color: '#fff',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}>
                3
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>Explore Together</h4>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                Browse the live gallery and find photos of specific people
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div style={{ marginTop: '3rem' }}>
          <Link href='/events'>
            <button style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '8px',
              fontSize: '1.2rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            }}>
              🚀 Get Started - Create Your First Event
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
