'use client';
import Link from 'next/link';

const steps = [
  {
    number: 1,
    title: 'Create Event & QR Code',
    description: 'Set up your event and generate a custom QR code guests can scan to join instantly.',
    image: 'https://cdn.prod.website-files.com/673d196dcbdffd5878aa34c3/67450441a62191954ce549e9_4-creative-qr-code-ideas-to-enhance-your-wedding-experience-wf.webp',
    caption: 'Generate and share your QR code',
    href: '/events',
    icon: '🎭',
    linkText: 'Manage Events',
    color: '#8b5cf6'
  },
  {
    number: 2,
    title: 'Snap or Upload Photos',
    description: 'Scan the event QR code to open Kanta, then capture or upload photos directly from any device.',
    image: 'https://images.airtasker.com/v7/https://airtasker-seo-assets-prod.s3.amazonaws.com/en_AU/1715328328533-event-photographers-hero.jpg',
    caption: 'Capture moments live',
    href: '/gallery/upload',
    icon: '📸',
    linkText: 'Snap & Upload Photos',
    color: '#3b82f6'
  },
  {
    number: 3,
    title: 'Explore Your Gallery',
    description: 'Browse all event photos in one place, filter by date or person, and mark your favorites.',
    image: 'https://photos.smugmug.com/BLOG/Blog-images/i-4DzMFWZ/0/NCg78ZfVGwLThZt3BVVJkBNq7VgL2LmzdVTHmXfnd/XL/%40RobHammPhoto%20%236%28c%292017RobertHamm-XL.jpg',
    caption: 'All your photos in one album',
    href: '/gallery',
    icon: '🖼️',
    linkText: 'View Gallery',
    color: '#ef4444'
  },
  {
    number: 4,
    title: 'Find People Instantly',
    description: 'Discover auto-detected faces, see every photo of a guest, and relive shared moments.',
    image: 'https://production-rhino-website-crm.s3.ap-southeast-1.amazonaws.com/Face_Recognition_17a30dc38b.png',
    caption: 'Smart face grouping',
    href: '/people',
    icon: '👥',
    linkText: 'Discover People',
    color: '#f59e0b'
  }
];

export default function HomePage() {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      padding: '0'
    }}>
      {/* Hero Section */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        padding: '4rem 2rem'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ 
            fontSize: '4rem', 
            marginBottom: '1rem', 
            color: '#1e293b',
            fontWeight: '900',
            letterSpacing: '-0.05em',
            lineHeight: '1.1'
          }}>
            Kanta | Collaborative Event Photos
          </h1>
          <p style={{ 
            fontSize: '1.5rem', 
            color: '#64748b', 
            marginBottom: '1rem',
            fontStyle: 'italic',
            fontWeight: '500'
          }}>
            Transform your event into a live, shared photo album.
          </p>
          <p style={{ 
            fontSize: '1.125rem', 
            color: '#475569', 
            maxWidth: '800px',
            margin: '0 auto',
            lineHeight: '1.7'
          }}>
            Kanta lets event participants capture, share, and organize photos in a shared 
            digital camera roll, automatically grouping moments by person.
          </p>
        </div>
        
        <div style={{
          width: '100%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)',
          marginBottom: '4rem'
        }} />

        {/* How It Works Section */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            color: '#1e293b',
            textAlign: 'center',
            marginBottom: '3rem'
          }}>
            How It Works
          </h2>

          {/* Steps */}
          {steps.map((step, index) => (
            <div key={step.number}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'minmax(300px, 2fr) minmax(300px, 3fr)',
                gap: '3rem',
                alignItems: 'center',
                marginBottom: '3rem',
                padding: '2rem',
                background: '#ffffff',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                border: '1px solid #f1f5f9'
              }}>
                {/* Image */}
                <div style={{ 
                  order: index % 2 === 0 ? 1 : 2,
                  position: 'relative'
                }}>
                  <img 
                    src={step.image}
                    alt={step.caption}
                    style={{ 
                      width: '100%', 
                      maxWidth: '350px',
                      height: '250px',
                      objectFit: 'cover',
                      borderRadius: '16px',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                      transition: 'transform 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: '#64748b', 
                    textAlign: 'center',
                    marginTop: '1rem',
                    fontStyle: 'italic'
                  }}>
                    {step.caption}
                  </p>
                </div>

                {/* Content */}
                <div style={{ 
                  order: index % 2 === 0 ? 2 : 1
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      width: '3rem',
                      height: '3rem',
                      borderRadius: '50%',
                      background: step.color,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: 'bold'
                    }}>
                      {step.number}
                    </div>
                    <h3 style={{ 
                      fontSize: '2rem', 
                      fontWeight: 'bold', 
                      color: '#1e293b',
                      margin: 0
                    }}>
                      {step.title}
                    </h3>
                  </div>
                  
                  <div style={{
                    width: '4rem',
                    height: '4px',
                    background: step.color,
                    borderRadius: '2px',
                    marginBottom: '1.5rem'
                  }} />
                  
                  <p style={{ 
                    fontSize: '1.125rem', 
                    color: '#475569', 
                    lineHeight: '1.7',
                    marginBottom: '2rem'
                  }}>
                    {step.description}
                  </p>
                  
                  <Link 
                    href={step.href}
                    style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '1rem 2rem',
                      background: step.color,
                      color: '#ffffff',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '1rem',
                      transition: 'all 0.3s ease',
                      boxShadow: `0 4px 20px ${step.color}40`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 8px 30px ${step.color}60`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = `0 4px 20px ${step.color}40`;
                    }}
                  >
                    <span>{step.icon}</span>
                    {step.linkText} →
                  </Link>
                </div>
              </div>

              {/* Divider */}
              {index < steps.length - 1 && (
                <div style={{
                  width: '100%',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)',
                  marginBottom: '3rem'
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '4rem',
          padding: '3rem 2rem',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: '20px',
          color: '#ffffff'
        }}>
          <p style={{ 
            fontSize: '1.25rem', 
            margin: 0,
            fontStyle: 'italic',
            opacity: 0.9
          }}>
            Kanta: Creating memories together, one picture at a time.
          </p>
        </div>
      </div>
    </div>
  );
}
