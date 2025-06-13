import React from 'react';
import { Event } from '../../../types/events';
import Card from '../../ui/Card';
import Button from '../../ui/Button';

interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: (event: Event) => void;
  onUploadImage?: (event: Event) => void;
}

export default function EventCard({ 
  event, 
  onEdit, 
  onDelete, 
  onUploadImage 
}: EventCardProps) {

  return (
    <Card variant="elevated" hoverable>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem' 
      }}>
        {/* Event Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start' 
        }}>
          <div>
            <h3 style={{ 
              margin: 0, 
              fontSize: '1.25rem', 
              color: '#1a1a1a',
              fontWeight: 'bold'
            }}>
              {event.name}
            </h3>
            <p style={{ 
              margin: '0.25rem 0 0 0', 
              color: '#666',
              fontSize: '0.9rem'
            }}>
              {event.description || 'No description available'}
            </p>
          </div>
          {event.event_image_url && (
            <img 
              src={event.event_image_url} 
              alt={event.name}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '8px',
                objectFit: 'cover',
                border: '2px solid #f0f0f0'
              }}
            />
          )}
        </div>

        {/* Event Code */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '1rem',
          borderRadius: '8px',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Event Code</div>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            letterSpacing: '0.1em',
            fontFamily: 'monospace'
          }}>
            {event.code}
          </div>
        </div>

        {/* QR Code Section */}
        {event.qr_code_image_url ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            padding: '1rem',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <img 
              src={event.qr_code_image_url} 
              alt={`QR Code for ${event.name}`}
              style={{
                width: '120px',
                height: '120px',
                border: '2px solid white',
                borderRadius: '4px'
              }}
            />
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            padding: '1rem',
            background: '#f8f9fa',
            borderRadius: '8px',
            color: '#666',
            fontSize: '0.9rem'
          }}>
            QR code generating...
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem',
          marginTop: '0.5rem'
        }}>
          {onEdit && (
            <Button 
              onClick={() => onEdit(event)}
              variant="primary" 
              size="sm"
              style={{ flex: 1 }}
            >
              Edit
            </Button>
          )}
          {onUploadImage && (
            <Button 
              onClick={() => onUploadImage(event)}
              variant="secondary" 
              size="sm"
              style={{ flex: 1 }}
            >
              📷 Image
            </Button>
          )}
          {onDelete && (
            <Button 
              onClick={() => onDelete(event)}
              variant="danger" 
              size="sm"
              style={{ flex: 1 }}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
